import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRelatedFacilitySelector } from "../lib/related-facilities.mjs";

const root = new URL("../", import.meta.url);
const [audit, additions, facilities, ledger, rakutenActions, asoviewActions, asoviewLedger] =
  await Promise.all([
    readJson("docs/audits/rakuten-child-use-policy-rejudgment-2026-08-27.json"),
    readJson("scripts/data/rakuten-child-use-policy-additions-2026-08-27.json"),
    readJson("data/facilities_data.json"),
    readJson("docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json"),
    readJson("data/rakuten_facility_actions.json"),
    readJson("data/asoview_facility_actions.json"),
    readJson("docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
  ]);

assert.deepEqual(audit.policy.required_for_canon, [
  "identity",
  "address",
  "current_operation",
  "facility_ops_eligibility",
]);
assert.equal(audit.coverage.target_count, 14);
assert.equal(audit.coverage.completed_count, 14);
assert.equal(audit.reviews.length, 14);
assert.deepEqual(audit.coverage.previous_insufficiency_counts, {
  CHILD_USE_ONLY: 2,
  CURRENT_OPERATION_INSUFFICIENT: 1,
  IDENTITY_INSUFFICIENT: 4,
  MULTIPLE_EVIDENCE_INSUFFICIENT: 7,
});
assert.deepEqual(audit.coverage.final_status_counts, {
  ADD: 6,
  NOT_ELIGIBLE: 5,
  OFFICIAL_EVIDENCE_INSUFFICIENT: 3,
});
assert.deepEqual(audit.coverage.final_insufficiency_counts, {
  IDENTITY_INSUFFICIENT: 3,
});
assert.deepEqual(audit.coverage.child_use_metadata_counts, {
  confirmed: 7,
  not_allowed: 1,
  restricted: 2,
  unknown: 4,
});
assert.equal(audit.coverage.added_child_use_unknown_count, 1);
assert.equal(additions.count, 6);
assert.equal(additions.additions.length, 6);
assert.equal(facilities.facilities.length, 5235);
assert.equal(facilities.metadata.total_facilities, 5235);

const facilitiesByName = new Map(facilities.facilities.map((facility) => [facility.name, facility]));
const ledgerById = new Map(ledger.identities.map((entry) => [entry.candidate_id, entry]));
const offersBySlug = new Map(rakutenActions.offers.map((offer) => [offer.facility_slug, offer]));
for (const review of audit.reviews) {
  assert.equal(review.review_complete, true);
  assert.ok(["confirmed", "unknown", "restricted", "not_allowed"].includes(review.child_use_metadata.status));
  assert.equal(ledgerById.get(review.candidate_id)?.status, review.final_status);
  if (review.final_status === "ADD") {
    for (const condition of ["identity", "address", "current_operation"]) {
      assert.equal(review.evidence[condition].satisfied, true, `ADD lacks ${condition}: ${review.candidate_id}`);
      assert.ok(review.evidence[condition].url, `ADD lacks ${condition} URL: ${review.candidate_id}`);
      assert.doesNotMatch(review.evidence[condition].url, /rakuten\.(?:co\.jp|com)/iu);
    }
    assert.equal(review.facility_ops_eligibility.satisfied, true);
    const addition = additions.additions.find((entry) => entry.candidate_id === review.candidate_id);
    assert.ok(addition, `addition missing: ${review.candidate_id}`);
    const facility = facilitiesByName.get(addition.name);
    assert.ok(facility, `canon facility missing: ${addition.name}`);
    assert.equal(facility.child_use_status, review.child_use_metadata.status);
    assert.ok(offersBySlug.has(facility.slug), `Rakuten offer missing: ${facility.slug}`);
  }
  if (review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT") {
    assert.ok(review.final_missing_conditions.length > 0);
    assert.ok(!review.final_missing_conditions.includes("child_use"));
    assert.equal(review.final_insufficiency_code, "IDENTITY_INSUFFICIENT");
  }
  if (review.final_status === "NOT_ELIGIBLE") {
    assert.equal(review.facility_ops_eligibility.satisfied, false);
  }
}

assert.deepEqual(ledger.coverage.final_status_counts, {
  ADD: 128,
  DUPLICATE: 80,
  NOT_ELIGIBLE: 439,
  RAKUTEN_DETAIL_UNAVAILABLE: 196,
  OFFICIAL_EVIDENCE_INSUFFICIENT: 3,
});
assert.equal(
  ledger.identities.filter((entry) => entry.status === "RAKUTEN_DETAIL_UNAVAILABLE").length,
  196,
);
assert.equal(rakutenActions.coverage.reverse_discovery_add_count, 128);
assert.equal(rakutenActions.coverage.reverse_discovery_followup_add_count, 93);
assert.equal(rakutenActions.coverage.reverse_discovery_child_use_policy_rejudgment_count, 14);
assert.equal(rakutenActions.coverage.reverse_discovery_child_use_policy_add_count, 6);
assert.equal(rakutenActions.offers.length, 255);

const canonHash = createHash("sha256").update(JSON.stringify(facilities)).digest("hex");
for (const actions of [rakutenActions, asoviewActions]) {
  assert.equal(actions.coverage.facility_canon_count, facilities.facilities.length);
  assert.equal(actions.coverage.facility_canon_sha256, canonHash);
}
for (const discoveryLedger of [ledger, asoviewLedger]) {
  assert.equal(discoveryLedger.coverage.final_facility_canon_count, facilities.facilities.length);
  assert.equal(discoveryLedger.coverage.final_facility_canon_sha256, canonHash);
}

const restricted = facilitiesByName.get("ラ・ロイヤル・スパ");
const notAllowed = facilitiesByName.get("スカイリゾートスパ「プラウブラン」");
assert.equal(restricted.child_use_status, "restricted");
assert.equal(notAllowed.child_use_status, "not_allowed");
const selector = createRelatedFacilitySelector([
  { id: 1, prefecture_id: "hokkaido", category_id: "hot-spring-pool", child_use_status: "confirmed" },
  restricted,
  notAllowed,
  { id: 2, prefecture_id: "hokkaido", category_id: "hot-spring-pool", child_use_status: "unknown" },
]);
assert.deepEqual(
  selector({ id: 1, prefecture_id: "hokkaido", category_id: "hot-spring-pool" }, 4).map((facility) => facility.id),
  [2],
);

console.log("Validated all 14 Rakuten child-use policy rejudgments, 6 canon additions, and recommendation guards.");

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}
