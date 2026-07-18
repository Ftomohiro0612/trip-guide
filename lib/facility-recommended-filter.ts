import type { PrefectureMeta, RecommendedForTag } from "@/types/facility";

export const NATIONAL_PREFECTURE_LABEL = "全国";

export function buildRecommendedTagPrefectureOptions(
  prefectureMetadata: readonly Pick<PrefectureMeta, "name">[],
  preferredOrder: readonly string[] = [],
): string[] {
  const metadataNames = [...new Set(prefectureMetadata.map(({ name }) => name))];
  const metadataNameSet = new Set(metadataNames);
  const preferred = preferredOrder.filter((name) => metadataNameSet.has(name));
  const preferredSet = new Set(preferred);

  return [
    NATIONAL_PREFECTURE_LABEL,
    ...preferred,
    ...metadataNames.filter((name) => !preferredSet.has(name)),
  ];
}

export function resolveRecommendedTagPrefecture(
  prefectureParam: string,
  prefectureOptions: readonly string[],
): string {
  return prefectureOptions.includes(prefectureParam)
    ? prefectureParam
    : NATIONAL_PREFECTURE_LABEL;
}

export function buildRecommendedTagPrefectureHref(
  tag: RecommendedForTag,
  prefecture: string,
): string {
  const params = new URLSearchParams({ recommended_tag: tag });
  if (prefecture !== NATIONAL_PREFECTURE_LABEL) {
    params.set("prefecture", prefecture);
  }
  return `/facilities?${params.toString()}`;
}

export function filterFacilitiesByPrefectureNames<
  T extends { prefecture?: string | null },
>(facilities: readonly T[], prefectureNames: readonly string[]): T[] {
  if (prefectureNames.length === 0) return [...facilities];
  const selected = new Set(prefectureNames);
  return facilities.filter((facility) =>
    selected.has(facility.prefecture ?? ""),
  );
}
