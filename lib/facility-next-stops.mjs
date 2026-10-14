import { haversineDistanceKm } from "./distance.ts";

export const NEXT_STOP_LIMIT = 4;
export const NEXT_STOP_RADIUS_STEPS_KM = [10, 25, 50, 100];

const GRID_CELL_DEGREES = 0.25;
const DISTANCE_BAND_KM = 5;
const AGE_TAGS = new Set(["0-3歳OK", "小学生向け"]);

/**
 * Build a deterministic next-stop selector from existing facility fields.
 *
 * The smallest radius containing four candidates wins. Within that radius,
 * 5 km distance bands come first; age fit and family value can then reorder
 * genuinely nearby choices. Rural pages widen through 10/25/50/100 km and
 * return fewer than four rather than suggesting a cross-country "nearby" stop.
 *
 * @template {{
 *   id: number,
 *   latitude?: number | null,
 *   longitude?: number | null,
 *   category_id: string,
 *   target_age?: string | null,
 *   tags?: string[] | null,
 *   recommended_for_tags?: string[] | null,
 *   rain_friendly?: string | null,
 *   is_free?: boolean,
 *   child_use_status?: "confirmed" | "unknown" | "restricted" | "not_allowed",
 *   closure_status?: string | null,
 *   data_quality_status?: string | null
 * }} T
 * @param {readonly T[]} facilities
 */
export function createFacilityNextStopSelector(facilities) {
  const eligible = facilities.filter(isEligibleCandidate);
  const spatialIndex = buildSpatialIndex(eligible);

  /**
   * @param {T} source
   * @param {number} [limit]
   */
  return function selectFacilityNextStops(source, limit = NEXT_STOP_LIMIT) {
    const normalizedLimit = Math.max(0, Math.floor(limit));
    const fallbackRadiusKm = NEXT_STOP_RADIUS_STEPS_KM.at(-1);

    if (normalizedLimit === 0 || !hasCoordinates(source)) {
      return { radiusKm: fallbackRadiusKm, candidates: [] };
    }

    let radiusKm = fallbackRadiusKm;
    let nearby = [];

    for (const candidateRadiusKm of NEXT_STOP_RADIUS_STEPS_KM) {
      nearby = candidatesWithinRadius(
        spatialIndex,
        source,
        candidateRadiusKm,
      );
      radiusKm = candidateRadiusKm;
      if (nearby.length >= normalizedLimit) break;
    }

    const candidates = nearby
      .map(({ facility, distanceKm }) => {
        const ranking = buildRanking(source, facility, distanceKm);
        return {
          facility,
          distanceKm,
          ranking,
          reasons: buildReasons(ranking),
        };
      })
      .sort(compareRankedCandidates)
      .slice(0, normalizedLimit);

    return { radiusKm, candidates };
  };
}

function isEligibleCandidate(facility) {
  return (
    facility.data_quality_status !== "exclude_candidate" &&
    !facility.closure_status &&
    facility.child_use_status !== "restricted" &&
    facility.child_use_status !== "not_allowed" &&
    hasCoordinates(facility)
  );
}

function hasCoordinates(facility) {
  return (
    Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude)
  );
}

function buildSpatialIndex(facilities) {
  const index = new Map();
  for (const facility of facilities) {
    const key = gridKey(facility.latitude, facility.longitude);
    const bucket = index.get(key) ?? [];
    bucket.push(facility);
    index.set(key, bucket);
  }
  return index;
}

