import assert from "node:assert/strict";
import test from "node:test";
import facilitiesData from "../data/facilities_data.json" with { type: "json" };
import { createRelatedFacilitySelector } from "../lib/related-facilities.mjs";

const visibleFacilities = facilitiesData.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const selectRelatedFacilities =
  createRelatedFacilitySelector(visibleFacilities);

function sharedValueCount(aValues, bValues) {
  const aSet = new Set(Array.isArray(aValues) ? aValues : []);
  return (Array.isArray(bValues) ? bValues : []).filter((value) =>
    aSet.has(value),
  ).length;
}

function distanceKm(a, b) {
  const earthRadiusKm = 6_371;
  const toRadians = Math.PI / 180;
  const latitudeDelta = (b.latitude - a.latitude) * toRadians;
  const longitudeDelta = (b.longitude - a.longitude) * toRadians;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(a.latitude * toRadians) *
      Math.cos(b.latitude * toRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function legacyRelatedFacilities(facility, limit = 3) {
  return visibleFacilities
    .filter(
      (candidate) =>
        candidate.id !== facility.id &&
        (candidate.category_id === facility.category_id ||
          candidate.prefecture_id === facility.prefecture_id),
    )
    .sort((a, b) => {
      const aScore =
        Number(a.category_id === facility.category_id) * 2 +
        Number(a.prefecture_id === facility.prefecture_id);
      const bScore =
        Number(b.category_id === facility.category_id) * 2 +
        Number(b.prefecture_id === facility.prefecture_id);
      return bScore - aScore;
    })
    .slice(0, limit);
}

function collectMetrics(selectRelated, { assertSemanticContract = false } = {}) {
  const incomingLinks = new Map(
    visibleFacilities.map((facility) => [facility.id, 0]),
  );
  let totalLinks = 0;
  let samePrefectureLinks = 0;
  let sameCategoryLinks = 0;
  let sharedRecommendationLinks = 0;
  const samePrefectureDistances = [];

  for (const facility of visibleFacilities) {
    const related = selectRelated(facility, 3);

    assert.equal(related.length, 3, `${facility.slug}: related count`);
    assert.equal(
      new Set(related.map((candidate) => candidate.id)).size,
      related.length,
      `${facility.slug}: related facilities must be unique`,
    );
    assert(
      related.every((candidate) => candidate.id !== facility.id),
      `${facility.slug}: self link`,
    );

    const strongSemanticLinks = related.filter(
      (candidate) =>
        candidate.category_id === facility.category_id ||
        sharedValueCount(
          facility.recommended_for_tags,
          candidate.recommended_for_tags,
        ) > 0,
    );
    if (assertSemanticContract) {
      assert(
        strongSemanticLinks.length >= 2,
        `${facility.slug}: fewer than two strongly relevant links`,
      );
    }

    for (const candidate of related) {
      totalLinks += 1;
      incomingLinks.set(candidate.id, incomingLinks.get(candidate.id) + 1);

      if (candidate.prefecture_id === facility.prefecture_id) {
        samePrefectureLinks += 1;
        samePrefectureDistances.push(distanceKm(facility, candidate));
      }
      if (candidate.category_id === facility.category_id) {
        sameCategoryLinks += 1;
      }
      if (
        sharedValueCount(
          facility.recommended_for_tags,
          candidate.recommended_for_tags,
        ) > 0
      ) {
        sharedRecommendationLinks += 1;
      }
    }
  }

  const incomingValues = [...incomingLinks.values()].sort((a, b) => a - b);
  samePrefectureDistances.sort((a, b) => a - b);
  const percentile = (values, ratio) =>
    values[Math.floor((values.length - 1) * ratio)];

  return {
    zeroIncoming: incomingValues.filter((count) => count === 0).length,
    minIncoming: incomingValues[0],
    medianIncoming: percentile(incomingValues, 0.5),
    maxIncoming: incomingValues.at(-1),
    samePrefectureRate: samePrefectureLinks / totalLinks,
    sameCategoryRate: sameCategoryLinks / totalLinks,
    sharedRecommendationRate: sharedRecommendationLinks / totalLinks,
    distanceP50Km: percentile(samePrefectureDistances, 0.5),
    distanceP90Km: percentile(samePrefectureDistances, 0.9),
  };
}

test("SEO P1B distributes related links while preserving relevance", () => {
  const legacy = collectMetrics(legacyRelatedFacilities);
  const proposed = collectMetrics(selectRelatedFacilities, {
    assertSemanticContract: true,
  });

  assert(legacy.zeroIncoming > 0, "legacy distribution must expose the skew");
  assert.equal(proposed.zeroIncoming, 0);
  assert(proposed.minIncoming >= 1);
  assert(proposed.maxIncoming <= 15);
  assert.equal(proposed.samePrefectureRate, 1);
  assert(proposed.sameCategoryRate >= 0.9);
  assert(proposed.sharedRecommendationRate >= 0.97);
  assert(proposed.distanceP50Km < legacy.distanceP50Km);
  assert(proposed.distanceP90Km < legacy.distanceP90Km);

  console.log(
    JSON.stringify(
      {
        visibleFacilities: visibleFacilities.length,
        legacy,
        proposed,
      },
      null,
      2,
    ),
  );
});
