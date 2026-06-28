import eventsJson from "@/data/events_data.json";
import { facilities, getPrefectureMeta } from "@/lib/facilities";
import type {
  Facility,
  PrefectureId,
  RecommendedForTag,
} from "@/types/facility";

export type EventStatus =
  | "scheduled"
  | "ongoing"
  | "ended"
  | "draft"
  | "cancelled";

export type EventPrefecture = Extract<
  PrefectureId,
  | "tokyo"
  | "kanagawa"
  | "yamanashi"
  | "shizuoka"
  | "nagano"
  | "chiba"
  | "saitama"
  | "ibaraki"
  | "gunma"
  | "osaka"
  | "hyogo"
  | "kyoto"
  | "aichi"
  | "fukuoka"
  | "hiroshima"
>;

export type EventReservation = "not_required" | "required" | "unknown";

export interface EventItem {
  id: string;
  facility_id: number;
  prefecture: EventPrefecture;
  title: string;
  summary: string;
  start_date: string | null;
  end_date: string | null;
  date_label: string;
  time_label: string | null;
  price_label: string | null;
  reservation_label: string | null;
  age_label: string | null;
  recommended_for_tags: RecommendedForTag[];
  recommended_for_label: string | null;
  recommended_for_note: string | null;
  is_free: boolean | null;
  is_indoor: boolean | null;
  reservation: EventReservation;
  tags: string[];
  official_url: string;
  source_urls: string[];
  source_checked_at: string;
  source_notes: string;
  status: EventStatus;
  display_priority: number;
  image: string | null;
}

export interface EventView {
  event: EventItem;
  facilityName: string | null;
  facilitySlug: string | null;
  prefectureLabel: string;
  isThisWeekend: boolean;
  isThisMonth: boolean;
}

interface EventsData {
  metadata: {
    purpose: string;
    total_events: number;
    prefectures: EventPrefecture[];
    freshness_days_page: number;
    freshness_days_top_x: number;
  };
  events: EventItem[];
}

export const eventsData = eventsJson as EventsData;
export const events = eventsData.events;
export const eventPrefectures = eventsData.metadata.prefectures;
export const EVENT_PAGE_MAX_AGE_DAYS = eventsData.metadata.freshness_days_page;
export const EVENT_TOP_X_MAX_AGE_DAYS =
  eventsData.metadata.freshness_days_top_x;

const VISIBLE_STATUSES = new Set<EventStatus>(["scheduled", "ongoing"]);
const facilityIdSet = new Set(facilities.map((facility) => facility.id));
const facilityById = new Map(facilities.map((facility) => [facility.id, facility]));

export function getBuildDateString(date = new Date()): string {
  // 日本向けサイトのため "今日" は Asia/Tokyo 基準で判定する。
  // Vercel ビルドサーバは UTC のため、日本で当日確認したイベントが
  // 未来(age<0)扱いになり非表示になる問題があった。
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

export function isVisibleEvent(
  event: EventItem,
  today: string | Date,
  maxAgeDays: number,
  facilityIds: Set<number>,
): boolean {
  const todayString = normalizeDateInput(today);
  const checkedAgeDays = daysBetween(event.source_checked_at, todayString);

  return (
    VISIBLE_STATUSES.has(event.status) &&
    (event.end_date === null || event.end_date >= todayString) &&
    checkedAgeDays !== null &&
    checkedAgeDays >= 0 &&
    checkedAgeDays <= maxAgeDays &&
    /^https?:\/\/\S+$/u.test(event.official_url.trim()) &&
    facilityIds.has(event.facility_id)
  );
}

export function getVisibleEvents(
  today = getBuildDateString(),
  maxAgeDays = EVENT_PAGE_MAX_AGE_DAYS,
): EventItem[] {
  return events
    .filter((event) => isVisibleEvent(event, today, maxAgeDays, facilityIdSet))
    .sort(compareEventsByStartDate);
}

export function getVisibleEventsByPrefecture(
  prefecture: EventPrefecture,
  today = getBuildDateString(),
  maxAgeDays = EVENT_PAGE_MAX_AGE_DAYS,
): EventItem[] {
  return getVisibleEvents(today, maxAgeDays).filter(
    (event) => event.prefecture === prefecture,
  );
}

export function getVisibleEventsByFacility(
  facilityId: number,
  today = getBuildDateString(),
  maxAgeDays = EVENT_PAGE_MAX_AGE_DAYS,
  limit = 3,
): EventItem[] {
  return getVisibleEvents(today, maxAgeDays)
    .filter((event) => event.facility_id === facilityId)
    .slice(0, limit);
}

export function getFacilityForEvent(event: EventItem): Facility | undefined {
  return facilityById.get(event.facility_id);
}

export function toEventView(
  event: EventItem,
  today = getBuildDateString(),
): EventView {
  const facility = getFacilityForEvent(event);
  const prefecture = getPrefectureMeta(event.prefecture);

  return {
    event,
    facilityName: facility?.name ?? null,
    facilitySlug: facility?.slug ?? null,
    prefectureLabel: prefecture?.name ?? event.prefecture,
    isThisWeekend: isThisWeekend(event, today),
    isThisMonth: isThisMonth(event, today),
  };
}

export function isEventPrefecture(value: string): value is EventPrefecture {
  return (eventPrefectures as string[]).includes(value);
}

export function isPdfOfficialUrl(url: string) {
  const path = url.split(/[?#]/, 1)[0];
  return path.toLowerCase().endsWith(".pdf");
}

export function isThisWeekend(
  event: EventItem,
  today: string | Date = getBuildDateString(),
): boolean {
  const todayMs = parseDateOnly(normalizeDateInput(today));
  if (todayMs === null) return false;
  const day = new Date(todayMs).getUTCDay();
  const daysUntilSaturday = (6 - day + 7) % 7;
  const saturday = todayMs + daysUntilSaturday * 86_400_000;
  const sunday = saturday + 86_400_000;
  return eventDateRangeIntersects(event, saturday, sunday);
}

export function isThisMonth(
  event: EventItem,
  today: string | Date = getBuildDateString(),
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

function compareEventsByStartDate(a: EventItem, b: EventItem): number {
  if (a.start_date === null && b.start_date === null) {
    return b.display_priority - a.display_priority || a.id.localeCompare(b.id);
  }
  if (a.start_date === null) return 1;
  if (b.start_date === null) return -1;
  return (
    a.start_date.localeCompare(b.start_date) ||
    b.display_priority - a.display_priority ||
    a.id.localeCompare(b.id)
  );
}

function normalizeDateInput(date: string | Date): string {
  return typeof date === "string" ? date : getBuildDateString(date);
}

function daysBetween(fromDate: string, toDate: string): number | null {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (from === null || to === null) return null;
  return Math.floor((to - from) / 86_400_000);
}

function parseDateOnly(value: string | null): number | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function eventDateRangeIntersects(
  event: EventItem,
  rangeStart: number,
  rangeEnd: number,
): boolean {
  const start = parseDateOnly(event.start_date);
  if (start === null) return false;
  const end = parseDateOnly(event.end_date) ?? start;
  return start <= rangeEnd && end >= rangeStart;
}
