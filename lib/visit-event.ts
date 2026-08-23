export type PostgrestErrorLike = {
  code?: string | null;
  message?: string | null;
};

export type VisitEventSnapshot = {
  event_id?: string | null;
  event_title_snapshot?: string | null;
  event_date_label_snapshot?: string | null;
  event_venue_name_snapshot?: string | null;
  event_prefecture_label_snapshot?: string | null;
};

export type EventVisitPrefill = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string | null;
  visitedOn: string;
  venueName: string;
  prefectureLabel: string;
  facilitySlug: string | null;
};

const EVENT_FACILITY_SLUG_PREFIX = "event-";
const EVENT_SNAPSHOT_COLUMNS = [
  "event_id",
  "event_title_snapshot",
  "event_date_label_snapshot",
  "event_venue_name_snapshot",
  "event_prefecture_label_snapshot",
];

export function makeEventFacilitySlug(eventId: string): string {
  const encodedId = encodeURIComponent(eventId.trim()).replaceAll("%", "_");
  return `${EVENT_FACILITY_SLUG_PREFIX}${encodedId.slice(0, 180) || "unknown"}`;
}

export function isEventFacilitySlug(slug: string): boolean {
  return slug.startsWith(EVENT_FACILITY_SLUG_PREFIX);
}

export function isMissingVisitEventSnapshotColumnError(
  error: PostgrestErrorLike | null | undefined,
): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";
  const mentionsSnapshotColumn = EVENT_SNAPSHOT_COLUMNS.some((column) =>
    message.includes(column),
  );
  if (!mentionsSnapshotColumn) return false;

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}

export function visitDisplayName(
  visit: VisitEventSnapshot & { facility_name: string },
): string {
  return visit.event_id && visit.event_title_snapshot?.trim()
    ? visit.event_title_snapshot
    : visit.facility_name;
}