function candidatesWithinRadius(index, source, radiusKm) {
  const latitudeDelta = radiusKm / 111;
  const longitudeScale = Math.max(
    0.1,
    Math.cos((source.latitude * Math.PI) / 180),
  );
  const longitudeDelta = radiusKm / (111 * longitudeScale);
  const minLatitudeCell = gridCoordinate(source.latitude - latitudeDelta);
  const maxLatitudeCell = gridCoordinate(source.latitude + latitudeDelta);
  const minLongitudeCell = gridCoordinate(source.longitude - longitudeDelta);
  const maxLongitudeCell = gridCoordinate(source.longitude + longitudeDelta);
  const candidates = [];

  for (
    let latitudeCell = minLatitudeCell;
    latitudeCell <= maxLatitudeCell;
    latitudeCell += 1
  ) {
    for (
      let longitudeCell = minLongitudeCell;
      longitudeCell <= maxLongitudeCell;
      longitudeCell += 1
    ) {
      for (const facility of index.get(`${latitudeCell}:${longitudeCell}`) ?? []) {
        if (facility.id === source.id) continue;
        const distanceKm = haversineDistanceKm(
          [source.latitude, source.longitude],
          [facility.latitude, facility.longitude],
        );
        if (distanceKm <= radiusKm) candidates.push({ facility, distanceKm });
      }
    }
  }

  return candidates;
}

function gridCoordinate(value) {
  return Math.floor(value / GRID_CELL_DEGREES);
}

function gridKey(latitude, longitude) {
  return `${gridCoordinate(latitude)}:${gridCoordinate(longitude)}`;
}

function buildRanking(source, candidate, distanceKm) {
  const sourceAge = normalizedKnownValue(source.target_age);
  const candidateAge = normalizedKnownValue(candidate.target_age);
  const sharedAgeTags = sharedValues(source.tags, candidate.tags).filter((tag) =>
    AGE_TAGS.has(tag),
  );
  const exactAgeMatch = Boolean(sourceAge && candidateAge && sourceAge === candidateAge);
  const sharedRecommendedTags = sharedValues(
    source.recommended_for_tags,
    candidate.recommended_for_tags,
  );
  const complementaryCategory = source.category_id !== candidate.category_id;
  const rainFriendly = candidate.rain_friendly === "◎";
  const free = candidate.is_free === true;

  return {
    distanceBand: Math.floor(distanceKm / DISTANCE_BAND_KM),
    ageFit: Number(exactAgeMatch) * 2 + sharedAgeTags.length,
    familyValue:
      Math.min(sharedRecommendedTags.length, 2) +
      Number(rainFriendly) +
      Number(free) +
      Number(complementaryCategory) * 2,
    complementaryCategory,
    exactAgeMatch,
    sharedAgeTags,
    sharedRecommendedTags,
    rainFriendly,
    free,
  };
}

function compareRankedCandidates(a, b) {
  return (
    a.ranking.distanceBand - b.ranking.distanceBand ||
    b.ranking.ageFit - a.ranking.ageFit ||
    b.ranking.familyValue - a.ranking.familyValue ||
    Number(b.ranking.complementaryCategory) -
      Number(a.ranking.complementaryCategory) ||
    a.distanceKm - b.distanceKm ||
    a.facility.id - b.facility.id
  );
}

function buildReasons(ranking) {
  const reasons = [`${ranking.distanceBand * DISTANCE_BAND_KM}〜${
    (ranking.distanceBand + 1) * DISTANCE_BAND_KM
  }km帯`];
  if (ranking.exactAgeMatch) reasons.push("対象年齢が一致");
  if (ranking.sharedAgeTags.length > 0) {
    reasons.push(`年齢タグ一致: ${ranking.sharedAgeTags.join("・")}`);
  }
  if (ranking.sharedRecommendedTags.length > 0) {
    reasons.push(
      `好きの傾向: ${ranking.sharedRecommendedTags.slice(0, 2).join("・")}`,
    );
  }
  if (ranking.rainFriendly) reasons.push("雨でも選びやすい");
  if (ranking.free) reasons.push("無料");
  if (ranking.complementaryCategory) reasons.push("違う遊び方");
  return reasons;
}

function normalizedKnownValue(value) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized && normalized.toLowerCase() !== "unknown" ? normalized : "";
}

function sharedValues(aValues, bValues) {
  const aSet = new Set(Array.isArray(aValues) ? aValues : []);
  return (Array.isArray(bValues) ? bValues : []).filter((value) =>
    aSet.has(value),
  );
}
