import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(
  await readFile(new URL("data/asoview_facility_actions.json", root), "utf8"),
);
const actionReviews = JSON.parse(
  await readFile(
    new URL(
      "docs/audits/asoview-facility-action-reviews-2026-08-26.json",
      root,
    ),
    "utf8",
  ),
);
const facilityDataRaw = await readFile(
  new URL("data/facilities_data.json", root),
);
const facilityData = JSON.parse(facilityDataRaw);

const facilitiesBySlug = new Map(
  facilityData.facilities.map((facility) => [facility.slug, facility]),
);
const seenFacilitySlugs = new Set();
const seenUrls = new Set();
const allowedActionTypes = new Set(["ticket", "reservation", "experience"]);

assert.equal(registry.schema_version, 1, "unsupported registry schema");
assert.ok(Array.isArray(registry.offers), "offers must be an array");
assert.equal(
  registry.coverage?.facility_canon_count,
  facilityData.facilities.length,
  "coverage does not include the current facility canon",
);
assert.equal(
  registry.coverage?.facility_canon_sha256,
  createHash("sha256").update(JSON.stringify(facilityData)).digest("hex"),
  "facility canon changed after the Asoview coverage audit",
);
assert.match(
  registry.coverage?.audited_at,
  /^\d{4}-\d{2}-\d{2}$/,
  "invalid coverage audit date",
);
assert.equal(
  registry.coverage?.asoview_public_page_count,
  registry.coverage?.asoview_activity_page_count +
    registry.coverage?.asoview_ticket_page_count +
    registry.coverage?.asoview_base_page_count,
  "Asoview public catalog counts do not reconcile",
);
assert.equal(
  registry.coverage?.asoview_public_page_count,
  registry.coverage?.asoview_actionable_public_page_count +
    registry.coverage?.asoview_terminal_unavailable_page_count,
  "actionable and terminal-unavailable Asoview outcomes do not reconcile",
);
assert.ok(
  registry.coverage?.asoview_activity_page_count > 0 &&
    registry.coverage?.asoview_ticket_page_count > 0 &&
    registry.coverage?.asoview_base_page_count > 0 &&
    registry.coverage?.candidate_facility_count > 0 &&
    registry.coverage?.reviewed_unique_product_count > 0,
  "coverage evidence is incomplete",
);
assert.equal(
  registry.coverage?.reverse_discovery_prefilter_identity_count,
  registry.coverage?.reverse_discovery_identity_count +
    registry.coverage?.reverse_discovery_no_family_signal_count,
  "reverse discovery identity prefilter does not reconcile",
);
assert.ok(registry.offers.length > 0, "no reviewed Asoview offers are published");
assert.equal(
  actionReviews.source_catalog_complete,
  true,
  "action review audit is not based on a complete catalog",
);
assert.equal(
  actionReviews.item_count,
  actionReviews.items.length,
  "action review audit count does not reconcile",
);
const publishedReviews = actionReviews.items.filter(
  (item) => item.publication_disposition === "PUBLISHED",
);
assert.equal(
  publishedReviews.length,
  registry.offers.length,
  "published action review count does not match registry",
);
for (const review of publishedReviews) {
  assert.ok(
    hasStrongIdentity(review),
    `published review lacks strong product identity: ${review.facility_slug}`,
  );
}

