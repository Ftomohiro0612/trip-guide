#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const AUDIT_PATH = resolve(ROOT, "docs/audits/facility-image-coverage-rights-safe-wave4-2026-08-28.json");
const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const RETRY_ERRORS = process.argv.includes("--retry-errors");
const LIMIT = Number(process.argv.find((value) => value.startsWith("--limit="))?.split("=")[1] ?? 0);
const BASELINE_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const CHECKED_AT = "2026-08-28";
const USER_AGENT = "MemoripRightsSafeImageAudit/4.0 (mail@memorips.com)";
const RATE_LIMIT_MS = 180;
const ACCEPTED_LICENSE = /^(?:CC0(?: 1\.0)?|CC BY(?:-SA)?(?: [1-9]\.\d)?|Public domain|パブリック・ドメイン)$/iu;
const IMAGE_FIELDS = new Set(["image", "image_attribution", "image_source"]);
const REJECTED_CONTENT = /(?:\blogo\b|ロゴ|emblem|紋章|\bicon\b|アイコン|\bmap\b|地図|location.?map|prefectural.?map|\bflag\b|旗|\bseal\b|\bsign(?:age)?\b|看板|案内板|標識|poster|ポスター|チラシ|flyer|pamphlet|パンフレット|mascot|マスコット|character|キャラクター|portrait|肖像|badge|バッジ|ticket|チケット|food|料理|商品|souvenir|土産)/iu;
const REPRESENTATIVE_CONTENT = /(?:外観|全景|遠景|建物|正面|園内|館内|場内|施設内|展示室|展示館|メインホール|主要空間|広場|遊具|アスレチック|ゲレンデ|スキー場|キャンプ場|庭園|公園|動物園|水族館|博物館|美術館|科学館|資料館|記念館|展望|山頂|滝|湖|海岸|渓谷|景観|風景|入口|エントランス|exterior|building|overview|panorama|grounds|interior|hall|gallery|playground|\b(?:park|garden|museum|zoo|aquarium)\b|observatory|ski area|campground|waterfall|lake|landscape|scenery|entrance)/iu;

let lastRequestAt = 0;

const document = JSON.parse(await readFile(DATA_PATH, "utf8"));
const baselineImageCount = document.facilities.filter(hasImage).length;
const targets = document.facilities.filter((facility) => !hasImage(facility));
const hashes = await indexExistingImages(document.facilities);
const priorSourceHashes = await indexPriorSourceHashes();
const audit = await loadAudit(hashes.preexistingDuplicateGroups);

if (RETRY_ERRORS) {
  audit.results = audit.results.filter((result) => result.disposition !== "error");
  audit.status = "running";
  audit.completed_at = null;
}

const completedIds = new Set(audit.results.map((result) => result.facility_id));
for (const result of audit.results) {
  if (result.accepted?.source_image_sha1) priorSourceHashes.sha1.set(result.accepted.source_image_sha1, result.facility_id);
  if (result.accepted?.source_image_sha256) priorSourceHashes.sha256.set(result.accepted.source_image_sha256, result.facility_id);
}

let processedThisRun = 0;
for (let index = 0; index < targets.length; index += 1) {
  const facility = targets[index];
  if (completedIds.has(facility.id)) continue;
  if (LIMIT > 0 && processedThisRun >= LIMIT) break;
  processedThisRun += 1;
  let result;
  try {
    result = await evaluateFacility(facility, hashes, priorSourceHashes);
  } catch (error) {
    result = baseResult(facility, "error", { reason: error instanceof Error ? error.message : String(error) });
  }
  audit.results.push(result);
  completedIds.add(facility.id);
  console.log(`[${index + 1}/${targets.length}] ${result.disposition.padEnd(42)} ${facility.slug} ${facility.name}`);
  if (processedThisRun % 10 === 0) await saveCheckpoint();
}

await saveCheckpoint();
const allDone = targets.every((facility) => completedIds.has(facility.id))
  && !audit.results.some((result) => result.disposition === "error");
