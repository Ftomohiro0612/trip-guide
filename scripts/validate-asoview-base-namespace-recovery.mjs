#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [coverage, facilityOps, offers, additions, ledger, facilityData, asoviewActions, rakutenActions] =
  await Promise.all([
    readJson("docs/audits/asoview-base-namespace-coverage-2026-08-28.json"),
    readJson("docs/audits/asoview-base-namespace-facilityops-2026-08-28.json"),
    readJson("docs/audits/asoview-base-namespace-offers-2026-08-28.json"),
    readJson("scripts/data/asoview-base-namespace-additions-2026-08-28.json"),
    readJson("docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
    readJson("data/facilities_data.json"),
    readJson("data/asoview_facility_actions.json"),
    readJson("data/rakuten_facility_actions.json"),
  ]);

assert.equal(coverage.coverage.scan_complete, true);
assert.equal(coverage.source_manifest.namespace_min_id, 1);
assert.equal(
  coverage.source_manifest.namespace_id_count,
  coverage.source_manifest.namespace_max_id,
);
assert.equal(
  coverage.coverage.off_sitemap_scan_target_id_count,
  coverage.source_manifest.namespace_id_count -
    coverage.source_manifest.sitemap_covered_id_count,
);
assert.equal(
  coverage.coverage.off_sitemap_terminal_result_count,
  coverage.coverage.off_sitemap_scan_target_id_count,
);
assert.equal(
  coverage.coverage.extracted_identity_count,
  coverage.identities.length,
);
assert.equal(
  coverage.coverage.recovered_family_candidate_count,
  coverage.recovered_family_candidates.length,
);

const nagashima = coverage.identities.find(
  (identity) => identity.normalized_identity === normalize("ナガシマスパーランド"),
);
assert.ok(nagashima, "base/155456 was not recovered");
assert.equal(nagashima.coverage_disposition, "DUPLICATE");
assert.ok(
  nagashima.asoview_pages.some(
    (page) => page.id === 155456 && page.in_base_sitemap === false,
  ),
  "base/155456 is not recorded as an off-sitemap recovery",
);
assert.ok(
  nagashima.canon_matches.some(
    (match) => match.facility_id === 7510 && match.basis === "normalized_exact",
  ),
  "Nagashima did not resolve to canon facility 7510",
);

assert.equal(
  facilityOps.coverage.target_count,
  coverage.coverage.facilityops_review_required_count,
);
assert.equal(facilityOps.coverage.pending_count, 0);
assert.equal(
  facilityOps.coverage.completed_count,
  facilityOps.coverage.target_count,
);
assert.equal(facilityOps.reviews.length, facilityOps.coverage.target_count);
assert.equal(
  sum(Object.values(facilityOps.coverage.final_status_counts)),
  facilityOps.coverage.target_count,
);
const reviewByIdentity = new Map(
  facilityOps.reviews.map((review) => [normalize(review.asoview_identity), review]),
);
assert.equal(reviewByIdentity.size, facilityOps.reviews.length);
for (const candidate of coverage.facilityops_review_candidates) {
  const review = reviewByIdentity.get(normalize(candidate.asoview_identity));
  assert.ok(review?.review_complete, `review missing: ${candidate.asoview_identity}`);
  assert.ok(
    ["ADD", "DUPLICATE", "NOT_ELIGIBLE", "OFFICIAL_EVIDENCE_INSUFFICIENT"].includes(
      review.final_status,
    ),
    `invalid final status: ${candidate.asoview_identity}`,
  );
  if (review.final_status === "ADD") {
    for (const condition of ["identity", "address", "current_operation"]) {
      const evidence = review.evidence?.[condition];
      assert.ok(evidence?.satisfied, `ADD lacks ${condition}: ${candidate.asoview_identity}`);
      assert.ok(evidence.url);
      assert.doesNotMatch(evidence.url, /asoview\.com/iu);
    }
  }
  if (review.final_status === "DUPLICATE") {
    assert.ok(
      facilityData.facilities.some(
        (facility) => facility.id === review.duplicate?.facility_id,
      ),
      `duplicate canon target missing: ${candidate.asoview_identity}`,
    );
  }
  if (review.final_status === "NOT_ELIGIBLE") {
    assert.ok(
      review.not_eligible_basis?.category,
      `not-eligible basis missing: ${candidate.asoview_identity}`,
    );
  }
  if (review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT") {
    assert.ok(
      review.final_missing_conditions?.length,
      `insufficient review lacks missing conditions: ${candidate.asoview_identity}`,
    );
  }
}

assert.equal(additions.count, facilityOps.coverage.final_status_counts.ADD);
assert.equal(additions.additions.length, additions.count);
const additionIdentitySet = new Set(
  additions.additions.map((addition) => normalize(addition.asoview_identity)),
);
assert.equal(additionIdentitySet.size, additions.count);
for (const review of facilityOps.reviews.filter(
  (entry) => entry.final_status === "ADD",
)) {
  assert.ok(additionIdentitySet.has(normalize(review.asoview_identity)));
}
for (const addition of additions.additions) {
  const { facility } = addition;
  assert.ok(
    facility.address.startsWith(facility.prefecture),
    `address does not start with the resolved prefecture: ${addition.asoview_identity}`,
  );
  assert.doesNotMatch(
    facility.address,
    /(?:〒|市内中心部|このページに関するお問い合わせ|別ウィンドウ)/u,
    `address contains postal or access-page boilerplate: ${addition.asoview_identity}`,
  );
  assert.ok(
    facility.address.length <= 80,
    `address contains likely trailing page content: ${addition.asoview_identity}`,
  );
  const summary = normalizeProse(facility.unique_selling_point);
  const description = normalizeProse(facility.description);
  const sentenceCount = facility.unique_selling_point
    .split(/[。！？]/u)
    .filter(Boolean).length;
  assert.ok(
    sentenceCount >= 1 && sentenceCount <= 2,
    `hero summary is not 1-2 sentences: ${addition.asoview_identity}`,
  );
  assert.ok(
    !summary.includes(description) && !description.includes(summary),
    `summary and description repeat: ${addition.asoview_identity}`,
  );
  assert.doesNotMatch(
    facility.description,
    /(?:〒|営業時間|開館時間|開園時間|入館料|入園料|利用料金|\d[\d,]*円|対象年齢|公式(?:サイト|案内)?で?確認)/u,
    `description repeats structured UI content: ${addition.asoview_identity}`,
  );
}

const recoveryLedgerEntries = ledger.identities.filter(
  (identity) => identity.coverage_recovery?.cause === "OFF_SITEMAP_BASE_PAGE_NOT_INGESTED",
);
assert.equal(
  recoveryLedgerEntries.length,
  coverage.coverage.recovered_family_candidate_count,
);
const ledgerByNormalized = new Map(
  ledger.identities.map((identity) => [identity.normalized_identity, identity]),
);
for (const candidate of coverage.recovered_family_candidates) {
  const entry = ledgerByNormalized.get(candidate.normalized_identity);
  assert.ok(entry, `recovered candidate absent from ledger: ${candidate.asoview_identity}`);
  assert.notEqual(entry.status, "PENDING");
  if (entry.status === "ADD") {
    const facility = facilityData.facilities.find(
      (item) => item.id === entry.added_facility?.id,
    );
    assert.ok(facility, `canon ADD missing: ${candidate.asoview_identity}`);
    assert.equal(normalize(facility.name), normalize(entry.added_facility.name));
    assert.equal(facility.source_checked_at, "2026-08-28");
    assert.doesNotMatch(facility.url, /asoview\.com/iu);
  }
}

assert.equal(
  facilityData.facilities.length,
  5_237 + additions.count,
);
assert.equal(facilityData.metadata.total_facilities, facilityData.facilities.length);
assert.equal(
  sum(facilityData.metadata.prefectures.map((entry) => entry.count)),
  facilityData.facilities.length,
);
assert.equal(
  sum(facilityData.metadata.categories.map((entry) => entry.count)),
  facilityData.facilities.length,
);
const canonHash = createHash("sha256")
  .update(JSON.stringify(facilityData))
  .digest("hex");
assert.equal(ledger.coverage.final_facility_canon_count, facilityData.facilities.length);
assert.equal(ledger.coverage.final_facility_canon_sha256, canonHash);
for (const actions of [asoviewActions, rakutenActions]) {
  assert.equal(actions.coverage.facility_canon_count, facilityData.facilities.length);
  assert.equal(actions.coverage.facility_canon_sha256, canonHash);
}
assert.equal(
  asoviewActions.coverage.base_namespace_off_sitemap_scan_count,
  coverage.coverage.off_sitemap_scan_target_id_count,
);
assert.equal(
  asoviewActions.coverage.base_namespace_recovered_family_candidate_count,
  coverage.coverage.recovered_family_candidate_count,
);
assert.equal(
  asoviewActions.coverage.base_namespace_facilityops_add_count,
  additions.count,
);
assert.equal(
  asoviewActions.offers.length,
  658 + asoviewActions.coverage.base_namespace_action_add_count,
  "Asoview action total does not match the pre-recovery baseline plus audited additions",
);
assert.equal(
  asoviewActions.coverage.reverse_discovery_prefilter_identity_count,
  asoviewActions.coverage.reverse_discovery_identity_count +
    asoviewActions.coverage.reverse_discovery_no_family_signal_count,
);

assert.equal(
  offers.coverage.eligible_identity_count,
  coverage.recovered_family_candidates.filter((candidate) => {
    if (candidate.coverage_disposition === "DUPLICATE") return true;
    const review = reviewByIdentity.get(normalize(candidate.asoview_identity));
    return review && ["ADD", "DUPLICATE"].includes(review.final_status);
  }).length,
);
assert.equal(offers.reviews.length, offers.coverage.eligible_identity_count);
for (const review of offers.reviews) {
  for (const product of review.valid_individual_products) {
    assert.equal(product.public_and_available, true);
    assert.equal(product.disallowed_product_matched, false);
    assert.match(product.canonical_url, /asoview\.com\/item\/(?:ticket|activity)\//iu);
  }
}
const validProductUrls = new Set(
  offers.reviews.flatMap((review) =>
    review.valid_individual_products.map((product) => product.canonical_url),
  ),
);
const recoveryActions = asoviewActions.offers.filter((offer) =>
  offer.verification?.same_facility_basis?.includes("回収provider page"),
);
assert.equal(
  recoveryActions.length,
  asoviewActions.coverage.base_namespace_action_add_count,
  "recorded recovery action count does not match the emitted recovery offers",
);
for (const offer of recoveryActions) {
  assert.ok(
    validProductUrls.has(offer.url),
    `recovery CTA was not approved by the offer audit: ${offer.url}`,
  );
}

console.log(
  `Validated exhaustive Asoview base namespace recovery, ${facilityOps.coverage.target_count} FacilityOps reviews, and ${additions.count} canon additions.`,
);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeProse(value) {
  return String(value ?? "").normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "");
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