for (const offer of registry.offers) {
  assert.ok(
    !seenFacilitySlugs.has(offer.facility_slug),
    `duplicate facility offer: ${offer.facility_slug}`,
  );
  seenFacilitySlugs.add(offer.facility_slug);

  const facility = facilitiesBySlug.get(offer.facility_slug);
  assert.ok(facility, `unknown facility slug: ${offer.facility_slug}`);
  assert.equal(
    offer.facility_id,
    facility.id,
    `facility id mismatch: ${offer.facility_slug}`,
  );
  assert.equal(
    offer.facility_name,
    facility.name,
    `facility name mismatch: ${offer.facility_slug}`,
  );
  assert.ok(
    allowedActionTypes.has(offer.action_type),
    `unsupported action type: ${offer.facility_slug}`,
  );
  assert.match(
    offer.label,
    /^アソビューで.+(?:見る|探す|予約する|購入する)$/,
    `reader-facing label is unclear: ${offer.facility_slug}`,
  );
  assert.doesNotMatch(
    offer.label,
    /最安|公式より(?:安い|お得)/,
    `unsubstantiated price comparison: ${offer.facility_slug}`,
  );
  assert.match(
    offer.verified_at,
    /^\d{4}-\d{2}-\d{2}$/,
    `invalid verified_at: ${offer.facility_slug}`,
  );

  assert.match(
    offer.display_through,
    /^\d{4}-\d{2}-\d{2}$/,
    `missing or invalid display_through: ${offer.facility_slug}`,
  );
  const reviewWindowDays =
    (Date.parse(`${offer.display_through}T00:00:00Z`) -
      Date.parse(`${offer.verified_at}T00:00:00Z`)) /
    86_400_000;
  assert.ok(
    reviewWindowDays >= 0 && reviewWindowDays <= 30,
    `display window exceeds the 30-day fail-closed limit: ${offer.facility_slug}`,
  );

  const url = new URL(offer.url);
  assert.equal(url.protocol, "https:", `non-HTTPS URL: ${offer.facility_slug}`);
  assert.equal(
    url.hostname,
    "www.asoview.com",
    `non-approved Asoview host: ${offer.facility_slug}`,
  );
  assert.match(
    url.pathname,
    /^\/(?:item\/(?:ticket\/ticket\d+|activity\/pln\d+)|base\/\d+)\/$/,
    `URL is not a direct Asoview item/facility page: ${offer.facility_slug}`,
  );
  assert.equal(url.search, "", `tracking/search query found: ${offer.facility_slug}`);
  assert.equal(url.hash, "", `URL hash found: ${offer.facility_slug}`);
  assert.ok(!seenUrls.has(url.href), `duplicate offer URL: ${url.href}`);
  seenUrls.add(url.href);
  assert.ok(
    publishedReviews.some(
      (review) =>
        review.facility_slug === offer.facility_slug && review.url === offer.url,
    ),
    `published offer lacks its exact action review: ${offer.facility_slug}`,
  );

  assert.ok(
    offer.verification?.asoview_title &&
      offer.verification?.same_facility_basis &&
      offer.verification?.availability_basis,
    `verification evidence is incomplete: ${offer.facility_slug}`,
  );
  assert.doesNotMatch(
    offer.verification.asoview_title,
    /完売|売り切れ|SOLD\s*OUT|特別展|企画展|期間限定|イベント|花火|ナイト(?:パス|チケット)?|コンサート|公演|夏休み|冬休み|クリスマス|コラボ|シーズン券|限定|キャンペーン|サンクスデー|WELCOMEデー|県民|早割|周遊|エリアパスポート|人気スポット\d+施設|共通(?:入園)?券|セット券|セットチケット|乗車券|食事券?付|バスセット|電車セット|Subway|複数施設|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日|20\d{2}年/iu,
    `temporary or bundled Asoview product escaped fail-closed filtering: ${offer.facility_slug}`,
  );
  assert.doesNotMatch(
    offer.facility_name,
    /^(?:イオンモール|三井ショッピングパーク|ららぽーと|[^\s]+アウトレット)/u,
    `tenant product was attached to a retail-complex canon: ${offer.facility_slug}`,
  );

  if (/\d[\d,]*(?:円|%)(?:引き|OFF)/i.test(offer.label)) {
    assert.ok(
      offer.verification?.discount_basis,
      `discount label lacks current Asoview evidence: ${offer.facility_slug}`,
    );
  }
}

console.log(`Validated ${registry.offers.length} exact-match Asoview actions.`);

function hasStrongIdentity(item) {
  const facility = normalizeIdentity(item.facility_name);
  const product = normalizeIdentity(`${item.title} ${item.description}`);
  const provider = normalizeIdentity(item.provider_identity);
  return (
    facility.length >= 4 &&
    (product.includes(facility) ||
      (provider.length >= 4 &&
        (provider.includes(facility) || facility.includes(provider))))
  );
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}
