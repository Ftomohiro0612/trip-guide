import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRelatedFacilitySelector } from "../lib/related-facilities.mjs";

const root = new URL("../", import.meta.url);
const [audit, additions, facilities, ledger, asoviewActions, rakutenActions, mypageSource, guestSource, relatedSource] =
  await Promise.all([
    readJson("docs/audits/asoview-child-use-policy-rejudgment-2026-08-27.json"),
    readJson("scripts/data/asoview-child-use-policy-additions-2026-08-27.json"),
    readJson("data/facilities_data.json"),
    readJson("docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
    readJson("data/asoview_facility_actions.json"),
    readJson("data/rakuten_facility_actions.json"),
    readText("lib/mypage-recommendations.ts"),
    readText("lib/guest-record-recommendations.ts"),
    readText("lib/related-facilities.mjs"),
  ]);

assert.deepEqual(audit.policy.required_for_canon, [
  "identity",
  "address",
  "current_operation",
  "facility_ops_eligibility",
]);
assert.equal(audit.coverage.target_count, 538);
assert.equal(audit.coverage.completed_count, 538);
assert.equal(audit.reviews.length, 538);
assert.deepEqual(audit.coverage.final_status_counts, {
  ADD: 21,
  NOT_ELIGIBLE: 7,
  OFFICIAL_EVIDENCE_INSUFFICIENT: 510,
});
assert.deepEqual(audit.coverage.final_insufficiency_counts, {
  ADDRESS_INSUFFICIENT: 111,
  CURRENT_OPERATION_INSUFFICIENT: 24,
  MULTIPLE_EVIDENCE_INSUFFICIENT: 375,
});
assert.equal(additions.count, 21);
assert.equal(additions.additions.length, 21);
assert.ok(facilities.facilities.length >= audit.coverage.canon_after);
assert.equal(facilities.metadata.total_facilities, facilities.facilities.length);

const facilitiesById = new Map(facilities.facilities.map((facility) => [facility.id, facility]));
const ledgerByIdentity = new Map(ledger.identities.map((entry) => [entry.asoview_identity, entry]));
for (const review of audit.reviews) {
  assert.equal(review.review_complete, true);
  assert.ok(["confirmed", "unknown", "restricted", "not_allowed"].includes(review.child_use_metadata.status));
  const ledgerEntry = ledgerByIdentity.get(review.asoview_identity);
  assert.ok(ledgerEntry, `ledger entry missing: ${review.asoview_identity}`);
  assert.equal(ledgerEntry.status, review.final_status);
  if (review.final_status === "ADD") {
    for (const condition of ["identity", "address", "current_operation"]) {
      const evidence = review.evidence[condition];
      assert.equal(evidence.satisfied, true, `ADD lacks ${condition}: ${review.asoview_identity}`);
      assert.ok(evidence.url, `ADD lacks ${condition} URL: ${review.asoview_identity}`);
      assert.doesNotMatch(evidence.url, /asoview\.com/iu);
    }
    assert.equal(review.facility_ops_eligibility.satisfied, true);
    assert.ok(review.facility_ops_eligibility.basis);
    const facility = facilitiesById.get(ledgerEntry.added_facility?.id);
    assert.ok(facility, `canon facility missing: ${review.asoview_identity}`);
    assert.equal(facility.child_use_status, review.child_use_metadata.status);
    assert.equal(facility.child_fee, review.child_use_metadata.status === "unknown" ? "unknown" : "公式情報あり");
    assert.equal(facility.target_age, review.child_use_metadata.status === "unknown" ? "unknown" : "公式情報あり");
    assert.doesNotMatch(facility.description, /子ども(?:が)?利用可|子どもと家族|親子で/u);
  }
  if (review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT") {
    assert.ok(review.final_missing_conditions.length > 0);
    assert.ok(!review.final_missing_conditions.includes("child_use"));
    assert.ok(review.final_insufficiency_code);
  }
  if (review.final_status === "NOT_ELIGIBLE") {
    assert.equal(review.facility_ops_eligibility.satisfied, false);
    assert.ok(review.reason);
  }
}

const canonHash = createHash("sha256").update(JSON.stringify(facilities)).digest("hex");
for (const actions of [asoviewActions, rakutenActions]) {
  assert.equal(actions.coverage.facility_canon_count, facilities.facilities.length);
  assert.equal(actions.coverage.facility_canon_sha256, canonHash);
}
assert.equal(ledger.coverage.child_use_policy_rejudgment_target_count, 538);
assert.equal(ledger.coverage.child_use_policy_rejudgment_facilities_added, 21);
assert.equal(ledger.coverage.final_facility_canon_count, facilities.facilities.length);
assert.equal(ledger.coverage.final_facility_canon_sha256, canonHash);

assert.match(mypageSource, /isChildRecommendationEligible\(facility\)/u);
assert.match(guestSource, /isChildRecommendationEligible\(facility\)/u);
assert.match(relatedSource, /child_use_status !== "restricted"/u);
assert.match(relatedSource, /child_use_status !== "not_allowed"/u);

const relatedSelector = createRelatedFacilitySelector([
  { id: 1, prefecture_id: "tokyo", category_id: "museum", child_use_status: "confirmed" },
  { id: 2, prefecture_id: "tokyo", category_id: "museum", child_use_status: "restricted" },
  { id: 3, prefecture_id: "tokyo", category_id: "museum", child_use_status: "not_allowed" },
  { id: 4, prefecture_id: "tokyo", category_id: "museum", child_use_status: "unknown" },
]);
assert.deepEqual(
  relatedSelector({ id: 1, prefecture_id: "tokyo", category_id: "museum" }, 3).map((facility) => facility.id),
  [4],
);

console.log("Validated 538 child-use policy rejudgments, 21 canon additions, and recommendation guards.");

async function readJson(path) {
  return JSON.parse(await readText(path));
}

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}
