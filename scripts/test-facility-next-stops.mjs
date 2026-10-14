import assert from "node:assert/strict";
import test from "node:test";
import facilitiesData from "../data/facilities_data.json" with { type: "json" };
import {
  createFacilityNextStopSelector,
  NEXT_STOP_LIMIT,
  NEXT_STOP_RADIUS_STEPS_KM,
} from "../lib/facility-next-stops.mjs";
import {
  createFacilityPageLinkSelector,
  createRelatedFacilitySelector,
} from "../lib/related-facilities.mjs";

const visibleFacilities = facilitiesData.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const discoverableFacilities = visibleFacilities.filter(
  (facility) => facility.closure_status !== "permanently_closed",
);
const selectNextStops = createFacilityNextStopSelector(discoverableFacilities);

const samples = [
  { kind: "urban Tokyo", slug: "facility-221" },
  { kind: "rural Hokkaido", slug: "facility-3860" },
  { kind: "island / remote", slug: "facility-6042" },
  { kind: "nearest four are same-category", slug: "facility-2989" },
  { kind: "target_age unknown", slug: "facility-7493" },
];

test("next-stop candidates are deterministic, eligible, and locally bounded", () => {
  const report = samples.map(({ kind, slug }) => {
    const source = visibleFacilities.find((facility) => facility.slug === slug);
    assert(source, `${slug}: sample must exist`);
    if (kind === "target_age unknown") assert.equal(source.target_age, "unknown");

    const first = selectNextStops(source);
    const second = selectNextStops(source);
    assert.deepEqual(second, first, `${slug}: selector must be deterministic`);
    assert(NEXT_STOP_RADIUS_STEPS_KM.includes(first.radiusKm));
    assert(first.candidates.length <= NEXT_STOP_LIMIT);
    assert.equal(
      new Set(first.candidates.map(({ facility }) => facility.id)).size,
      first.candidates.length,
    );

    for (const candidate of first.candidates) {
      assert.notEqual(candidate.facility.id, source.id);
      assert.notEqual(candidate.facility.data_quality_status, "exclude_candidate");
      assert.equal(candidate.facility.closure_status, undefined);
      assert.notEqual(candidate.facility.child_use_status, "restricted");
      assert.notEqual(candidate.facility.child_use_status, "not_allowed");
      assert(candidate.distanceKm <= first.radiusKm);
    }

    return {
      kind,
      source: `${source.name} (${source.slug})`,
      radiusKm: first.radiusKm,
      candidates: first.candidates.map((candidate, index) => ({
        rank: index + 1,
        name: candidate.facility.name,
        category: candidate.facility.category,
        distanceKm: Number(candidate.distanceKm.toFixed(2)),
        why: candidate.reasons,
      })),
    };
  });

  console.log(JSON.stringify({ samples: report }, null, 2));
});

test("SEO P1b plain-link graph preserves zero inbound orphans", () => {
  const selectBaseline = createRelatedFacilitySelector(discoverableFacilities);
  const selectRelated = createFacilityPageLinkSelector(visibleFacilities);
  const incomingBefore = countIncoming(selectBaseline);
  const incomingAfter = countIncoming(selectRelated);
  const beforeOrphans = visibleFacilities
    .filter((facility) => incomingBefore.get(facility.id) === 0)
    .map((facility) => facility.slug);
  const afterOrphans = [...incomingAfter.values()].filter(
    (count) => count === 0,
  ).length;

  assert.deepEqual(beforeOrphans, [
    "facility-2053",
    "facility-7508",
    "facility-7509",
    "facility-8085",
  ]);
  assert.equal(afterOrphans, 0);
  console.log(
    JSON.stringify({
      seoP1bOrphans: { before: beforeOrphans.length, after: afterOrphans },
    }),
  );
});

function countIncoming(selectRelated) {
  const incoming = new Map(visibleFacilities.map((facility) => [facility.id, 0]));
  for (const facility of visibleFacilities) {
    for (const related of selectRelated(facility, 3)) {
      incoming.set(related.id, (incoming.get(related.id) ?? 0) + 1);
    }
  }
  return incoming;
}
