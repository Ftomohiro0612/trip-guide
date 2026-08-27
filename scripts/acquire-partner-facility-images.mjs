#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const ASOVIEW_PATH = resolve(ROOT, "data/asoview_facility_actions.json");
const RAKUTEN_PATH = resolve(ROOT, "data/rakuten_facility_actions.json");
const IMAGE_DIR = resolve(ROOT, "public/images/facilities");
const AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/facility-image-coverage-partner-2026-08-27.json",
);
const USER_AGENT =
  "MemoripFacilityImageCoverage/1.0 (+https://trip-guide.net; verified partner offers only)";
const REQUEST_SPACING_MS = 180;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 300;
const MIN_BYTES = 12_000;
const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 800;

const args = parseArgs(process.argv.slice(2));
const baselineCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();
const [facilityRaw, asoviewRaw, rakutenRaw] = await Promise.all([
  readFile(FACILITIES_PATH, "utf8"),
  readFile(ASOVIEW_PATH, "utf8"),
  readFile(RAKUTEN_PATH, "utf8"),
]);
const facilityDocument = JSON.parse(facilityRaw);
const facilities = facilityDocument.facilities;
const facilityById = new Map(facilities.map((facility) => [facility.id, facility]));
const offers = [
  ...JSON.parse(asoviewRaw).offers.map((offer) => ({
    ...offer,
    partner: "asoview",
  })),
  ...JSON.parse(rakutenRaw).offers.map((offer) => ({
    ...offer,
    partner: "rakuten",
  })),
];

const offersByFacility = new Map();
for (const offer of offers) {
  const facility = facilityById.get(offer.facility_id);
  if (!facility || (hasImage(facility) && !isManagedPartnerImage(facility))) continue;
  if (!offerIdentityIsCanonical(offer, facility)) continue;
  if (offer.display_through && offer.display_through < args.asOf) continue;
  const bucket = offersByFacility.get(facility.id) ?? [];
  bucket.push(offer);
  offersByFacility.set(facility.id, bucket);
}

const candidates = [...offersByFacility.entries()]
  .map(([facilityId, facilityOffers]) => ({
    facility: facilityById.get(facilityId),
    offers: facilityOffers.sort(compareOffers),
  }))
  .sort(compareCandidates)
  .slice(0, args.limit ?? Number.POSITIVE_INFINITY);

console.log(
  JSON.stringify(
    {
      mode: args.apply ? "apply" : "audit-only",
      as_of: args.asOf,
      canon_count: facilities.length,
      baseline_image_count: facilities.filter(hasImage).length,
      baseline_zero_image_count: facilities.filter((facility) => !hasImage(facility)).length,
      verified_partner_target_count: offersByFacility.size,
      selected_target_count: candidates.length,
    },
    null,
    2,
  ),
);

const results = [];
let lastRequestAt = 0;
for (let index = 0; index < candidates.length; index += 1) {
  const { facility, offers: facilityOffers } = candidates[index];
  let accepted = null;
  const attempts = [];
  for (const offer of facilityOffers) {
    const attempt = await inspectOffer(facility, offer);
    attempts.push(attempt);
    if (attempt.status === "accepted") {
      accepted = attempt;
      break;
    }
  }

  if (accepted && args.apply) {
    const outputPath = resolve(IMAGE_DIR, `${facility.slug}.webp`);
    await mkdir(dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    await sharp(accepted.image_buffer)
      .rotate()
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: false,
      })
      .webp({ quality: 82, effort: 5 })
      .toFile(temporaryPath);
    await rename(temporaryPath, outputPath);

    facility.image = `/images/facilities/${facility.slug}.webp`;
    facility.image_attribution = attributionFor(accepted);
    facility.image_source =
      accepted.partner === "asoview"
        ? "asoview-official-partner"
        : "rakuten-travel-experiences-official-partner";
    delete accepted.image_buffer;
    accepted.output_path = facility.image;
    accepted.output_sha256 = createHash("sha256")
      .update(await readFile(outputPath))
      .digest("hex");
  } else if (accepted) {
    delete accepted.image_buffer;
  }

  results.push({
    facility_id: facility.id,
    facility_slug: facility.slug,
    facility_name: facility.name,
    prefecture: facility.prefecture,
    disposition: accepted ? "accepted" : "not_acquired",
    accepted,
    attempts: attempts.map((attempt) => {
      const auditAttempt = { ...attempt };
      delete auditAttempt.image_buffer;
      return auditAttempt;
    }),
  });
  console.log(
    `[${index + 1}/${candidates.length}] ${accepted ? "ACCEPT" : "SKIP"} ${facility.slug} ${facility.name}${accepted ? ` <- ${accepted.partner}` : ""}`,
  );
}

