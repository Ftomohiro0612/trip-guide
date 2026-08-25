import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const registry = JSON.parse(
  await readFile(new URL("data/rakuten_facility_actions.json", root), "utf8"),
);
const facilityDataRaw = await readFile(
  new URL("data/facilities_data.json", root),
);
const facilityData = JSON.parse(facilityDataRaw);

const facilitiesBySlug = new Map(
  facilityData.facilities.map((facility) => [facility.slug, facility]),
);
const seenFacilitySlugs = new Set();
const allowedActionTypes = new Set([
  "coupon",
  "ticket",
  "reservation",
  "experience",
]);

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
  "facility canon changed after the Rakuten coverage audit",
);
assert.match(
  registry.coverage?.audited_at,
  /^\d{4}-\d{2}-\d{2}$/,
  "invalid coverage audit date",
);
assert.ok(
  registry.coverage?.rakuten_japan_product_count > 0 &&
    registry.coverage?.candidate_facility_count > 0 &&
    registry.coverage?.reviewed_unique_product_count > 0,
  "coverage evidence is incomplete",
);

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
    /^楽天(?:で|ポイント|限定).+(見る|探す|予約する|購入する)$/,
    `reader-facing label is unclear: ${offer.facility_slug}`,
  );
  assert.doesNotMatch(
    offer.label,
    /最安|公式より(?:安|お得)/,
    `unsubstantiated price comparison: ${offer.facility_slug}`,
  );
  assert.match(
    offer.verified_at,
    /^\d{4}-\d{2}-\d{2}$/,
    `invalid verified_at: ${offer.facility_slug}`,
  );

  if (offer.display_through) {
    assert.match(
      offer.display_through,
      /^\d{4}-\d{2}-\d{2}$/,
      `invalid display_through: ${offer.facility_slug}`,
    );
  }

  const url = new URL(offer.url);
  assert.equal(url.protocol, "https:", `non-HTTPS URL: ${offer.facility_slug}`);
  assert.equal(
    url.hostname,
    "experiences.travel.rakuten.co.jp",
    `non-approved Rakuten host: ${offer.facility_slug}`,
  );
  assert.match(
    url.pathname,
    /^\/experiences\/\d+$/,
    `URL is not a direct experience page: ${offer.facility_slug}`,
  );
  assert.equal(url.search, "", `tracking/search query found: ${offer.facility_slug}`);
  assert.equal(url.hash, "", `URL hash found: ${offer.facility_slug}`);

  assert.ok(
    offer.verification?.rakuten_title &&
      offer.verification?.same_facility_basis &&
      offer.verification?.availability_basis,
    `verification evidence is incomplete: ${offer.facility_slug}`,
  );
}

console.log(`Validated ${registry.offers.length} exact-match Rakuten actions.`);
