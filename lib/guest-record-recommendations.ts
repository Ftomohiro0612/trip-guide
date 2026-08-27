import { visibleFacilities } from "@/lib/facilities";
import { isChildRecommendationEligible } from "@/lib/facility-child-use";
import {
  getGuestInterestTags,
  type GuestInterestTag,
  type GuestRecordRecommendation,
} from "@/lib/guest-record";
import type { Facility } from "@/types/facility";

const facilitiesByTag = new Map<GuestInterestTag, Facility[]>();
const facilitiesByTagAndPrefecture = new Map<string, Facility[]>();
const facilitiesByTagAndCategory = new Map<string, Facility[]>();
const facilitiesByTagPrefectureAndCategory = new Map<string, Facility[]>();
const guestTagsByFacilityId = new Map<number, GuestInterestTag[]>();

function appendToGroup(map: Map<string, Facility[]>, key: string, facility: Facility) {
  const group = map.get(key) ?? [];
  group.push(facility);
  map.set(key, group);
}

for (const facility of visibleFacilities) {
  if (!isChildRecommendationEligible(facility)) continue;
  const guestTags = getGuestInterestTags(facility.recommended_for_tags);
  guestTagsByFacilityId.set(facility.id, guestTags);

  for (const tag of guestTags) {
    const tagGroup = facilitiesByTag.get(tag) ?? [];
    tagGroup.push(facility);
    facilitiesByTag.set(tag, tagGroup);
    appendToGroup(
      facilitiesByTagAndPrefecture,
      `${tag}:${facility.prefecture_id}`,
      facility,
    );
    appendToGroup(
      facilitiesByTagAndCategory,
      `${tag}:${facility.category_id}`,
      facility,
    );
    appendToGroup(
      facilitiesByTagPrefectureAndCategory,
      `${tag}:${facility.prefecture_id}:${facility.category_id}`,
      facility,
    );
  }
}

function topCandidatesForTag(
  source: Facility,
  tag: GuestInterestTag,
  limit: number,
): Facility[] {
  const result: Facility[] = [];
  const seen = new Set<number>([source.id]);
  const pools = [
    facilitiesByTagPrefectureAndCategory.get(
      `${tag}:${source.prefecture_id}:${source.category_id}`,
    ),
    facilitiesByTagAndPrefecture.get(`${tag}:${source.prefecture_id}`),
    facilitiesByTagAndCategory.get(`${tag}:${source.category_id}`),
    facilitiesByTag.get(tag),
  ];

  for (const pool of pools) {
    for (const candidate of pool ?? []) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      result.push(candidate);
      if (result.length >= limit) return result;
    }
  }

  return result;
}

/**
 * Builds a compact candidate union for the guest record card.
 *
 * Every candidate has an exact recommended_for_tags match. Pools prefer the
 * same prefecture and category, but never reserve a connectivity/successor
 * slot or backfill with an unrelated facility.
 */
export function getGuestRecordRecommendationCandidates(
  source: Facility,
  perTagLimit = 3,
): GuestRecordRecommendation[] {
  if (!isChildRecommendationEligible(source)) return [];
  const sourceTags = guestTagsByFacilityId.get(source.id) ?? [];
  const candidateRank = new Map<number, number>();
  const candidates = new Map<number, Facility>();

  sourceTags.forEach((tag, tagIndex) => {
    topCandidatesForTag(source, tag, perTagLimit).forEach((candidate, rank) => {
      candidates.set(candidate.id, candidate);
      const relevanceRank = tagIndex * perTagLimit + rank;
      candidateRank.set(
        candidate.id,
        Math.min(
          candidateRank.get(candidate.id) ?? Number.POSITIVE_INFINITY,
          relevanceRank,
        ),
      );
    });
  });

  return [...candidates.values()]
    .map((candidate) => ({
      slug: candidate.slug,
      name: candidate.name,
      prefecture: candidate.prefecture,
      category: candidate.category,
      matchingTags: (guestTagsByFacilityId.get(candidate.id) ?? []).filter(
        (tag) => sourceTags.includes(tag),
      ),
      relevanceRank: candidateRank.get(candidate.id) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort(
      (a, b) =>
        a.relevanceRank - b.relevanceRank || a.name.localeCompare(b.name, "ja"),
    );
}
