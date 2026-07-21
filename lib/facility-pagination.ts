import type { Facility, PrefectureMeta } from "@/types/facility";

export const FACILITIES_PER_PAGE = 24;

export interface FacilityPage<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  rangeStart: number;
  rangeEnd: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface FacilityPrefectureSection extends PrefectureMeta {
  items: Facility[];
  currentPageContinuesPrefecture: boolean;
}

export function parseFacilityPage(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" && typeof raw !== "number") return 1;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginateFacilities<T>(
  items: readonly T[],
  requestedPage: unknown,
  pageSize = FACILITIES_PER_PAGE,
): FacilityPage<T> {
  const safePageSize =
    Number.isSafeInteger(pageSize) && pageSize > 0
      ? pageSize
      : FACILITIES_PER_PAGE;
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(parseFacilityPage(requestedPage), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const pageItems = items.slice(startIndex, startIndex + safePageSize);
  const endIndex = startIndex + pageItems.length;

  return {
    items: pageItems,
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    rangeStart: totalItems === 0 ? 0 : startIndex + 1,
    rangeEnd: endIndex,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

export function orderFacilitiesByPrefecture(
  facilities: readonly Facility[],
  prefectures: readonly PrefectureMeta[],
): Facility[] {
  const order = new Map(
    prefectures.map((prefecture, index) => [prefecture.id, index]),
  );

  return [...facilities].sort(
    (a, b) =>
      (order.get(a.prefecture_id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.prefecture_id) ?? Number.MAX_SAFE_INTEGER) ||
      a.id - b.id,
  );
}

export function groupFacilityPageByPrefecture(
  facilities: readonly Facility[],
  prefectures: readonly PrefectureMeta[],
  previousPrefectureId?: string,
): FacilityPrefectureSection[] {
  return prefectures.flatMap((prefecture) => {
    const items = facilities.filter(
      (facility) => facility.prefecture_id === prefecture.id,
    );
    if (items.length === 0) return [];

    return [
      {
        ...prefecture,
        items,
        currentPageContinuesPrefecture:
          facilities[0]?.prefecture_id === prefecture.id &&
          previousPrefectureId === prefecture.id,
      },
    ];
  });
}

export function resetFacilityPage(params: URLSearchParams): URLSearchParams {
  params.set("page", "1");
  return params;
}

export function buildFacilityPageHref(
  pathname: string,
  search: string | URLSearchParams,
  page: number,
): string {
  const params = new URLSearchParams(
    typeof search === "string" ? search : search.toString(),
  );
  params.set("page", String(Math.max(1, Math.floor(page))));
  const query = params.toString();
  return query ? pathname + "?" + query : pathname;
}