if (allDone) {
  audit.status = "completed";
  audit.completed_at = new Date().toISOString();
  await saveCheckpoint();
}
console.log(JSON.stringify(audit.coverage, null, 2));
if (!allDone && LIMIT === 0) process.exitCode = 1;

async function evaluateFacility(facility, imageHashes, sourceHashes) {
  const searches = [];
  const candidates = new Map();
  const queries = buildQueries(facility);
  for (const query of queries) {
    const found = await searchCommons(query.query);
    searches.push({ route: query.route, query: query.query, result_count: found.length, result_titles: found.map((candidate) => candidate.title) });
    for (const candidate of found) candidates.set(candidate.pageid, { ...candidate, discovery_route: query.route });
    if (found.some((candidate) => identityNameMatch(facility, candidate).ok)) break;
  }
  const allCandidates = [...candidates.values()];
  if (allCandidates.length === 0) {
    return baseResult(facility, "no_candidate", {
      candidate_found: false,
      rights_pass: false,
      strict_identity_match: false,
      relevance_pass: false,
      searches,
      reason: "Wikimedia Commons direct file search returned no candidate.",
    });
  }

  const evaluated = allCandidates.map((candidate) => evaluateMetadata(facility, candidate));
  applySiblingLocationProof(facility, evaluated);
  const rightsPassed = evaluated.filter((entry) => entry.rights.ok);
  if (rightsPassed.length === 0) {
    return rejectedResult(facility, "rejected_rights_unverifiable", searches, evaluated, {
      rights_pass: false,
      reason: "No candidate had a machine-verifiable commercial-use-compatible license, source page, original URL, author, and terms URL.",
    });
  }
  const identityPassed = rightsPassed.filter((entry) => entry.identity.ok);
  if (identityPassed.length === 0) {
    return rejectedResult(facility, "rejected_identity_or_location_mismatch", searches, evaluated, {
      rights_pass: true,
      strict_identity_match: false,
      reason: "No rights-safe candidate matched both the canonical facility identity and its coordinates or prefecture/municipality context.",
    });
  }
  const qualityPassed = identityPassed.filter((entry) => entry.quality.ok);
  if (qualityPassed.length === 0) {
    return rejectedResult(facility, "rejected_image_quality", searches, evaluated, {
      rights_pass: true,
      strict_identity_match: true,
      reason: "All exact-identity candidates failed raster, file-size, or resolution minimums.",
    });
  }
  const relevant = qualityPassed.filter((entry) => entry.relevance.ok).sort((left, right) => right.score - left.score);
  if (relevant.length === 0) {
    return rejectedResult(facility, "rejected_image_relevance", searches, evaluated, {
      rights_pass: true,
      strict_identity_match: true,
      relevance_pass: false,
      reason: "Candidates depicted logos, maps, signs, posters, people/objects/products, or lacked evidence of a representative facility view.",
    });
  }

  const duplicateRejections = [];
  for (const entry of relevant) {
    const candidate = entry.candidate;
    const info = candidate.imageinfo[0];
    const priorSha1FacilityId = sourceHashes.sha1.get(info.sha1);
    if (priorSha1FacilityId) {
      duplicateRejections.push({ title: candidate.title, kind: "source_sha1", duplicate_facility_id: priorSha1FacilityId });
      continue;
    }
    const source = await download(info.url);
    const sourceSha256 = sha256(source);
    const priorSha256FacilityId = sourceHashes.sha256.get(sourceSha256);
    if (priorSha256FacilityId) {
      duplicateRejections.push({ title: candidate.title, kind: "source_sha256", duplicate_facility_id: priorSha256FacilityId });
      continue;
    }
    const output = await sharp(source, { failOn: "error", animated: false })
      .rotate()
      .resize(1200, 800, { fit: "cover", position: "attention" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    const outputSha256 = sha256(output);
    const visualFingerprint = await fingerprint(output);
    const exactDuplicate = imageHashes.exact.get(outputSha256);
    const visualDuplicate = imageHashes.visual.get(visualFingerprint);
    if (exactDuplicate || visualDuplicate) {
      duplicateRejections.push({
        title: candidate.title,
        kind: exactDuplicate ? "output_sha256" : "visual_fingerprint_sha256",
        duplicate_facility_id: exactDuplicate ?? visualDuplicate,
      });
      continue;
    }

    const outputPublicPath = `/images/facilities/${facility.slug}.webp`;
    if (APPLY) {
      const outputPath = resolve(ROOT, "public", outputPublicPath.slice(1));
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output);
      facility.image = outputPublicPath;
      facility.image_attribution = buildAttribution(candidate, entry.rights);
      facility.image_source = "manual";
    }
    imageHashes.exact.set(outputSha256, facility.id);
    imageHashes.visual.set(visualFingerprint, facility.id);
    sourceHashes.sha1.set(info.sha1, facility.id);
    sourceHashes.sha256.set(sourceSha256, facility.id);
    return baseResult(facility, APPLY ? "accepted" : "would_accept", {
      candidate_found: true,
      rights_pass: true,
      strict_identity_match: true,
      relevance_pass: true,
      searches,
      accepted: {
        source_type: "explicit_reuse_license",
        source_platform: "Wikimedia Commons",
        discovery_route: candidate.discovery_route,
        source_url: candidate.fullurl,
        image_original_url: info.url,
        source_owner: entry.rights.author,
        author: entry.rights.author,
        license: entry.rights.license,
        commercial_use_allowed: true,
        attribution_requirement: entry.rights.attributionRequired,
        modification_allowed: true,
        share_alike_required: entry.rights.shareAlike,
        terms_url: entry.rights.termsUrl,
        usage_terms: entry.rights.usageTerms,
        checked_at: CHECKED_AT,
        identity_basis: entry.identity.basis,
        identity_location_distance_km: entry.identity.distanceKm,
        identity_location_evidence: entry.identity.locationEvidence,
        relevance_basis: entry.relevance.basis,
        source_file_title: candidate.title,
        source_mime: info.mime,
        source_bytes: source.length,
        source_width: info.width,
        source_height: info.height,
        source_image_sha1: info.sha1,
        source_image_sha256: sourceSha256,
        output_path: outputPublicPath,
        output_sha256: outputSha256,
        visual_fingerprint_sha256: visualFingerprint,
        output_width: 1200,
        output_height: 800,
        output_format: "webp",
      },
    });
  }

  return rejectedResult(facility, "rejected_duplicate_image", searches, evaluated, {
    rights_pass: true,
    strict_identity_match: true,
    relevance_pass: true,
    duplicate_rejections: duplicateRejections,
    reason: "Every otherwise-adoptable candidate duplicated an existing source, normalized output, or visual fingerprint.",
  });
}

function evaluateMetadata(facility, candidate) {
  const info = candidate.imageinfo?.[0] ?? {};
  const metadata = cleanMetadata(info.extmetadata ?? {});
  const rights = rightsGate(info, metadata);
  const identity = identityGate(facility, candidate, metadata);
  const quality = qualityGate(info);
  const relevance = relevanceGate(facility, candidate, metadata, identity);
  return { candidate, rights, identity, quality, relevance, score: relevance.score + identity.score + quality.score };
}

function applySiblingLocationProof(facility, evaluated) {
  if (typeof facility.latitude !== "number" || typeof facility.longitude !== "number") return;
  const anchors = evaluated.filter((entry) => {
    const coordinate = entry.candidate.coordinates?.[0]
      ?? coordinateFromMetadata(cleanMetadata(entry.candidate.imageinfo?.[0]?.extmetadata ?? {}))
      ?? coordinateFromCommonMetadata(entry.candidate.imageinfo?.[0]?.commonmetadata ?? []);
    return coordinate
      && identityNameMatch(facility, entry.candidate).ok
      && haversine(facility.latitude, facility.longitude, coordinate.lat, coordinate.lon) <= 2;
  });
  if (anchors.length === 0) return;
  const anchorCategories = new Set(anchors.flatMap((entry) => meaningfulCategories(entry.candidate)));
  const strongAliases = facilityAliases(facility.name).filter((alias) => alias.length >= 5);
  for (const entry of evaluated) {
    if (entry.identity.ok) continue;
    const title = normalize(stripFilePrefix(entry.candidate.title ?? ""));
    if (!strongAliases.some((alias) => title.includes(alias))) continue;
    const sharedCategory = meaningfulCategories(entry.candidate).find((category) => anchorCategories.has(category));
    if (!sharedCategory) continue;
    const name = identityNameMatch(facility, entry.candidate);
    entry.identity = {
      ok: true,
      basis: `${name.basis} + shared_commons_facility_category_with_sibling_geotag`,
      distanceKm: null,
      locationEvidence: `shared_category:${sharedCategory}`,
      score: 95,
    };
    entry.relevance = relevanceGate(facility, entry.candidate, cleanMetadata(entry.candidate.imageinfo?.[0]?.extmetadata ?? {}), entry.identity);
    entry.score = entry.relevance.score + entry.identity.score + entry.quality.score;
  }
}

function meaningfulCategories(candidate) {
  return (candidate.categories ?? [])
    .map((category) => normalize(String(category.title ?? "").replace(/^Category:/iu, "")))
    .filter((category) => category.length >= 4 && !/(?:creativecommons|ccby|cczero|selfpublished|uploaded|photographstaken|fileswith)/iu.test(category));
}

function rightsGate(info, metadata) {
  const license = metadata.LicenseShortName ?? "";
  const author = metadata.Artist ?? "";
  const termsUrl = normalizeTermsUrl(metadata.LicenseUrl, license);
  const ok = Boolean(author && license && ACCEPTED_LICENSE.test(license) && termsUrl && info.descriptionurl && info.url);
  return {
    ok,
    author,
    license,
    termsUrl,
    usageTerms: metadata.UsageTerms || null,
    attributionRequired: /^true$/iu.test(metadata.AttributionRequired ?? "") || /^CC BY/iu.test(license),
    shareAlike: /^CC BY-SA/iu.test(license),
  };
}

function identityGate(facility, candidate, metadata) {
  const name = identityNameMatch(facility, candidate, metadata);
  if (!name.ok) return { ok: false, basis: "name_mismatch", distanceKm: null, locationEvidence: null, score: 0 };
  const coordinate = candidate.coordinates?.[0]
    ?? coordinateFromMetadata(metadata)
    ?? coordinateFromCommonMetadata(candidate.imageinfo?.[0]?.commonmetadata ?? []);
  if (coordinate && typeof facility.latitude === "number" && typeof facility.longitude === "number") {
    const distance = haversine(facility.latitude, facility.longitude, coordinate.lat, coordinate.lon);
    return {
      ok: distance <= 2,
      basis: `${name.basis} + commons_file_coordinates_within_2km`,
      distanceKm: Number(distance.toFixed(3)),
      locationEvidence: `${coordinate.lat},${coordinate.lon}`,
      score: distance <= 2 ? 120 - Math.min(distance * 10, 20) : 0,
    };
  }
  const sourceText = sourceContext(candidate, metadata);
  const municipality = extractMunicipality(facility.address ?? "");
  const prefectureMatch = sourceText.includes(normalize(facility.prefecture));
  const municipalityMatch = Boolean(municipality && sourceText.includes(normalize(municipality)));
  return {
    ok: prefectureMatch && municipalityMatch,
    basis: `${name.basis} + commons_source_prefecture_and_municipality`,
    distanceKm: null,
    locationEvidence: prefectureMatch && municipalityMatch ? `${facility.prefecture}/${municipality}` : null,
    score: prefectureMatch && municipalityMatch ? 80 : 0,
  };
}

function identityNameMatch(facility, candidate, metadata = cleanMetadata(candidate.imageinfo?.[0]?.extmetadata ?? {})) {
  const aliases = facilityAliases(facility.name);
  const title = normalize(stripFilePrefix(candidate.title ?? ""));
  const context = normalize(sourceContext(candidate, metadata));
  const titleAlias = aliases.find((alias) => alias.length >= 4 && title.includes(alias));
  if (titleAlias) return { ok: true, basis: titleAlias === aliases[0] ? "canonical_name_in_file_title" : "strict_alias_in_file_title" };
  const contextAlias = aliases.find((alias) => alias.length >= 5 && context.includes(alias));
  return contextAlias
    ? { ok: true, basis: contextAlias === aliases[0] ? "canonical_name_in_commons_source_context" : "strict_alias_in_commons_source_context" }
    : { ok: false, basis: "name_mismatch" };
}

function qualityGate(info) {
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(info.mime)
    && Number(info.size) >= 12_000
    && Number(info.width) >= 600
    && Number(info.height) >= 300;
  return { ok, score: ok ? Math.min(Math.log10(Number(info.width) * Number(info.height)) * 3, 24) : 0 };
}

function relevanceGate(facility, candidate, metadata, identity) {
  const title = stripFilePrefix(candidate.title ?? "");
  const context = [title, metadata.ObjectName, metadata.ImageDescription].filter(Boolean).join(" ");
  if (REJECTED_CONTENT.test(context)) return { ok: false, basis: "rejected_logo_map_sign_poster_person_object_or_product", score: -500 };
  const titleContext = [title, metadata.ObjectName].filter(Boolean).join(" ");
  const aliases = facilityAliases(facility.name);
  const normalizedTitle = normalize(title.replace(/\s*\d+\s*$/u, ""));
  const titleEssentiallyExact = aliases.some((alias) => alias.length >= 4 && (normalizedTitle === alias || normalizedTitle.startsWith(alias)));
  const representative = REPRESENTATIVE_CONTENT.test(titleContext);
  const mainViewPreferred = /(?:外観|全景|遠景|建物|正面|園内|館内|場内|施設内|広場|exterior|building|overview|panorama|grounds|interior)/iu.test(titleContext);
  const landscapeEnough = Number(candidate.imageinfo?.[0]?.width) >= Number(candidate.imageinfo?.[0]?.height) * 0.9;
  const ok = identity.ok && (representative || (titleEssentiallyExact && landscapeEnough));
  return {
    ok,
    basis: mainViewPreferred ? "preferred_exterior_or_major-space_view" : representative ? "representative_facility_view_metadata" : titleEssentiallyExact && landscapeEnough ? "facility-titled_landscape_image" : "insufficient_main-image_relevance",
    score: ok ? (mainViewPreferred ? 180 : representative ? 90 : 55) + (titleEssentiallyExact ? 40 : 0) : 0,
  };
}

async function searchCommons(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  setParams(url, {
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `\"${query}\"`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo|categories|coordinates|info",
    iiprop: "url|size|sha1|mime|extmetadata|commonmetadata",
    iiextmetadatalanguage: "ja",
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired|UsageTerms|ImageDescription|ObjectName|GPSLatitude|GPSLongitude|Categories",
    cllimit: "max",
    inprop: "url",
    origin: "*",
  });
  const data = await fetchJson(url);
  return Object.values(data.query?.pages ?? {}).sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
}

async function fetchJson(url) {
  await rateLimit();
  let response;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status)) break;
    await delay(attempt * 1_000);
  }
  throw new Error(`Commons API request failed: HTTP ${response?.status ?? "network"}`);
}

