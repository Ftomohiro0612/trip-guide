export type EventTypeFilterValue =
  | "fireworks"
  | "summer_festival"
  | "summer_tradition"
  | "night_outing";

// Legacy query values remain accepted while the UI uses datePreset and
// reservation as independent, mutually exclusive filter groups.
export type EventQuickFilter =
  | "weekend"
  | "month"
  | "indoor"
  | "free"
  | "noReservation";

export type EventDatePreset = "weekend" | "month";
export type EventReservationFilter = "required" | "not_required";

export interface EventDateRange {
  startDate: string;
  endDate: string;
}

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
    start_date?: string | null;
    end_date?: string | null;
    occurrence_dates?: readonly string[];
  };
  isThisWeekend: boolean;
  isThisMonth: boolean;
}

export interface EventFilterSelection {
  eventTypes: readonly EventTypeFilterValue[];
  prefectures: readonly string[];
  quickFilters: readonly EventQuickFilter[];
  recommendedTags: readonly string[];
  dateRange?: EventDateRange;
  datePreset?: EventDatePreset | null;
  referenceDate?: string;
  reservation?: EventReservationFilter | null;
}

export function filterEventViews<T extends FilterableEventView>(
  views: readonly T[],
  selection: EventFilterSelection,
  applyPrefectureFilter = true,
): T[] {
  const dateRange = getEffectiveEventDateRange(selection);
  if (getEventDateFilterError(selection.dateRange, selection.datePreset)) {
    return [];
  }

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
    if (
      selection.reservation &&
      event.reservation !== selection.reservation
    ) {
      return false;
    }
    if (dateRange && !eventMatchesDateRange(event, dateRange)) {
      return false;
    }

    return selection.quickFilters.every((filter) =>
      matchesEventQuickFilter(view, filter),
    );
  });
}

export function eventMatchesDateRange(
  event: Pick<
    FilterableEventView["event"],
    "start_date" | "end_date" | "occurrence_dates"
  >,
  range: EventDateRange,
): boolean {
  const startDate = normalizeOptionalDate(range.startDate);
  const endDate = normalizeOptionalDate(range.endDate);
  if (!startDate && !endDate) return true;
  if (startDate && endDate && startDate > endDate) return false;

  if (event.occurrence_dates && event.occurrence_dates.length > 0) {
    return event.occurrence_dates.some(
      (date) =>
        isDateOnly(date) &&
        (!startDate || date >= startDate) &&
        (!endDate || date <= endDate),
    );
  }

  const eventStart = normalizeOptionalDate(event.start_date ?? "");
  if (!eventStart) return false;
  const eventEnd = normalizeOptionalDate(event.end_date ?? "") ?? eventStart;
  return (!endDate || eventStart <= endDate) && (!startDate || eventEnd >= startDate);
}

export function getEventDateFilterError(
  range: EventDateRange | undefined,
  preset: EventDatePreset | null | undefined,
): string | null {
  if (preset || !range) return null;
  const startDate = normalizeOptionalDate(range.startDate);
  const endDate = normalizeOptionalDate(range.endDate);
  return startDate && endDate && startDate > endDate
    ? "開始日は終了日以前の日付を指定してください。"
    : null;
}

export function getEventDatePresetRange(
  preset: EventDatePreset,
  referenceDate: string,
): EventDateRange {
  const parsed = parseDateOnly(referenceDate);
  if (!parsed) return { startDate: "", endDate: "" };

  if (preset === "month") {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    return {
      startDate: formatDateOnly(new Date(Date.UTC(year, month, 1))),
      endDate: formatDateOnly(new Date(Date.UTC(year, month + 1, 0))),
    };
  }

  const daysUntilSaturday = (6 - parsed.getUTCDay() + 7) % 7;
  const saturday = new Date(parsed.getTime() + daysUntilSaturday * 86_400_000);
  const sunday = new Date(saturday.getTime() + 86_400_000);
  return {
    startDate: formatDateOnly(saturday),
    endDate: formatDateOnly(sunday),
  };
}

export function getDateOnlyInTimeZone(
  date: Date,
  timeZone = "Asia/Tokyo",
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
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

function getEffectiveEventDateRange(
  selection: EventFilterSelection,
): EventDateRange | null {
  if (selection.datePreset) {
    return getEventDatePresetRange(
      selection.datePreset,
      selection.referenceDate ?? formatDateOnly(new Date()),
    );
  }
  if (
    selection.dateRange &&
    (selection.dateRange.startDate || selection.dateRange.endDate)
  ) {
    return selection.dateRange;
  }
  return null;
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

function normalizeOptionalDate(value: string): string | null {
  return isDateOnly(value) ? value : null;
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = parseDateOnly(value);
  return parsed !== null && formatDateOnly(parsed) === value;
}

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