if (args.apply) {
  await writeFile(
    FACILITIES_PATH,
    `${JSON.stringify(facilityDocument, null, 2).replace(/\n/g, "\r\n")}\r\n`,
    "utf8",
  );
}

const acceptedCount = results.filter((result) => result.disposition === "accepted").length;
const finalImageCount = facilities.filter(hasImage).length;
const audit = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  baseline_commit: baselineCommit,
  mode: args.apply ? "apply" : "audit-only",
  policy: {
    acquisition_scope:
      "Only canonical facilities with pre-verified Asoview or Rakuten partner offers were eligible.",
    identity_gate:
      "facility_id, facility_slug, facility_name, curated same-facility verification, and live offer title were all required to agree.",
    image_gate: {
      minimum_source_bytes: MIN_BYTES,
      minimum_source_width: MIN_WIDTH,
      minimum_source_height: MIN_HEIGHT,
      accepted_mime_prefix: "image/",
    },
  },
  coverage: {
    as_of: args.asOf,
    facility_canon_count: facilities.length,
    baseline_image_count: finalImageCount - (args.apply ? acceptedCount : 0),
    baseline_zero_image_count:
      facilities.length - finalImageCount + (args.apply ? acceptedCount : 0),
    verified_partner_target_count: offersByFacility.size,
    selected_target_count: candidates.length,
    accepted_count: acceptedCount,
    final_image_count: finalImageCount,
    final_zero_image_count: facilities.length - finalImageCount,
    final_coverage_percent: Number(
      ((finalImageCount / facilities.length) * 100).toFixed(2),
    ),
  },
  results,
};
await mkdir(dirname(AUDIT_PATH), { recursive: true });
await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify(audit.coverage, null, 2));
console.log(`audit=${AUDIT_PATH}`);

