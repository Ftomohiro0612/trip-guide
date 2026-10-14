import {
  eventsData as eventsJson,
  summerEventsData as summerEventsJson,
} from "@memorip/runtime-canon";
import { facilities, getPrefectureMeta } from "@/lib/facilities";
import {
  selectSummerHeroEventsByType,
  type SummerHeroEventType,
} from "@/lib/summer-event-hub";
import type {
  Facility,
  PrefectureId,
  RecommendedForTag,
} from "@/types/facility";
import {
  getEventLastDate,
  getNextEventDate,
  getTokyoDateString,
  isThisMonth,
  isThisWeekend,
} from "@/lib/event-dates";
import {
  deriveEventDiscoveryType,
  type EventDiscoveryType,
} from "@/lib/event-discovery";
export { isPdfOfficialUrl } from "@/lib/event-urls";
export {
  getEventLastDate,
  getNextEventDate,
  isThisMonth,
  isThisWeekend,
} from "@/lib/event-dates";

export type EventStatus =
  | "scheduled"
  | "ongoing"
  | "ended"
  | "draft"
  | "cancelled";

export type EventPrefecture = Extract<
  PrefectureId,
  | "tokyo"
  | "tochigi"
  | "niigata"
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
> | "okayama" | "kagawa" | "kumamoto" | "nagasaki" | "oita" | "kagoshima" | "saga" | "miyazaki" | "ehime" | "tokushima" | "kochi" | "hokkaido" | "aomori" | "akita" | "miyagi" | "iwate" | "yamagata" | "fukushima" | "mie" | "gifu" | "toyama" | "ishikawa" | "fukui" | "shiga" | "nara" | "wakayama" | "tottori" | "shimane" | "yamaguchi" | "okinawa";

const EVENT_PREFECTURE_FALLBACK_LABELS: Partial<
  Record<EventPrefecture, string>
> = {
  okayama: "岡山県",
  kagawa: "香川県",
  kumamoto: "熊本県",
  nagasaki: "長崎県",
  oita: "大分県",
  kagoshima: "鹿児島県",
  saga: "佐賀県",
  miyazaki: "宮崎県",
  ehime: "愛媛県",
  tokushima: "徳島県",
  kochi: "高知県",
  hokkaido: "北海道",
  aomori: "青森県",
  akita: "秋田県",
  miyagi: "宮城県",
  iwate: "岩手県",
  yamagata: "山形県",
  fukushima: "福島県",
  mie: "三重県",
  gifu: "岐阜県",
  toyama: "富山県",
  ishikawa: "石川県",
  fukui: "福井県",
  shiga: "滋賀県",
  nara: "奈良県",
  wakayama: "和歌山県",
  tottori: "鳥取県",
  shimane: "島根県",
  yamaguchi: "山口県",
  okinawa: "沖縄県",
};

export type EventReservation = "not_required" | "required" | "unknown";

export type FeatureHubId = "summer-2026";

export type SummerEventType =
  | "fireworks"
  | "summer_festival"
  | "summer_tradition"
  | "night_outing";

export interface EventItem {
  id: string;
  facility_id: number | null;
  venue_name?: string;
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
  event_type?: SummerEventType;
  feature_hubs?: FeatureHubId[];
  occurrence_dates?: string[];
}

