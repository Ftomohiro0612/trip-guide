import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type Facility = {
  id: number;
  slug: string;
  name: string;
  prefecture: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  image_attribution?: string | null;
  image_source?: string | null;
};

type WikiPage = {
  pageid: number;
  title: string;
  index?: number;
  fullurl?: string;
  extract?: string;
  pageimage?: string;
  original?: { source: string; width: number; height: number };
  coordinates?: Array<{ lat: number; lon: number; primary?: string }>;
  categories?: Array<{ title: string }>;
};

type ImageInfo = {
  size: number;
  width: number;
  height: number;
  url: string;
  descriptionurl: string;
  sha1: string;
  mime: string;
  extmetadata?: Record<string, { value?: string }>;
};

type AuditResult = Record<string, unknown> & {
  facility_id: number;
  disposition: string;
  accepted?: Record<string, unknown> | null;
};

type AuditDocument = Record<string, unknown> & {
  baseline_commit: string;
  completed_at: string | null;
  status: string;
  coverage: Record<string, unknown>;
  results: AuditResult[];
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const BLACKLIST_PATH = resolve(ROOT, "data/wiki-image-blacklist.json");
const AUDIT_PATH = resolve(ROOT, "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json");
const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const RETRY_ERRORS = process.argv.includes("--retry-errors");
const LIMIT = Number(process.argv.find((argument) => argument.startsWith("--limit="))?.split("=")[1] ?? "0");
const RATE_LIMIT_MS = 150;
const UA = "trip-guide.net image fetcher (mail@memorips.com)";
const BASELINE_COMMIT = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const ACCEPTED_LICENSE = /^(?:CC0(?: 1\.0)?|CC BY(?:-SA)?(?: [1-9]\.\d)?|Public domain|パブリック・ドメイン)$/iu;
const REJECTED_IMAGE_PATTERN = /(?:\blogo\b|ロゴ|emblem|紋章|\bsymbol\b|シンボル|\bicon\b|アイコン|\bmap\b|地図|location.?map|prefectural.?map|\bflag\b|旗|\bseal\b|\bsign\b|看板|mascot|マスコット|character|キャラクター|portrait|肖像)/iu;
const REJECTED_ARTICLE_PATTERNS = [
  /Category:.*(?:人物|存命人物|生年不明)/u,
  /Category:.*(?:日本の企業|日本の会社)/u,
  /Category:.*(?:漫画|アニメ|映画|テレビドラマ|小説|キャラクター)/u,
  /Category:.*(?:日本の市町村|町・字|曖昧さ回避)/u,
];

let lastRequestAt = 0;

async function main(): Promise<void> {
  const document = JSON.parse(await readFile(DATA_PATH, "utf8")) as { metadata: unknown; facilities: Facility[] };
  const blacklistDocument = existsSync(BLACKLIST_PATH)
    ? JSON.parse(await readFile(BLACKLIST_PATH, "utf8")) as { rejected?: number[]; entries?: Array<Record<string, unknown>> }
    : { rejected: [], entries: [] };
  const historicalBlacklist = new Set(blacklistDocument.rejected ?? []);
  const baselineImageCount = document.facilities.filter(hasImage).length;
  const targets = document.facilities.filter((facility) => !hasImage(facility));
  const imageFingerprints = await indexExistingImages(document.facilities);
  const sourceSha1s = new Map<string, number>();
  const audit = await loadAudit({
    baselineImageCount,
    targetCount: targets.length,
    historicalBlacklistCount: targets.filter((facility) => historicalBlacklist.has(facility.id)).length,
    preexistingDuplicateGroups: imageFingerprints.duplicateGroups,
  });
  if (RETRY_ERRORS) {
    audit.results = (audit.results as AuditResult[]).filter((result) => result.disposition !== "error");
    audit.completed_at = null;
    audit.status = "running";
  }
  const completedIds = new Set<number>(audit.results.map((result: AuditResult) => result.facility_id));
  for (const result of audit.results as AuditResult[]) {
    const accepted = result.accepted as { source_image_sha1?: string } | null;
    if (accepted?.source_image_sha1) sourceSha1s.set(accepted.source_image_sha1, result.facility_id);
  }

  let processedThisRun = 0;
  for (let index = 0; index < targets.length; index += 1) {
    const facility = targets[index];
    if (completedIds.has(facility.id)) continue;
    if (LIMIT > 0 && processedThisRun >= LIMIT) break;
    processedThisRun += 1;
    let result: AuditResult;
    if (historicalBlacklist.has(facility.id)) {
      result = baseResult(facility, "rejected_historical_blacklist", {
        reason: "Past Memorip manual review rejected the Wikipedia fuzzy/identity match; retained without re-fetching.",
      });
    } else {
      try {
        result = await evaluateFacility(facility, imageFingerprints, sourceSha1s);
      } catch (error) {
        result = baseResult(facility, "error", { reason: error instanceof Error ? error.message : String(error) });
      }
    }
    audit.results.push(result);
    completedIds.add(facility.id);
    console.log(`[${index + 1}/${targets.length}] ${result.disposition.padEnd(38)} ${facility.slug} ${facility.name}`);
    if (processedThisRun % 10 === 0) await saveCheckpoint(document, audit, blacklistDocument);
  }

  await saveCheckpoint(document, audit, blacklistDocument);
  const allDone = targets.every((facility) => completedIds.has(facility.id))
    && !(audit.results as AuditResult[]).some((result) => result.disposition === "error");
  if (allDone) {
    audit.completed_at = new Date().toISOString();
    audit.status = "completed";
    await saveCheckpoint(document, audit, blacklistDocument);
  }
  console.log(JSON.stringify(audit.coverage, null, 2));
  if (!allDone && LIMIT === 0) process.exitCode = 1;
}

async function evaluateFacility(
  facility: Facility,
  fingerprints: Awaited<ReturnType<typeof indexExistingImages>>,
  sourceSha1s: Map<string, number>,
): Promise<AuditResult> {
  const searches: Array<Record<string, unknown>> = [];
  const candidatePages = new Map<number, WikiPage>();
  for (const query of [facility.name, `${facility.name} ${facility.prefecture}`]) {
    const pages = await searchWikipedia(query);
    searches.push({ query, result_titles: pages.map((page) => page.title) });
    for (const page of pages) candidatePages.set(page.pageid, page);
    if ([...candidatePages.values()].some((page) => exactTitleMatch(facility.name, page.title))) break;
  }
  const pages = [...candidatePages.values()];
  const imageCandidates = pages.filter((page) => page.original && page.pageimage);
  if (imageCandidates.length === 0) {
    return baseResult(facility, "no_candidate", {
      candidate_found: false,
      searches,
      reason: pages.length === 0 ? "Wikipedia search returned no article." : "Search results had no page image.",
    });
  }
  const exactCandidates = imageCandidates.filter((page) => exactTitleMatch(facility.name, page.title));
  if (exactCandidates.length === 0) {
    return baseResult(facility, "rejected_identity_mismatch", {
      candidate_found: true,
      searches,
      candidates: imageCandidates.map(summarizePage),
      reason: "No image-bearing Wikipedia article title exactly matched the normalized canonical facility name.",
    });
  }
  const articleTypeCandidates = exactCandidates.filter(isFacilityArticle);
  if (articleTypeCandidates.length === 0) {
    return baseResult(facility, "rejected_non_facility_article", {
      candidate_found: true,
      searches,
      candidates: exactCandidates.map(summarizePage),
      reason: "The exact-name article was a person, company, work, municipality, locality, or disambiguation target rather than the facility.",
    });
  }
  const locatedCandidates = articleTypeCandidates
    .map((page) => ({ page, location: locationMatch(facility, page) }))
    .filter((entry) => entry.location.ok);
  if (locatedCandidates.length === 0) {
    return baseResult(facility, "rejected_location_mismatch", {
      candidate_found: true,
      searches,
      candidates: articleTypeCandidates.map((page) => ({ ...summarizePage(page), location: locationMatch(facility, page) })),
      reason: "Article coordinates/location evidence did not establish the same facility in the canonical prefecture/municipality.",
    });
  }

  for (const { page, location } of locatedCandidates) {
    const pageImageName = page.pageimage ?? "";
    if (REJECTED_IMAGE_PATTERN.test(pageImageName)) {
      return baseResult(facility, "rejected_image_relevance", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        reason: `Representative page image filename was fail-closed as logo/map/sign/person/character content: ${pageImageName}`,
      });
    }
    const imageInfo = await getImageInfo(pageImageName);
    if (!imageInfo) {
      return baseResult(facility, "rejected_rights_unverifiable", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        reason: "Wikimedia image metadata/source page could not be resolved.",
      });
    }
    const metadata = cleanMetadata(imageInfo.extmetadata ?? {});
    const imageText = [pageImageName, metadata.ObjectName, metadata.ImageDescription].filter(Boolean).join(" ");
    if (REJECTED_IMAGE_PATTERN.test(imageText)) {
      return baseResult(facility, "rejected_image_relevance", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        image: summarizeImageInfo(imageInfo, metadata),
        reason: "Image filename/description identified logo/map/sign/person/character content.",
      });
    }
    const author = metadata.Artist;
    const license = metadata.LicenseShortName;
    if (!author || !license || !ACCEPTED_LICENSE.test(license) || !imageInfo.descriptionurl || !imageInfo.url) {
      return baseResult(facility, "rejected_rights_unverifiable", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        image: summarizeImageInfo(imageInfo, metadata),
        reason: "Author, accepted free license, original file URL, or Wikimedia source page was missing/unverifiable.",
      });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(imageInfo.mime) || imageInfo.size < 12_000 || imageInfo.width < 600 || imageInfo.height < 300) {
      return baseResult(facility, "rejected_image_quality", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        image: summarizeImageInfo(imageInfo, metadata),
        reason: "Image failed the current Memorip partner-image minimums (raster, 12KB, 600x300).",
      });
    }
    const priorSourceFacilityId = sourceSha1s.get(imageInfo.sha1);
    if (priorSourceFacilityId) {
      return baseResult(facility, "rejected_duplicate_image", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        image: summarizeImageInfo(imageInfo, metadata), duplicate_facility_id: priorSourceFacilityId,
        reason: "The Wikimedia source SHA-1 was already assigned to another facility in this pass.",
      });
    }

    const source = await download(imageInfo.url);
    const sourceSha256 = sha256(source);
    const output = await sharp(source, { failOn: "error", animated: false })
      .rotate()
      .resize(1200, 800, { fit: "cover", position: "attention" })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    const outputMetadata = await sharp(output).metadata();
    if (outputMetadata.format !== "webp" || outputMetadata.width !== 1200 || outputMetadata.height !== 800) {
      throw new Error("Optimized image did not produce the required 1200x800 WebP.");
    }
    const outputSha256 = sha256(output);
    const visualFingerprint = await fingerprint(output);
    const duplicate = fingerprints.exact.get(outputSha256) ?? fingerprints.visual.get(visualFingerprint);
    if (duplicate) {
      return baseResult(facility, "rejected_duplicate_image", {
        candidate_found: true, strict_identity_match: true, searches, candidate: summarizePage(page), location,
        image: summarizeImageInfo(imageInfo, metadata), duplicate_facility_id: duplicate,
        reason: "The normalized output hash/visual fingerprint was already assigned to another canonical facility.",
      });
    }

    const outputPublicPath = `/images/facilities/${facility.slug}.webp`;
    if (APPLY) {
      const outputPath = resolve(ROOT, "public", outputPublicPath.slice(1));
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output);
      facility.image = outputPublicPath;
      facility.image_attribution = buildAttribution(page, imageInfo, author, license);
      facility.image_source = "manual";
    }
    fingerprints.exact.set(outputSha256, facility.id);
    fingerprints.visual.set(visualFingerprint, facility.id);
    sourceSha1s.set(imageInfo.sha1, facility.id);
    return baseResult(facility, APPLY ? "accepted" : "would_accept", {
      candidate_found: true,
      strict_identity_match: true,
      searches,
      accepted: {
        article_title: page.title,
        article_url: page.fullurl,
        identity_basis: `normalized_exact_title + ${location.basis}`,
        location_distance_km: location.distance_km,
        source_file_name: pageImageName,
        source_file_page: imageInfo.descriptionurl,
        original_image_url: imageInfo.url,
        author,
        license,
        license_url: metadata.LicenseUrl || null,
        usage_terms: metadata.UsageTerms || null,
        credit: metadata.Credit || null,
        attribution_required: metadata.AttributionRequired || null,
        source_mime: imageInfo.mime,
        source_bytes: source.length,
        source_width: imageInfo.width,
        source_height: imageInfo.height,
        source_image_sha1: imageInfo.sha1,
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
  return baseResult(facility, "rejected_identity_mismatch", { candidate_found: true, searches, reason: "No candidate survived all strict gates." });
}

async function searchWikipedia(query: string): Promise<WikiPage[]> {
  const url = new URL("https://ja.wikipedia.org/w/api.php");
  setParams(url, {
    action: "query", format: "json", generator: "search", gsrsearch: query, gsrlimit: "3",
    prop: "pageimages|info|extracts|coordinates|categories", piprop: "name|original", inprop: "url",
    exintro: "1", explaintext: "1", cllimit: "max", redirects: "1", origin: "*",
  });
  const data = await fetchJson(url) as { query?: { pages?: Record<string, WikiPage> } };
  return Object.values(data.query?.pages ?? {}).sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
}

async function getImageInfo(fileName: string): Promise<ImageInfo | null> {
  const url = new URL("https://ja.wikipedia.org/w/api.php");
  setParams(url, {
    action: "query", format: "json", titles: `File:${fileName}`, prop: "imageinfo",
    iiprop: "url|size|mime|sha1|extmetadata",
    iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired|UsageTerms|ImageDescription|ObjectName",
    origin: "*",
  });
  const data = await fetchJson(url) as { query?: { pages?: Record<string, { imageinfo?: ImageInfo[] }> } };
  return Object.values(data.query?.pages ?? {})[0]?.imageinfo?.[0] ?? null;
}

async function fetchJson(url: URL): Promise<unknown> {
  await rateLimit();
  let response: Response | null = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(url, { headers: { "User-Agent": UA } });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status)) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  throw new Error(`MediaWiki API request failed: ${response?.status ?? "network"}`);
}

