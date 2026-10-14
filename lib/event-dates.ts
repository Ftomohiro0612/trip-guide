export interface EventDateFields {
  end_date: string | null;
  facility_id: number | null;
  occurrence_dates?: readonly string[];
  official_url: string;
  source_checked_at: string;
  start_date: string | null;
  status: string;
  venue_name?: string;
}

export interface DateAwareEventView<TEvent extends EventDateFields = EventDateFields> {
  event: TEvent;
  isThisMonth: boolean;
  isThisWeekend: boolean;
}

const DAY_MS = 86_400_000;
const VISIBLE_EVENT_STATUSES = new Set(["scheduled", "ongoing"]);

export function getTokyoDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function getEventLastDate(event: EventDateFields): string | null {
  if (isDateOnly(event.end_date)) return event.end_date;

  const occurrenceDates = (event.occurrence_dates ?? [])
    .filter(isDateOnly)
    .sort((a, b) => a.localeCompare(b));
  if (occurrenceDates.length > 0) {
    return occurrenceDates[occurrenceDates.length - 1];
  }

  return isDateOnly(event.start_date) ? event.start_date : null;
}

export function isEventCurrentOnDate(
  event: EventDateFields,
  today: string | Date,
): boolean {
  const lastDate = getEventLastDate(event);
  return lastDate !== null && lastDate >= normalizeDateInput(today);
}

export function isEventDiscoverableOnDate(
  event: EventDateFields,
  today: string | Date,
  maxAgeDays: number,
): boolean {
  const todayString = normalizeDateInput(today);
  const checkedAgeDays = daysBetween(event.source_checked_at, todayString);
  const hasValidVenue =
    event.facility_id !== null || Boolean(event.venue_name?.trim());

  return (
    VISIBLE_EVENT_STATUSES.has(event.status) &&
    isEventCurrentOnDate(event, todayString) &&
    checkedAgeDays !== null &&
    checkedAgeDays >= 0 &&
    checkedAgeDays <= maxAgeDays &&
    /^https?:\/\/\S+$/u.test(event.official_url.trim()) &&
    hasValidVenue
  );
}

export function refreshEventViewsForDate<
  TEvent extends EventDateFields,
  TView extends DateAwareEventView<TEvent>,
>(
  views: readonly TView[],
  today: string,
  maxAgeDays: number,
): TView[] {
  return views
    .filter((view) =>
      isEventDiscoverableOnDate(view.event, today, maxAgeDays),
    )
    .map((view) => ({
      ...view,
      isThisWeekend: isThisWeekend(view.event, today),
      isThisMonth: isThisMonth(view.event, today),
    }));
}

export function getNextEventDate(
  event: Pick<EventDateFields, "end_date" | "occurrence_dates" | "start_date">,
  today: string | Date = getTokyoDateString(),
): string | null {
  const todayString = normalizeDateInput(today);
  if (event.occurrence_dates && event.occurrence_dates.length > 0) {
    return (
      event.occurrence_dates
        .filter((date) => isDateOnly(date) && date >= todayString)
        .sort((a, b) => a.localeCompare(b))[0] ?? null
    );
  }
  if (!isDateOnly(event.start_date)) return null;
  const endDate = isDateOnly(event.end_date) ? event.end_date : event.start_date;
  if (endDate < todayString) return null;
  return event.start_date <= todayString ? todayString : event.start_date;
}

export function isThisWeekend(
  event: Pick<EventDateFields, "end_date" | "occurrence_dates" | "start_date">,
  today: string | Date = getTokyoDateString(),
): boolean {
  const todayMs = parseDateOnly(normalizeDateInput(today));
  if (todayMs === null) return false;
  const day = new Date(todayMs).getUTCDay();
  const daysUntilSaturday = day === 0 ? -1 : 6 - day;
  const saturday = todayMs + daysUntilSaturday * DAY_MS;
  const sunday = saturday + DAY_MS;
  return eventDateRangeIntersects(event, saturday, sunday);
}

export function isThisMonth(
  event: Pick<EventDateFields, "end_date" | "occurrence_dates" | "start_date">,
  today: string | Date = getTokyoDateString(),
): boolean {
  const todayMs = parseDateOnly(normalizeDateInput(today));
  if (todayMs === null) return false;
  const todayDate = new Date(todayMs);
  const monthStart = Date.UTC(
    todayDate.getUTCFullYear(),
    todayDate.getUTCMonth(),
    1,
  );
  const monthEnd = Date.UTC(
    todayDate.getUTCFullYear(),
    todayDate.getUTCMonth() + 1,
    0,
  );
  return eventDateRangeIntersects(event, monthStart, monthEnd);
}

function normalizeDateInput(date: string | Date): string {
  return typeof date === "string" ? date : getTokyoDateString(date);
}

function daysBetween(fromDate: string, toDate: string): number | null {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (from === null || to === null) return null;
  return Math.floor((to - from) / DAY_MS);
}

function isDateOnly(value: string | null | undefined): value is string {
  return typeof value === "string" && parseDateOnly(value) !== null;
}

function parseDateOnly(value: string | null): number | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = Date.UTC(year, month - 1, day);
  const canonical = new Date(parsed).toISOString().slice(0, 10);
  return canonical === value ? parsed : null;
}

function eventDateRangeIntersects(
  event: Pick<EventDateFields, "end_date" | "occurrence_dates" | "start_date">,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  if (event.occurrence_dates && event.occurrence_dates.length > 0) {
    return event.occurrence_dates.some((date) => {
      const occurrence = parseDateOnly(date);
      return (
        occurrence !== null && occurrence >= rangeStart && occurrence <= rangeEnd
      );
    });
  }
  const start = parseDateOnly(event.start_date);
  if (start === null) return false;
  const end = parseDateOnly(event.end_date) ?? start;
  return start <= rangeEnd && end >= rangeStart;
}
