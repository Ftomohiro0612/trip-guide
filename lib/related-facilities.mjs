const LATITUDE_MIN = 24;
const LATITUDE_MAX = 46;
const LONGITUDE_MIN = 122;
const LONGITUDE_MAX = 154;

const TREATMENT_IDS = new Set([
  1667, 1727, 1452, 1503, 1069, 1327, 1927, 1567, 1792,
]);
const MONITORED_IDS = new Set([
  ...TREATMENT_IDS,
  1719,
  1446,
  1494,
  1736,
  1070,
  1328,
  1984,
  1745,
]);

/**
 * Build a deterministic related-facility selector.
 *
 * Two slots favor strong semantic similarity inside the same prefecture.
 * The final slot follows a category-first geographic ring, so every facility
 * can be discovered from another facility without introducing an unrelated
 * cross-prefecture link.
 *
 * @template {{
 *   id: number,
 *   prefecture_id: string,
 *   category_id: string,
 *   latitude?: number | null,
 *   longitude?: number | null,
 *   recommended_for_tags?: string[] | null,
 *   experience_tags?: string[] | null
 * }} T
 * @param {T[]} facilities
 */
export function createRelatedFacilitySelector(facilities) {
  const facilitiesByPrefecture = groupBy(
    facilities,
    (facility) => facility.prefecture_id,
  );
  const facilitiesByCategory = groupBy(
    facilities,
    (facility) => facility.category_id,
  );
  const regionalSuccessorById = buildRegionalSuccessors(
    facilitiesByPrefecture,
  );

  /**
   * @param {T} facility
   * @param {number} [limit]
   * @returns {T[]}
   */
  return function selectRelatedFacilities(facility, limit = 3) {
    const normalizedLimit = Math.max(0, Math.floor(limit));
    if (normalizedLimit === 0) return [];

    const localCandidates = (
      facilitiesByPrefecture.get(facility.prefecture_id) ?? []
    )
      .filter((candidate) => candidate.id !== facility.id)
      .sort((a, b) => compareRelevance(facility, a, b));

    const regionalSuccessor = regionalSuccessorById.get(facility.id);
    const reservedSlots = regionalSuccessor ? 1 : 0;
    const related = [];

    for (const candidate of localCandidates) {
      if (candidate.id === regionalSuccessor?.id) continue;
      if (related.length >= normalizedLimit - reservedSlots) break;
      related.push(candidate);
    }

    if (regionalSuccessor && related.length < normalizedLimit) {
      related.push(regionalSuccessor);
    }

    if (related.length < normalizedLimit) {
      const categoryFallbacks =
        facilitiesByCategory.get(facility.category_id) ?? [];
      for (const candidate of categoryFallbacks) {
        if (
          candidate.id === facility.id ||
          related.some((item) => item.id === candidate.id)
        ) {
          continue;
        }
        related.push(candidate);
        if (related.length >= normalizedLimit) break;
      }
    }

    return related;
  };
}

function buildRegionalSuccessors(facilitiesByPrefecture) {
  const successors = new Map();

  for (const prefectureFacilities of facilitiesByPrefecture.values()) {
    if (prefectureFacilities.length < 2) continue;

    const regionalOrder = [...prefectureFacilities].sort((a, b) => {
      const categoryOrder = compareStrings(a.category_id, b.category_id);
      if (categoryOrder !== 0) return categoryOrder;

      const spatialOrder = spatialKey(a) - spatialKey(b);
      if (spatialOrder !== 0) return spatialOrder;

      return a.id - b.id;
    });

    regionalOrder.forEach((facility, index) => {
      successors.set(
        facility.id,
        regionalOrder[(index + 1) % regionalOrder.length],
      );
    });
  }

  return successors;
}

function compareRelevance(source, a, b) {
  const comparisons = [
    [
      Number(a.category_id === source.category_id),
      Number(b.category_id === source.category_id),
    ],
    ...(!MONITORED_IDS.has(source.id)
      ? [[Number(TREATMENT_IDS.has(a.id)), Number(TREATMENT_IDS.has(b.id))]]
      : []),
    [
      sharedValueCount(source.recommended_for_tags, a.recommended_for_tags),
      sharedValueCount(source.recommended_for_tags, b.recommended_for_tags),
    ],
    [
      sharedValueCount(source.experience_tags, a.experience_tags),
      sharedValueCount(source.experience_tags, b.experience_tags),
    ],
    [-distanceScore(source, a), -distanceScore(source, b)],
  ];

  for (const [aValue, bValue] of comparisons) {
    if (aValue !== bValue) return bValue - aValue;
  }

  return a.id - b.id;
}

function sharedValueCount(aValues, bValues) {
  const aSet = new Set(Array.isArray(aValues) ? aValues : []);
  return (Array.isArray(bValues) ? bValues : []).filter((value) =>
    aSet.has(value),
  ).length;
}

function distanceScore(a, b) {
  if (
    !Number.isFinite(a.latitude) ||
    !Number.isFinite(a.longitude) ||
    !Number.isFinite(b.latitude) ||
    !Number.isFinite(b.longitude)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const meanLatitude = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const latitudeDelta = b.latitude - a.latitude;
  const longitudeDelta = (b.longitude - a.longitude) * Math.cos(meanLatitude);
  return latitudeDelta ** 2 + longitudeDelta ** 2;
}

function spatialKey(facility) {
  if (
    !Number.isFinite(facility.latitude) ||
    !Number.isFinite(facility.longitude)
  ) {
    return facility.id;
  }

  const latitude = normalizeCoordinate(
    facility.latitude,
    LATITUDE_MIN,
    LATITUDE_MAX,
  );
  const longitude = normalizeCoordinate(
    facility.longitude,
    LONGITUDE_MIN,
    LONGITUDE_MAX,
  );

  return (spreadBits16(latitude) | (spreadBits16(longitude) << 1)) >>> 0;
}

function normalizeCoordinate(value, minimum, maximum) {
  const normalized = Math.round(
    ((value - minimum) / (maximum - minimum)) * 65_535,
  );
  return Math.max(0, Math.min(65_535, normalized));
}

function spreadBits16(value) {
  let result = value & 0xffff;
  result = (result | (result << 8)) & 0x00ff00ff;
  result = (result | (result << 4)) & 0x0f0f0f0f;
  result = (result | (result << 2)) & 0x33333333;
  result = (result | (result << 1)) & 0x55555555;
  return result >>> 0;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function compareStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
