export type EventTypeFilterValue =
  | "fireworks"
  | "summer_festival"
  | "summer_tradition"
  | "night_outing";

export type EventQuickFilter =
  | "weekend"
  | "month"
  | "indoor"
  | "free"
  | "noReservation";

export const EVENT_PAGE_SIZE = 20;

export interface EventPage<T> {
  currentPage: number;
  endNumber: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: T[];
  startNumber: number;
  totalItems: number;
  totalPages: number;
}

interface FilterableEventView {
  event: {
    prefecture: string;
    event_type?: EventTypeFilterValue;
    recommended_for_tags: readonly string[];
    is_indoor: boolean | null;
    is_free: boolean | null;
    reservation: string;
  };
  isThisWeekend: boolean;
  isThisMonth: boolean;
}

export interface EventFilterSelection {
  eventTypes: readonly EventTypeFilterValue[];
  prefectures: readonly string[];
  quickFilters: readonly EventQuickFilter[];
  recommendedTags: readonly string[];
}

export function filterEventViews<T extends FilterableEventView>(
  views: readonly T[],
  selection: EventFilterSelection,
  applyPrefectureFilter = true,
): T[] {
  return views.filter((view) => {
    const { event } = view;

    // Unclassified legacy events remain visible until a type is selected.
    if (
      selection.eventTypes.length > 0 &&
      (!event.event_type || !selection.eventTypes.includes(event.event_type))
    ) {
      return false;
    }
    if (
      applyPrefectureFilter &&
      selection.prefectures.length > 0 &&
      !selection.prefectures.includes(event.prefecture)
    ) {
      return false;
    }
    if (
      selection.recommendedTags.length > 0 &&
      !selection.recommendedTags.some((tag) =>
        event.recommended_for_tags.includes(tag),
      )
    ) {
      return false;
    }

    return selection.quickFilters.every((filter) =>
      matchesEventQuickFilter(view, filter),
    );
  });
}

export function paginateEventViews<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize = EVENT_PAGE_SIZE,
): EventPage<T> {
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.floor(pageSize)
      : EVENT_PAGE_SIZE;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / safePageSize);
  const normalizedPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;
  const currentPage =
    totalPages === 0 ? 1 : Math.min(normalizedPage, totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, totalItems);

  return {
    currentPage,
    endNumber: totalItems === 0 ? 0 : endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: totalPages > 0 && currentPage > 1,
    items: items.slice(startIndex, endIndex),
    startNumber: totalItems === 0 ? 0 : startIndex + 1,
    totalItems,
    totalPages,
  };
}

function matchesEventQuickFilter(
  view: FilterableEventView,
  filter: EventQuickFilter,
): boolean {
  switch (filter) {
    case "weekend":
      return view.isThisWeekend;
    case "month":
      return view.isThisMonth;
    case "indoor":
      return view.event.is_indoor === true;
    case "free":
      return view.event.is_free === true;
    case "noReservation":
      return view.event.reservation === "not_required";
  }
}
