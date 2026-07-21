import { visibleFacilities, prefectures } from "@/lib/facilities";
import {
  applyFilters,
  parseFilterParams,
  type RawSearchParams,
} from "@/lib/filter";
import {
  filterByPrefectureIds,
  resolvePrefectureId,
} from "@/lib/facility-area-filter";
import { RECOMMENDED_FOR_TAG_HEADLINE } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function isRecommendedForTag(value: string): value is RecommendedForTag {
  return Object.prototype.hasOwnProperty.call(
    RECOMMENDED_FOR_TAG_HEADLINE,
    value,
  );
}

export function getFacilityListResults(searchParams: RawSearchParams) {
  const filters = parseFilterParams(searchParams);
  const recommendedTagParam = asSingleParam(searchParams.recommended_tag);
  const recommendedTag = isRecommendedForTag(recommendedTagParam)
    ? recommendedTagParam
    : null;
  const selectedPrefectureId = resolvePrefectureId(
    asSingleParam(searchParams.prefecture),
    prefectures,
  );
  const filtersWithoutArea = { ...filters, prefectures: [] };
  const baseResults = applyFilters(visibleFacilities, filtersWithoutArea);
  const tagFilteredResults = recommendedTag
    ? baseResults.filter((facility) =>
        (facility.recommended_for_tags ?? []).includes(recommendedTag),
      )
    : baseResults;
  const selectedPrefectureIds = selectedPrefectureId
    ? [selectedPrefectureId]
    : filters.prefectures;
  const results = filterByPrefectureIds(
    tagFilteredResults,
    selectedPrefectureIds,
  );

  return {
    filters,
    recommendedTag,
    selectedPrefectureId,
    tagFilteredResults,
    results,
  };
}

export function rawSearchParamsFromUrl(
  searchParams: URLSearchParams,
): RawSearchParams {
  const raw: RawSearchParams = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return raw;
}
