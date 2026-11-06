import type { EventItem, EventView } from "@/lib/events";

// Only fields used by cards, search, date refresh and seasonal selection cross
// the client boundary. Research evidence stays in the canonical server data.
const EVENT_FIELDS = [
  "id",
  "facility_id",
  "venue_name",
  "prefecture",
  "title",
  "summary",
  "start_date",
  "end_date",
  "date_label",
  "time_label",
  "price_label",
  "reservation_label",
  "age_label",
  "recommended_for_tags",
  "recommended_for_label",
  "recommended_for_note",
  "is_free",
  "is_indoor",
  "reservation",
  "tags",
  "official_url",
  "source_checked_at",
  "status",
  "event_type",
  "occurrence_dates",
] as const satisfies readonly (keyof EventItem)[];

type EventDisplayItem = Pick<EventItem, (typeof EVENT_FIELDS)[number]>;
export type EventDisplayView = Omit<EventView, "event"> & {
  event: EventDisplayItem;
};

type PackedEventView = [
  event: EventDisplayItem[keyof EventDisplayItem][],
  facilityName: EventView["facilityName"],
  facilitySlug: EventView["facilitySlug"],
  venueName: EventView["venueName"],
  prefectureLabel: EventView["prefectureLabel"],
  discoveryType: EventView["discoveryType"],
  isThisWeekend: boolean,
  isThisMonth: boolean,
];

export interface PackedEventViews {
  rows: PackedEventView[];
}

export type EventViewsInput = EventView[] | PackedEventViews;

export function packEventViews(views: readonly EventView[]): PackedEventViews {
  return {
    rows: views.map((view) => [
      EVENT_FIELDS.map((field) => view.event[field]),
      view.facilityName,
      view.facilitySlug,
      view.venueName,
      view.prefectureLabel,
      view.discoveryType,
      view.isThisWeekend,
      view.isThisMonth,
    ]),
  };
}

export function unpackEventViews(input: EventViewsInput): EventDisplayView[] {
  if (Array.isArray(input)) return input;
  return input.rows.map(([
    values, facilityName, facilitySlug, venueName, prefectureLabel,
    discoveryType, isThisWeekend, isThisMonth,
  ]) => ({
    event: Object.fromEntries(
      EVENT_FIELDS.map((field, index) => [field, values[index]]),
    ) as EventDisplayItem,
    facilityName,
    facilitySlug,
    venueName,
    prefectureLabel,
    discoveryType,
    isThisWeekend,
    isThisMonth,
  }));
}

