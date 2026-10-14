import FacilityEventsClient from "@/components/FacilityEventsClient";
import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getVisibleEventsByFacility,
  isEventPrefecture,
  toEventView,
} from "@/lib/events";
import { getPrefectureMeta } from "@/lib/facilities";
import type { PrefectureId } from "@/types/facility";

interface FacilityEventsProps {
  facilityId: number;
  prefectureId: PrefectureId;
}

export default function FacilityEvents({
  facilityId,
  prefectureId,
}: FacilityEventsProps) {
  const today = getBuildDateString();
  const events = getVisibleEventsByFacility(
    facilityId,
    today,
    EVENT_PAGE_MAX_AGE_DAYS,
    Number.MAX_SAFE_INTEGER,
  );
  if (events.length === 0) return null;

  const prefecture = isEventPrefecture(prefectureId)
    ? getPrefectureMeta(prefectureId)
    : undefined;

  return (
    <FacilityEventsClient
      views={events.map((event) => toEventView(event, today))}
      maxAgeDays={EVENT_PAGE_MAX_AGE_DAYS}
      prefecture={prefecture && { id: prefecture.id, name: prefecture.name }}
    />
  );
}