async function download(url: string): Promise<Buffer> {
  await rateLimit();
  const response = await fetch(url, { headers: { "User-Agent": UA } });
  if (!response.ok) throw new Error(`Image download failed: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) await new Promise((resolveDelay) => setTimeout(resolveDelay, RATE_LIMIT_MS - elapsed));
  lastRequestAt = Date.now();
}

function exactTitleMatch(facilityName: string, articleTitle: string): boolean {
  return normalize(facilityName) === normalize(stripDisambiguator(articleTitle));
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[®™©]/gu, "").replace(/[\s　\-_()（）「」『』【】・･,.、。!！?？&＆'’"“”/／]/gu, "");
}

function stripDisambiguator(value: string): string {
  return value.replace(/\s*[（(][^()（）]+[）)]\s*$/u, "");
}

function isFacilityArticle(page: WikiPage): boolean {
  const categories = (page.categories ?? []).map((category) => category.title);
  if (categories.some((category) => REJECTED_ARTICLE_PATTERNS.some((pattern) => pattern.test(category)))) return false;
  const opening = (page.extract ?? "").slice(0, 240);
  return !/(?:は|とは)、?(?:日本の)?(?:人物|企業|会社|法人|漫画|アニメ|映画|小説|テレビドラマ|キャラクター|市町村|地名|町名)/u.test(opening);
}

function locationMatch(facility: Facility, page: WikiPage): { ok: boolean; basis: string; distance_km: number | null; evidence?: string } {
  const coordinate = page.coordinates?.find((entry) => "primary" in entry) ?? page.coordinates?.[0];
  if (coordinate && typeof facility.latitude === "number" && typeof facility.longitude === "number") {
    const distance = haversine(facility.latitude, facility.longitude, coordinate.lat, coordinate.lon);
    return { ok: distance <= 5, basis: "article_coordinates_within_5km", distance_km: Number(distance.toFixed(3)) };
  }
  const locationText = [page.extract ?? "", ...(page.categories ?? []).map((category) => category.title)].join(" ");
  const municipality = extractMunicipality(facility.address ?? "");
  return {
    ok: locationText.includes(facility.prefecture) && Boolean(municipality && locationText.includes(municipality)),
    basis: "article_text_prefecture_and_municipality",
    distance_km: null,
    evidence: municipality ?? undefined,
  };
}

function extractMunicipality(address: string): string | null {
  const match = address.replace(/〒?\d{3}-?\d{4}\s*/gu, "").match(/(?:北海道|東京都|京都府|大阪府|.{2,3}県)?([^\s0-9０-９]+?(?:市|区|町|村))/u);
  return match?.[1] ?? null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(lat2 - lat1);
  const deltaLon = radians(lon2 - lon1);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function summarizePage(page: WikiPage): Record<string, unknown> {
  return { title: page.title, article_url: page.fullurl ?? null, page_image: page.pageimage ?? null, coordinates: page.coordinates?.[0] ?? null, extract: (page.extract ?? "").slice(0, 500) };
}

function summarizeImageInfo(imageInfo: ImageInfo, metadata: Record<string, string>): Record<string, unknown> {
  return {
    source_file_page: imageInfo.descriptionurl, original_image_url: imageInfo.url, source_image_sha1: imageInfo.sha1,
    mime: imageInfo.mime, bytes: imageInfo.size, width: imageInfo.width, height: imageInfo.height,
    author: metadata.Artist || null, license: metadata.LicenseShortName || null, license_url: metadata.LicenseUrl || null,
    description: metadata.ImageDescription || null,
  };
}

function cleanMetadata(metadata: Record<string, { value?: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(metadata).map(([key, entry]) => [key, decodeHtml(stripHtml(entry.value ?? "")).trim()]));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ");
}

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;|&#160;/gu, " ").replace(/&amp;/gu, "&").replace(/&quot;/gu, '"').replace(/&#0*39;|&apos;/gu, "'").replace(/&lt;/gu, "<").replace(/&gt;/gu, ">");
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;").replace(/'/gu, "&#39;");
}

function buildAttribution(page: WikiPage, imageInfo: ImageInfo, author: string, license: string): string {
  return `<a href="${escapeHtml(page.fullurl ?? "https://ja.wikipedia.org/")}" rel="noopener noreferrer" target="_blank">Wikipedia: ${escapeHtml(page.title)}</a> / <a href="${escapeHtml(imageInfo.descriptionurl)}" rel="noopener noreferrer" target="_blank">画像: ${escapeHtml(author)} (${escapeHtml(license)})</a>`;
}

async function indexExistingImages(facilities: Facility[]): Promise<{
  exact: Map<string, number>; visual: Map<string, number>; duplicateGroups: Array<Record<string, unknown>>;
}> {
  const exact = new Map<string, number>();
  const visual = new Map<string, number>();
  const exactGroups = new Map<string, number[]>();
  const visualGroups = new Map<string, number[]>();
  for (const facility of facilities.filter(hasImage)) {
    const imagePath = resolve(ROOT, "public", String(facility.image).replace(/^\//u, ""));
    if (!existsSync(imagePath)) continue;
    const buffer = await readFile(imagePath);
    const exactHash = sha256(buffer);
    const visualHash = await fingerprint(buffer);
    appendGroup(exactGroups, exactHash, facility.id);
    appendGroup(visualGroups, visualHash, facility.id);
    if (!exact.has(exactHash)) exact.set(exactHash, facility.id);
    if (!visual.has(visualHash)) visual.set(visualHash, facility.id);
  }
  return {
    exact,
    visual,
    duplicateGroups: [
      ...[...exactGroups.entries()].filter(([, ids]) => ids.length > 1).map(([hash, facilityIds]) => ({ kind: "sha256", hash, facility_ids: facilityIds })),
      ...[...visualGroups.entries()].filter(([, ids]) => ids.length > 1).map(([hash, facilityIds]) => ({ kind: "visual_fingerprint_sha256", hash, facility_ids: facilityIds })),
    ],
  };
}

async function fingerprint(buffer: Buffer): Promise<string> {
  const pixels = await sharp(buffer, { failOn: "none", animated: false }).rotate().resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
  return sha256(pixels);
}

function appendGroup(map: Map<string, number[]>, hash: string, id: number): void {
  const ids = map.get(hash) ?? [];
  ids.push(id);
  map.set(hash, ids);
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function hasImage(facility: Facility): boolean {
  return Boolean(typeof facility.image === "string" && facility.image.trim());
}

function baseResult(facility: Facility, disposition: string, extra: Record<string, unknown>): AuditResult {
  return {
    facility_id: facility.id, facility_slug: facility.slug, facility_name: facility.name, prefecture: facility.prefecture,
    canonical_address: facility.address ?? null,
    canonical_coordinates: typeof facility.latitude === "number" && typeof facility.longitude === "number" ? { lat: facility.latitude, lon: facility.longitude } : null,
    disposition, accepted: null, ...extra,
  };
}

async function loadAudit(input: {
  baselineImageCount: number; targetCount: number; historicalBlacklistCount: number; preexistingDuplicateGroups: Array<Record<string, unknown>>;
}): Promise<AuditDocument> {
  if (RESUME && existsSync(AUDIT_PATH)) {
    const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8")) as AuditDocument;
    if (audit.baseline_commit !== BASELINE_COMMIT) throw new Error("Refusing resume: audit baseline_commit differs from HEAD.");
    return audit;
  }
  return {
    schema_version: 2, generated_at: new Date().toISOString(), completed_at: null, status: "running",
    baseline_commit: BASELINE_COMMIT, mode: APPLY ? "apply" : "audit",
    policy: {
      restored_pipeline: "Historical fetch-wiki-images search (facility name, then name + prefecture), strict title cleanup, manual-reject blacklist, attribution, and image optimization.",
      acquisition_scope: "Every current canonical facility without an adopted image; existing images are immutable.",
      identity_gate: "Normalized exact facility/article title plus article coordinates within 5km, or explicit prefecture+municipality evidence when article coordinates are absent.",
      article_gate: "People, companies, works, characters, municipalities, localities, and disambiguation pages fail closed.",
      image_gate: "Representative Wikipedia page image only; logo/map/sign/person/character metadata, SVG, unverifiable rights, <12KB, <600px width, or <300px height fail closed.",
      rights_gate: "Wikimedia source page, original URL, author, and accepted free-license metadata are mandatory.",
      optimization: "Sharp auto-rotate + attention crop to 1200x800 WebP quality 82.",
      deduplication: "Reject new exact source SHA-1, output SHA-256, or normalized 32x32 grayscale visual fingerprint shared with another facility.",
    },
    coverage: {
      as_of: "2026-08-27", facility_canon_count: input.baselineImageCount + input.targetCount,
      baseline_image_count: input.baselineImageCount, baseline_zero_image_count: input.targetCount,
      target_count: input.targetCount, historical_blacklist_count: input.historicalBlacklistCount,
    },
    preexisting_duplicate_groups: input.preexistingDuplicateGroups,
    results: [],
  };
}

async function saveCheckpoint(
  document: { metadata: unknown; facilities: Facility[] },
  audit: AuditDocument,
  blacklistDocument: { rejected?: number[]; entries?: Array<Record<string, unknown>> },
): Promise<void> {
  updateCoverage(audit, document.facilities);
  if (APPLY) await writeFile(DATA_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  const rejectedEntries = (audit.results as AuditResult[])
    .filter((result) => [
      "rejected_identity_mismatch", "rejected_non_facility_article", "rejected_location_mismatch", "rejected_image_relevance",
      "rejected_rights_unverifiable", "rejected_image_quality", "rejected_duplicate_image",
    ].includes(result.disposition))
    .map((result) => ({
      facility_id: result.facility_id, facility_name: result.facility_name, disposition: result.disposition,
      recorded_at: "2026-08-27", audit_path: "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json",
    }));
  const rejectedIds = new Set<number>(blacklistDocument.rejected ?? []);
  for (const entry of rejectedEntries) rejectedIds.add(entry.facility_id as number);
  blacklistDocument.rejected = [...rejectedIds].sort((left, right) => left - right);
  const priorEntries = new Map<number, Record<string, unknown>>((blacklistDocument.entries ?? []).map((entry) => [entry.facility_id as number, entry]));
  for (const entry of rejectedEntries) priorEntries.set(entry.facility_id as number, entry);
  blacklistDocument.entries = [...priorEntries.values()].sort((left, right) => (left.facility_id as number) - (right.facility_id as number));
  await mkdir(dirname(AUDIT_PATH), { recursive: true });
  await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  if (APPLY) await writeFile(BLACKLIST_PATH, `${JSON.stringify(blacklistDocument, null, 2)}\n`, "utf8");
}

function updateCoverage(audit: AuditDocument, facilities: Facility[]): void {
  const results = audit.results as AuditResult[];
  const count = (disposition: string) => results.filter((result) => result.disposition === disposition).length;
  const imageCount = facilities.filter(hasImage).length;
  audit.coverage.processed_count = results.length;
  audit.coverage.candidate_found_count = results.filter((result) => result.candidate_found === true).length;
  audit.coverage.strict_match_pass_count = results.filter((result) => result.strict_identity_match === true).length;
  audit.coverage.rejection_counts = Object.fromEntries(
    [...new Set(results.map((result) => result.disposition))].filter((disposition) => disposition.startsWith("rejected_")).sort().map((disposition) => [disposition, count(disposition)]),
  );
  audit.coverage.error_count = count("error");
  audit.coverage.accepted_count = count("accepted") + count("would_accept");
  audit.coverage.final_image_count = imageCount;
  audit.coverage.final_zero_image_count = facilities.length - imageCount;
  audit.coverage.final_coverage_percent = Number((imageCount / facilities.length * 100).toFixed(2));
}

function setParams(url: URL, params: Record<string, string>): void {
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