async function download(url) {
  await rateLimit();
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function rateLimit() {
  const remaining = RATE_LIMIT_MS - (Date.now() - lastRequestAt);
  if (remaining > 0) await delay(remaining);
  lastRequestAt = Date.now();
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function buildQueries(facility) {
  const shortened = stripParentheticals(facility.name).trim();
  const queries = [{ route: "commons_exact_canonical_name", query: facility.name }];
  if (normalize(shortened) !== normalize(facility.name) && normalize(shortened).length >= 4) {
    queries.push({ route: "commons_strict_alias", query: shortened });
  }
  return queries;
}

function facilityAliases(name) {
  const normalized = normalize(name);
  const shortened = normalize(stripParentheticals(name));
  const latinTokens = String(name).normalize("NFKC").match(/[A-Za-z][A-Za-z0-9]{3,}/gu) ?? [];
  const aliases = [normalized, shortened, ...latinTokens.map(normalize).filter((value) => !["park", "museum", "kids", "center", "plaza", "mall"].includes(value))]
    .filter((value) => value.length >= 4);
  return [...new Set(aliases)].sort((left, right) => right.length - left.length);
}

function stripParentheticals(value) {
  const outside = value.replace(/[（(][^()（）]{1,40}[）)]/gu, " ");
  if (!/[A-Za-z]/u.test(outside)) return value;
  return value.replace(/[（(]([^()（）]{1,20})[）)]/gu, (whole, content) => {
    if (!/^[ァ-ヶーぁ-んA-Za-z0-9\s・･]+$/u.test(content)) return whole;
    if (/(?:キッズ|スペース|プール|パーク|ランド|広場|公園|モール|センター|ミュージアム|ホテル|工房|農園|牧場|温泉|スキー)/u.test(content)) return whole;
    return " ";
  }).replace(/\s+/gu, " ").trim();
}

function sourceContext(candidate, metadata) {
  return [
    candidate.title,
    metadata.ObjectName,
    metadata.ImageDescription,
    metadata.Categories,
    ...(candidate.categories ?? []).map((category) => category.title),
  ].filter(Boolean).join(" ");
}

function coordinateFromMetadata(metadata) {
  const lat = Number(metadata.GPSLatitude);
  const lon = Number(metadata.GPSLongitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function coordinateFromCommonMetadata(entries) {
  const map = new Map(entries.map((entry) => [entry.name, entry.value]));
  const lat = Number(map.get("GPSLatitude"));
  const lon = Number(map.get("GPSLongitude"));
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function extractMunicipality(address) {
  const match = String(address).replace(/〒?\d{3}-?\d{4}\s*/gu, "").match(/(?:北海道|東京都|京都府|大阪府|.{2,3}県)?([^\s0-9０-９]+?(?:市|区|町|村))/u);
  return match?.[1] ?? null;
}

function haversine(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(value) {
  return String(value).normalize("NFKC").toLowerCase().replace(/[®™©]/gu, "").replace(/[\s　\-_()（）「」『』【】・･,.、。!！?？&＆'’"“”/／:：]/gu, "");
}

function stripFilePrefix(value) {
  return String(value).replace(/^File:/iu, "").replace(/\.(?:jpe?g|png|webp)$/iu, "");
}

function cleanMetadata(metadata) {
  return Object.fromEntries(Object.entries(metadata).map(([key, entry]) => [key, decodeHtml(stripHtml(String(entry?.value ?? ""))).trim()]));
}

function stripHtml(value) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ");
}

function decodeHtml(value) {
  return value.replace(/&nbsp;|&#160;/gu, " ").replace(/&amp;/gu, "&").replace(/&quot;/gu, "\"").replace(/&#0*39;|&apos;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");
}

function normalizeTermsUrl(value, license) {
  if (value) return String(value).replace(/^http:/u, "https:");
  if (/^(?:Public domain|パブリック・ドメイン)$/iu.test(license)) return "https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain";
  return null;
}

function escapeHtml(value) {
  return String(value).replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
}

function buildAttribution(candidate, rights) {
  const requirement = rights.attributionRequired ? "要表示" : "表示不要";
  return `<a href="${escapeHtml(candidate.fullurl)}" rel="noopener noreferrer" target="_blank">Wikimedia Commons</a> / ${escapeHtml(rights.author)} / <a href="${escapeHtml(rights.termsUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtml(rights.license)}</a>（帰属: ${requirement}）`;
}

function rejectedResult(facility, disposition, searches, evaluated, extra) {
  return baseResult(facility, disposition, {
    candidate_found: true,
    searches,
    candidate_summary: evaluated.slice(0, 12).map(summarizeEvaluation),
    relevance_pass: false,
    ...extra,
  });
}

function summarizeEvaluation(entry) {
  return {
    title: entry.candidate.title,
    source_url: entry.candidate.fullurl,
    image_original_url: entry.candidate.imageinfo?.[0]?.url ?? null,
    rights: entry.rights,
    identity: entry.identity,
    quality: entry.quality,
    relevance: entry.relevance,
  };
}

function baseResult(facility, disposition, extra) {
  return {
    facility_id: facility.id,
    facility_slug: facility.slug,
    facility_name: facility.name,
    prefecture: facility.prefecture,
    canonical_address: facility.address ?? null,
    canonical_coordinates: typeof facility.latitude === "number" && typeof facility.longitude === "number"
      ? { lat: facility.latitude, lon: facility.longitude }
      : null,
    disposition,
    accepted: null,
    ...extra,
  };
}

async function indexExistingImages(facilities) {
  const exact = new Map();
  const visual = new Map();
  const exactGroups = new Map();
  const visualGroups = new Map();
  for (const facility of facilities.filter(hasImage)) {
    const imagePath = resolve(ROOT, "public", String(facility.image).replace(/^\//u, ""));
    if (!existsSync(imagePath)) continue;
    const buffer = await readFile(imagePath);
    const exactHash = sha256(buffer);
    const visualHash = await fingerprint(buffer);
    addHash(exactGroups, exactHash, facility.id);
    addHash(visualGroups, visualHash, facility.id);
    if (!exact.has(exactHash)) exact.set(exactHash, facility.id);
    if (!visual.has(visualHash)) visual.set(visualHash, facility.id);
  }
  return {
    exact,
    visual,
    preexistingDuplicateGroups: [
      ...duplicateGroups(exactGroups).map((group) => ({ kind: "sha256", ...group })),
      ...duplicateGroups(visualGroups).map((group) => ({ kind: "visual_fingerprint_sha256", ...group })),
    ],
  };
}

async function indexPriorSourceHashes() {
  const sha1 = new Map();
  const sha256 = new Map();
  for (const auditFile of [
    "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json",
    "docs/audits/facility-image-coverage-partner-2026-08-27.json",
  ]) {
    const auditPath = resolve(ROOT, auditFile);
    if (!existsSync(auditPath)) continue;
    const priorAudit = JSON.parse(await readFile(auditPath, "utf8"));
    for (const result of priorAudit.results ?? []) {
      if (!result.accepted) continue;
      if (result.accepted.source_image_sha1) sha1.set(result.accepted.source_image_sha1, result.facility_id);
      if (result.accepted.source_image_sha256) sha256.set(result.accepted.source_image_sha256, result.facility_id);
    }
  }
  return { sha1, sha256 };
}

async function fingerprint(buffer) {
  const pixels = await sharp(buffer, { failOn: "none", animated: false }).rotate().resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
  return sha256(pixels);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function addHash(map, hash, id) {
  const ids = map.get(hash) ?? [];
  ids.push(id);
  map.set(hash, ids);
}

function duplicateGroups(map) {
  return [...map.entries()].filter(([, ids]) => ids.length > 1).map(([hash, facility_ids]) => ({ hash, facility_ids }));
}

function hasImage(facility) {
  return Boolean((typeof facility.image === "string" && facility.image.trim()) || (Array.isArray(facility.images) && facility.images.some(Boolean)));
}

function withoutImageFields(facility) {
  return Object.fromEntries(Object.entries(facility).filter(([key]) => !IMAGE_FIELDS.has(key)));
}

async function loadAudit(preexistingDuplicateGroups) {
  if (RESUME && existsSync(AUDIT_PATH)) {
    const existing = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
    if (existing.baseline_commit !== BASELINE_COMMIT) throw new Error("Refusing resume: audit baseline_commit differs from HEAD.");
    return existing;
  }
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    completed_at: null,
    status: "running",
    baseline_commit: BASELINE_COMMIT,
    mode: APPLY ? "apply" : "audit",
    policy: {
      acquisition_scope: "Every facility without an existing adopted image at baseline; existing images are immutable.",
      discovery_source: "Direct Wikimedia Commons file search, distinct from the completed Wikipedia representative-page-image route.",
      rights_gate: "Source page, original URL, owner/author, accepted commercial-use license, terms URL, attribution requirement, modification permission, and checked_at are mandatory; unclear or noncommercial licenses fail closed.",
      identity_gate: "Strict canonical-name/alias match plus Commons file GPS within 2km, or explicit prefecture and municipality evidence in Commons source context.",
      relevance_gate: "Facility exterior, principal grounds/space, or representative visitor-facing scene; logos, maps, signs, posters, people/objects/products, and non-representative detail fail closed.",
      quality_gate: "JPEG/PNG/WebP, at least 12KB, 600px wide, and 300px high.",
      optimization: "Sharp auto-rotate + attention crop to 1200x800 WebP quality 82.",
      deduplication: "Source SHA-1, source SHA-256, output SHA-256, and normalized 32x32 grayscale visual fingerprint checked against all existing and Wave 4 images.",
    },
    coverage: {
      as_of: CHECKED_AT,
      facility_canon_count: document.facilities.length,
      baseline_image_count: baselineImageCount,
      baseline_zero_image_count: targets.length,
      target_count: targets.length,
    },
    source_inventory: {
      wikimedia_commons_direct_search: {
        rights_basis: "Per-file Commons extmetadata and source page",
        commercial_use_filter: "CC0 / Public Domain / CC BY / CC BY-SA only",
        api_terms_reference: "https://www.mediawiki.org/wiki/API:Imageinfo",
      },
      openverse: {
        disposition: "not_used_for_full_coverage",
        reason: "Anonymous sustained limit is 200 requests/day for 3,575 targets, and Openverse requires upstream license verification; using a partial route would not constitute all-target exploration.",
        docs: "https://docs.openverse.org/_preview/4859/api/reference/made_with_ov.html",
      },
    },
    preexisting_duplicate_groups: preexistingDuplicateGroups,
    results: [],
  };
}

async function saveCheckpoint() {
  updateCoverage();
  if (APPLY) await writeFile(DATA_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await mkdir(dirname(AUDIT_PATH), { recursive: true });
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
}

function updateCoverage() {
  const results = audit.results;
  const count = (disposition) => results.filter((result) => result.disposition === disposition).length;
  const accepted = results.filter((result) => ["accepted", "would_accept"].includes(result.disposition));
  const imageCount = document.facilities.filter(hasImage).length;
  audit.coverage.processed_count = results.length;
  audit.coverage.candidate_found_count = results.filter((result) => result.candidate_found === true).length;
  audit.coverage.source_candidate_counts = {
    wikimedia_commons_direct_search: audit.coverage.candidate_found_count,
  };
  audit.coverage.rights_pass_count = results.filter((result) => result.rights_pass === true).length;
  audit.coverage.identity_pass_count = results.filter((result) => result.strict_identity_match === true).length;
  audit.coverage.relevance_pass_count = results.filter((result) => result.relevance_pass === true).length;
  audit.coverage.rejection_counts = Object.fromEntries(
    [...new Set(results.map((result) => result.disposition))]
      .filter((disposition) => disposition.startsWith("rejected_"))
      .sort()
      .map((disposition) => [disposition, count(disposition)]),
  );
  audit.coverage.no_candidate_count = count("no_candidate");
  audit.coverage.error_count = count("error");
  audit.coverage.accepted_count = accepted.length;
  audit.coverage.final_image_count = imageCount;
  audit.coverage.final_zero_image_count = document.facilities.length - imageCount;
  audit.coverage.final_coverage_percent = Number((imageCount / document.facilities.length * 100).toFixed(2));
  audit.rights_summary = {
    complete_metadata_count: accepted.filter((result) => {
      const value = result.accepted;
      return value?.source_url && value?.image_original_url && value?.source_owner && value?.license
        && value?.commercial_use_allowed === true && typeof value?.attribution_requirement === "boolean"
        && value?.modification_allowed === true && value?.terms_url && value?.checked_at;
    }).length,
    license_counts: Object.fromEntries(Object.entries(Object.groupBy(accepted, (result) => result.accepted.license)).map(([license, values]) => [license, values.length])),
  };
  audit.duplicate_summary = {
    rejected_candidate_count: count("rejected_duplicate_image"),
    new_source_sha1_duplicate_groups: 0,
    new_source_sha256_duplicate_groups: 0,
    new_output_sha256_duplicate_groups: 0,
    new_visual_fingerprint_duplicate_groups: 0,
  };
}

function setParams(url, params) {
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
}

// Fail immediately if a future edit accidentally mutates non-image fields in memory.
for (const facility of document.facilities) void withoutImageFields(facility);