async function inspectOffer(facility, offer) {
  const base = {
    partner: offer.partner,
    offer_url: offer.url,
    offer_verified_at: offer.verified_at,
    offer_verification_title:
      offer.verification?.asoview_title ?? offer.verification?.rakuten_title ?? "",
    same_facility_basis: offer.verification?.same_facility_basis ?? "",
  };
  try {
    const pageResponse = await request(offer.url, "text/html,application/xhtml+xml");
    if (!pageResponse.ok) {
      return { ...base, status: "rejected", reason: `offer_http_${pageResponse.status}` };
    }
    let html = await pageResponse.text();
    let pageTitle = decodeHtml(
      extractMeta(html, "og:title") || extractTagText(html, "title"),
    );
    let imageUrl = decodeHtml(extractMeta(html, "og:image"));
    let canonicalUrl = decodeHtml(extractCanonical(html)) || pageResponse.url;
    let asoviewBaseUrl = "";
    if (offer.partner === "asoview") {
      asoviewBaseUrl = extractAsoviewBaseUrl(html, pageResponse.url);
      if (!asoviewBaseUrl) {
        return {
          ...base,
          status: "rejected",
          reason: "missing_asoview_base_identity_page",
          page_title: pageTitle,
          canonical_url: canonicalUrl,
        };
      }
      const baseResponse = await request(
        asoviewBaseUrl,
        "text/html,application/xhtml+xml",
      );
      if (!baseResponse.ok) {
        return {
          ...base,
          status: "rejected",
          reason: `asoview_base_http_${baseResponse.status}`,
          asoview_base_url: asoviewBaseUrl,
        };
      }
      html = await baseResponse.text();
      pageTitle = decodeHtml(
        extractMeta(html, "og:title") || extractTagText(html, "title"),
      );
      imageUrl = decodeHtml(extractMeta(html, "og:image"));
      canonicalUrl = decodeHtml(extractCanonical(html)) || baseResponse.url;
    }
    const titleBasis = verifyLiveTitle(facility, offer, pageTitle);
    if (!titleBasis.ok) {
      return {
        ...base,
        status: "rejected",
        reason: titleBasis.reason,
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        asoview_base_url: asoviewBaseUrl || undefined,
      };
    }
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
      return {
        ...base,
        status: "rejected",
        reason: "missing_https_og_image",
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        asoview_base_url: asoviewBaseUrl || undefined,
      };
    }

    const imageResponse = await request(imageUrl, "image/avif,image/webp,image/*,*/*;q=0.5");
    if (!imageResponse.ok) {
      return {
        ...base,
        status: "rejected",
        reason: `image_http_${imageResponse.status}`,
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        source_image_url: imageUrl,
      };
    }
    const contentType = imageResponse.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return {
        ...base,
        status: "rejected",
        reason: `invalid_content_type:${contentType}`,
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        source_image_url: imageUrl,
      };
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    if (imageBuffer.length < MIN_BYTES) {
      return {
        ...base,
        status: "rejected",
        reason: `image_too_small_bytes:${imageBuffer.length}`,
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        source_image_url: imageUrl,
      };
    }
    const metadata = await sharp(imageBuffer).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < MIN_WIDTH ||
      metadata.height < MIN_HEIGHT
    ) {
      return {
        ...base,
        status: "rejected",
        reason: `image_dimensions_too_small:${metadata.width ?? 0}x${metadata.height ?? 0}`,
        page_title: pageTitle,
        canonical_url: canonicalUrl,
        source_image_url: imageUrl,
      };
    }
    return {
      ...base,
      status: "accepted",
      identity_basis: titleBasis.basis,
      page_title: pageTitle,
      canonical_url: canonicalUrl,
      asoview_base_url: asoviewBaseUrl || undefined,
      source_image_url: imageUrl,
      source_image_content_type: contentType,
      source_image_bytes: imageBuffer.length,
      source_image_width: metadata.width,
      source_image_height: metadata.height,
      source_image_sha256: createHash("sha256").update(imageBuffer).digest("hex"),
      image_buffer: imageBuffer,
    };
  } catch (error) {
    return {
      ...base,
      status: "rejected",
      reason: `request_or_decode_error:${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function request(url, accept) {
  const wait = Math.max(0, lastRequestAt + REQUEST_SPACING_MS - Date.now());
  if (wait) await new Promise((resolveDelay) => setTimeout(resolveDelay, wait));
  lastRequestAt = Date.now();
  return fetch(url, {
    redirect: "follow",
    headers: { Accept: accept, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(25_000),
  });
}

function offerIdentityIsCanonical(offer, facility) {
  return (
    offer.facility_id === facility.id &&
    offer.facility_slug === facility.slug &&
    offer.facility_name === facility.name &&
    typeof offer.verification?.same_facility_basis === "string" &&
    offer.verification.same_facility_basis.trim().length >= 6 &&
    typeof (offer.verification?.asoview_title ?? offer.verification?.rakuten_title) ===
      "string"
  );
}

function verifyLiveTitle(facility, offer, pageTitle) {
  const live = normalize(pageTitle);
  const verifiedTitle = normalize(
    offer.verification?.asoview_title ?? offer.verification?.rakuten_title ?? "",
  );
  const aliases = facilityAliases(facility.name);
  if (!live) return { ok: false, reason: "missing_live_page_title" };
  if (verifiedTitle.length >= 8 && (live.includes(verifiedTitle) || verifiedTitle.includes(live))) {
    return { ok: true, basis: "live_title_matches_curated_partner_title" };
  }
  const matchingAlias = aliases.find((alias) => alias.length >= 4 && live.includes(alias));
  if (matchingAlias) {
    return { ok: true, basis: `live_title_contains_canonical_alias:${matchingAlias}` };
  }
  return { ok: false, reason: "live_title_does_not_match_curated_identity" };
}

function facilityAliases(name) {
  const values = new Set([
    name,
    name.replace(/[（(][^）)]*[）)]/gu, ""),
    name.replace(/^(?:屋内型|体感型|全天候型)/u, ""),
  ]);
  return [...values].map(normalize).filter(Boolean);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function hasImage(facility) {
  return Boolean(
    (typeof facility.image === "string" && facility.image.trim()) ||
      (Array.isArray(facility.images) && facility.images.some(Boolean)),
  );
}

function isManagedPartnerImage(facility) {
  return [
    "asoview-official-partner",
    "rakuten-travel-experiences-official-partner",
  ].includes(facility.image_source);
}

function extractAsoviewBaseUrl(html, pageUrl) {
  const hrefs = [];
  for (const tag of html.match(/<a\b[^>]*>/giu) ?? []) {
    const href = extractAttribute(tag, "href");
    if (href && /(?:^|\/)(?:base)\/\d+\/?(?:$|[?#])/iu.test(href)) hrefs.push(href);
  }
  const href = hrefs[0];
  if (!href) return "";
  const url = new URL(href, pageUrl);
  if (url.hostname !== "www.asoview.com") return "";
  return url.href;
}

function compareOffers(left, right) {
  return (
    Number(left.partner !== "asoview") - Number(right.partner !== "asoview") ||
    left.url.localeCompare(right.url)
  );
}

function compareCandidates(left, right) {
  const leftPartners = new Set(left.offers.map((offer) => offer.partner)).size;
  const rightPartners = new Set(right.offers.map((offer) => offer.partner)).size;
  return rightPartners - leftPartners || left.facility.id - right.facility.id;
}

function attributionFor(accepted) {
  const label =
    accepted.partner === "asoview"
      ? "画像提供: アソビュー！"
      : "画像提供: 楽天トラベル観光体験";
  return `<a href="${escapeAttribute(accepted.canonical_url || accepted.offer_url)}" rel="noopener noreferrer" target="_blank">${label}</a>`;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function extractMeta(html, property) {
  for (const tag of html.match(/<meta\b[^>]*>/giu) ?? []) {
    const key = extractAttribute(tag, "property") || extractAttribute(tag, "name");
    if (key?.toLowerCase() === property.toLowerCase()) {
      return extractAttribute(tag, "content") ?? "";
    }
  }
  return "";
}

function extractCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/giu) ?? []) {
    if ((extractAttribute(tag, "rel") ?? "").toLowerCase() === "canonical") {
      return extractAttribute(tag, "href") ?? "";
    }
  }
  return "";
}

function extractAttribute(tag, attribute) {
  const match = tag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function extractTagText(html, tagName) {
  return html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "iu"))?.[1]?.trim() ?? "";
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

function parseArgs(argv) {
  const parsed = { apply: false, asOf: "2026-08-27", limit: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") parsed.apply = true;
    else if (value === "--as-of") parsed.asOf = argv[++index];
    else if (value === "--limit") parsed.limit = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (parsed.limit !== null && (!Number.isInteger(parsed.limit) || parsed.limit < 1)) {
    throw new Error("--limit must be a positive integer");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.asOf)) {
    throw new Error("--as-of must be YYYY-MM-DD");
  }
  return parsed;
}
