import type { PrefectureId, PrefectureMeta } from "@/types/facility";

export function getPrefectureSelectorState(
  selectedId: PrefectureId | null,
  detailedIds: readonly string[],
) {
  const uniqueDetailedIds = selectedId
    ? []
    : [...new Set(detailedIds.filter(Boolean))];

  return {
    isNationwide: selectedId === null && uniqueDetailedIds.length === 0,
    detailedCount: uniqueDetailedIds.length,
    hasDetailedSelection: uniqueDetailedIds.length > 0,
  };
}

export function resolvePrefectureId(
  value: string,
  prefectures: readonly Pick<PrefectureMeta, "id" | "name">[],
): PrefectureId | null {
  if (!value) return null;
  return (
    prefectures.find(
      (prefecture) =>
        prefecture.id === value || prefecture.name === value,
    )?.id ?? null
  );
}

export function filterByPrefectureIds<
  T extends { prefecture_id: PrefectureId },
>(facilities: readonly T[], prefectureIds: readonly string[]): T[] {
  if (prefectureIds.length === 0) return [...facilities];
  const selected = new Set(prefectureIds);
  return facilities.filter((facility) => selected.has(facility.prefecture_id));
}
