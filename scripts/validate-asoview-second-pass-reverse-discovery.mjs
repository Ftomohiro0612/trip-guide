import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [audit, additions, ledger, facilityData, rakutenActions, asoviewActions] =
  await Promise.all([
    readJson("docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json"),
    readJson("scripts/data/asoview-second-pass-additions-2026-08-27.json"),
    readJson("docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
    readJson("data/facilities_data.json"),
    readJson("data/rakuten_facility_actions.json"),
    readJson("data/asoview_facility_actions.json"),
  ]);

const expectedInitialCounts = {
  ADDRESS_INSUFFICIENT: 415,
  CHILD_USE_INSUFFICIENT: 5,
  CURRENT_OPERATION_INSUFFICIENT: 8,
  IDENTITY_INSUFFICIENT: 19,
  MULTIPLE_EVIDENCE_INSUFFICIENT: 294,
};
assert.equal(audit.coverage.target_count, 741);
assert.equal(audit.coverage.completed_count, 741);
assert.equal(audit.coverage.pending_count, 0);
assert.equal(audit.reviews.length, 741);
assert.deepEqual(audit.coverage.initial_insufficiency_counts, expectedInitialCounts);
assert.equal(sum(Object.values(expectedInitialCounts)), 741);
assert.equal(sum(Object.values(audit.coverage.final_status_counts)), 741);

const allowedStatuses = new Set([
  "ADD",
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
]);
const conditions = ["identity", "address", "current_operation", "child_use"];
const allowedRecommendedTags = new Set([
  "animal", "animal_contact", "animal_feed", "water_play", "pool",
  "playground", "athletic", "slide", "running", "wide_space", "vehicle",
  "craft", "experience", "exhibition", "science", "space", "dinosaur",
  "character", "nature", "food",
]);
const reviewIdentities = new Set();
for (const review of audit.reviews) {
  assert.ok(review.review_complete, `incomplete review: ${review.asoview_identity}`);
  assert.ok(allowedStatuses.has(review.final_status), `invalid status: ${review.asoview_identity}`);
  assert.ok(!reviewIdentities.has(review.asoview_identity), `duplicate review: ${review.asoview_identity}`);
  reviewIdentities.add(review.asoview_identity);
  if (review.final_status === "ADD") {
    for (const condition of conditions) {
      const evidence = review.evidence?.[condition];
      assert.ok(evidence?.satisfied, `ADD lacks ${condition}: ${review.asoview_identity}`);
      assert.ok(evidence.url, `ADD lacks ${condition} URL: ${review.asoview_identity}`);
      assert.doesNotMatch(evidence.url, /asoview\.com/iu, `Asoview used as canon evidence: ${review.asoview_identity}`);
      assert.match(
        evidence.source_type,
        /^(?:facility_or_operator_official|government_or_public_operator_official|official_linked_booking_or_ticket_page|official_pdf)$/u,
        `non-primary evidence type: ${review.asoview_identity}`,
      );
    }
    assert.ok(review.evidence.address.value, `ADD lacks address value: ${review.asoview_identity}`);
    assert.ok(review.evidence.current_operation.excerpt, `ADD lacks current-operation excerpt: ${review.asoview_identity}`);
    assert.ok(review.evidence.child_use.excerpt, `ADD lacks child-use excerpt: ${review.asoview_identity}`);
  }
  if (review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT") {
    assert.ok(review.final_missing_conditions?.length, `missing unresolved conditions: ${review.asoview_identity}`);
    assert.ok(review.final_insufficiency_code, `missing insufficiency code: ${review.asoview_identity}`);
  }
  if (review.final_status === "DUPLICATE") {
    const target = facilityData.facilities.find(
      (facility) => facility.id === review.duplicate_match?.facility_id,
    );
    assert.ok(target, `duplicate canon target missing: ${review.asoview_identity}`);
  }
  if (review.final_status === "NOT_ELIGIBLE") {
    assert.ok(review.not_eligible_basis?.category, `not-eligible basis missing: ${review.asoview_identity}`);
  }
}

assert.equal(additions.count, audit.coverage.final_status_counts.ADD);
assert.equal(additions.additions.length, additions.count);
const ledgerByIdentity = new Map(
  ledger.identities.map((entry) => [entry.asoview_identity, entry]),
);
for (const addition of additions.additions) {
  assert.ok(reviewIdentities.has(addition.asoview_identity));
  assert.doesNotMatch(addition.url, /asoview\.com/iu);
  assert.ok(Number.isFinite(addition.latitude) && Number.isFinite(addition.longitude));
  for (const condition of conditions) {
    assert.ok(addition.source_evidence?.[condition]?.satisfied);
  }
  const ledgerEntry = ledgerByIdentity.get(addition.asoview_identity);
  assert.equal(ledgerEntry?.status, "ADD");
  const facility = facilityData.facilities.find(
    (entry) => entry.id === ledgerEntry.added_facility?.id,
  );
  assert.ok(facility, `canon ADD missing: ${addition.asoview_identity}`);
  assert.equal(facility.name, addition.name);
  assert.equal(facility.address, addition.address);
  assert.equal(facility.url, addition.url);
  assert.equal(facility.data_quality_status, "confirmed");
  assert.equal(facility.source_checked_at, "2026-08-27");
  assert.ok(
    facility.recommended_for_tags.every((tag) => allowedRecommendedTags.has(tag)),
    `invalid recommended tag: ${addition.asoview_identity}`,
  );
}

assert.equal(ledger.coverage.second_pass_target_count, 741);
assert.deepEqual(
  ledger.coverage.second_pass_initial_insufficiency_counts,
  expectedInitialCounts,
);
assert.deepEqual(
  ledger.coverage.second_pass_final_status_counts,
  audit.coverage.final_status_counts,
);
assert.equal(ledger.coverage.canon_before_second_pass, 5051);
assert.equal(ledger.coverage.second_pass_facilities_added, additions.count);
assert.equal(ledger.coverage.final_facility_canon_count, 5051 + additions.count);
assert.equal(facilityData.metadata.total_facilities, facilityData.facilities.length);
assert.equal(facilityData.facilities.length, 5208);
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
assert.equal(ledger.coverage.final_facility_canon_sha256, canonHash);
assert.equal(rakutenActions.coverage.facility_canon_count, 5208);
assert.equal(rakutenActions.coverage.facility_canon_sha256, canonHash);
assert.equal(asoviewActions.coverage.facility_canon_count, 5208);
assert.equal(asoviewActions.coverage.facility_canon_sha256, canonHash);
assert.equal(asoviewActions.coverage.reverse_discovery_second_pass_count, 741);
assert.equal(asoviewActions.coverage.reverse_discovery_second_pass_add_count, additions.count);

console.log(
  `Validated all 741 Asoview reverse-discovery second-pass reviews and ${additions.count} canon additions.`,
);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