export interface EventView {
  event: EventItem;
  facilityName: string | null;
  facilitySlug: string | null;
  venueName: string | null;
  prefectureLabel: string;
  discoveryType: EventDiscoveryType;
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

interface SummerEventSource {
  id: string;
  facility_id: null;
  prefecture: EventPrefecture;
  venue_name: string;
  title: string;
  summary: string;
  event_type: SummerEventType;
  feature_hubs: FeatureHubId[];
  start_date: string;
  end_date: string;
  date_label: string;
  time_label: string | null;
  price_label: string | null;
  reservation_label: string | null;
  is_free: boolean | null;
  reservation: EventReservation;
  tags: string[];
  official_url: string;
  source_urls: string[];
  source_checked_at: string;
  source_notes: string;
  occurrence_dates?: string[];
}

type ExistingEventClassification = Pick<
  EventItem,
  "id" | "event_type" | "feature_hubs" | "occurrence_dates"
> &
  Partial<
    Pick<
      EventItem,
      "official_url" | "source_urls" | "source_checked_at" | "source_notes"
    >
  >;

interface SummerEventsSourceData {
  metadata: {
    hub_id: FeatureHubId;
    research_checked_at: string;
    starts_at: string;
    ends_at: string;
    new_event_count: number;
    existing_event_count: number;
    candidate_count: number;
    freshness_days_hub: number;
    freshness_days_hero: number;
    excluded_existing_event_ids: string[];
    hero_event_ids: string[];
  };
  existing_event_classifications: ExistingEventClassification[];
  events: SummerEventSource[];
}

const baseEventsData = eventsJson as EventsData;
const summerEventsData = summerEventsJson as SummerEventsSourceData;
const summerClassificationsById = new Map(
  summerEventsData.existing_event_classifications.map((classification) => [
    classification.id,
    classification,
  ]),
);
const classifiedBaseEvents = baseEventsData.events.map((event) => ({
  ...event,
  ...summerClassificationsById.get(event.id),
}));
const newSummerEvents = summerEventsData.events.map(normalizeSummerEvent);

export const eventsData: EventsData = {
  metadata: {
    ...baseEventsData.metadata,
    total_events: classifiedBaseEvents.length + newSummerEvents.length,
  },
  events: [...classifiedBaseEvents, ...newSummerEvents],
};
export const events = eventsData.events;
export const eventPrefectures = eventsData.metadata.prefectures;
export const EVENT_PAGE_MAX_AGE_DAYS = eventsData.metadata.freshness_days_page;
export const EVENT_TOP_X_MAX_AGE_DAYS =
  eventsData.metadata.freshness_days_top_x;
export const SUMMER_HUB_ID = summerEventsData.metadata.hub_id;
export const SUMMER_HUB_MAX_AGE_DAYS =
  summerEventsData.metadata.freshness_days_hub;
export const SUMMER_HERO_MAX_AGE_DAYS =
  summerEventsData.metadata.freshness_days_hero;
export const SUMMER_HERO_EVENT_IDS = summerEventsData.metadata.hero_event_ids;
export const SUMMER_RESEARCH_CANDIDATE_COUNT =
  summerEventsData.metadata.candidate_count;

const VISIBLE_STATUSES = new Set<EventStatus>(["scheduled", "ongoing"]);
const facilityIdSet = new Set(facilities.map((facility) => facility.id));
const facilityById = new Map(facilities.map((facility) => [facility.id, facility]));

export function getBuildDateString(date = new Date()): string {
  return getTokyoDateString(date);
}

export function isVisibleEvent(
  event: EventItem,
  today: string | Date,
  maxAgeDays: number,
  facilityIds: Set<number>,
): boolean {
  const todayString = normalizeDateInput(today);
  const checkedAgeDays = daysBetween(event.source_checked_at, todayString);
  const hasValidVenue =
    event.facility_id === null && Boolean(event.venue_name?.trim());
  const hasValidFacility =
    event.facility_id !== null && facilityIds.has(event.facility_id);
  const lastDate = getEventLastDate(event);

  return (
    VISIBLE_STATUSES.has(event.status) &&
    lastDate !== null &&
    lastDate >= todayString &&
    checkedAgeDays !== null &&
    checkedAgeDays >= 0 &&
    checkedAgeDays <= maxAgeDays &&
    /^https?:\/\/\S+$/u.test(event.official_url.trim()) &&
    (hasValidFacility || hasValidVenue)
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

export function getEventById(eventId: string): EventItem | undefined {
  return events.find((event) => event.id === eventId);
}

export function getFacilityForEvent(event: EventItem): Facility | undefined {
  if (event.facility_id === null) return undefined;
  return facilityById.get(event.facility_id);
}

export function getVisibleSummerHubEvents(
  today = getBuildDateString(),
): EventItem[] {
  return getVisibleEvents(today, SUMMER_HUB_MAX_AGE_DAYS)
    .filter((event) => isEventInFeatureHub(event, SUMMER_HUB_ID))
    .sort((a, b) => compareEventsByNextDate(a, b, today));
}

export function getSummerHeroEvents(
  eventType: SummerHeroEventType,
  today = getBuildDateString(),
  limit = 4,
): EventItem[] {
  const visibleMainEvents = getVisibleEvents(today, SUMMER_HERO_MAX_AGE_DAYS)
    .filter(
      (event) =>
        isEventInFeatureHub(event, SUMMER_HUB_ID) &&
        isSummerMainEvent(event),
    )
    .sort((a, b) => compareEventsByNextDate(a, b, today));

  return selectSummerHeroEventsByType(
    visibleMainEvents,
    SUMMER_HERO_EVENT_IDS,
    eventType,
    normalizeDateInput(today),
    limit,
  );
}

export function toEventView(
  event: EventItem,
  today = getBuildDateString(),
): EventView {
  const facility = getFacilityForEvent(event);

  return {
    event,
    facilityName: facility?.name ?? null,
    facilitySlug: facility?.slug ?? null,
    venueName: facility?.name ?? event.venue_name?.trim() ?? null,
    prefectureLabel: getEventPrefectureLabel(event.prefecture),
    discoveryType: deriveEventDiscoveryType(event),
    isThisWeekend: isThisWeekend(event, today),
    isThisMonth: isThisMonth(event, today),
  };
}

export function getEventPrefectureLabel(
  prefecture: EventPrefecture,
): string {
  return (
    getPrefectureMeta(prefecture as PrefectureId)?.name ??
    EVENT_PREFECTURE_FALLBACK_LABELS[prefecture] ??
    prefecture
  );
}

export function isEventPrefecture(value: string): value is EventPrefecture {
  return (eventPrefectures as string[]).includes(value);
}

export function isEventInFeatureHub(
  event: EventItem,
  hubId: FeatureHubId,
): boolean {
  return event.feature_hubs?.includes(hubId) === true;
}

export function isSummerMainEvent(event: EventItem): boolean {
  return (
    event.event_type === "fireworks" ||
    event.event_type === "summer_festival"
  );
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

function compareEventsByNextDate(
  a: EventItem,
  b: EventItem,
  today: string | Date,
): number {
  const nextA = getNextEventDate(a, today);
  const nextB = getNextEventDate(b, today);
  if (nextA === null && nextB === null) {
    return b.display_priority - a.display_priority || a.id.localeCompare(b.id);
  }
  if (nextA === null) return 1;
  if (nextB === null) return -1;
  return (
    nextA.localeCompare(nextB) ||
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

function normalizeSummerEvent(source: SummerEventSource): EventItem {
  const isHeroCandidate = summerEventsData.metadata.hero_event_ids.includes(
    source.id,
  );
  return {
    ...source,
    age_label: "どなたでも（夜間・混雑時は保護者同伴推奨）",
    recommended_for_tags: ["experience", "wide_space"],
    recommended_for_label: "家族で夏の風物詩を楽しみたい子に",
    recommended_for_note:
      "開催日、会場、混雑・荒天時の最新情報を公式サイトで確認してお出かけください。",
    is_indoor: false,
    status: "scheduled",
    display_priority: isHeroCandidate ? 90 : 80,
    image: null,
  };
}
