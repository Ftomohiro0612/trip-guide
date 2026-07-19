import "server-only";

import { haversineDistanceKm } from "@/lib/distance";
import {
  getBuildDateString,
  getNextEventDate,
  getVisibleSummerHubEvents,
} from "@/lib/events";
import { facilities } from "@/lib/facilities";
import {
  deriveSummerCrosslinks,
  type CrosslinkEventInput,
  type CrosslinkLocationInput,
  type SummerCrosslinkResult,
} from "@/lib/event-facility-crosslinks";
import { summerEventLocationOverlay } from "@/lib/summer-event-locations";

const resultByDate = new Map<string, SummerCrosslinkResult>();

export function getSummerCrosslinkData(
  today = getBuildDateString(),
): SummerCrosslinkResult {
  const cached = resultByDate.get(today);
  if (cached) return cached;

  const events: CrosslinkEventInput[] = getVisibleSummerHubEvents(today).map(
    (event) => ({
      id: event.id,
      facility_id: event.facility_id,
      title: event.title,
      event_type: event.event_type,
      recommended_for_tags: event.recommended_for_tags,
      nextDate: getNextEventDate(event, today),
    }),
  );
  const result = deriveSummerCrosslinks({
    events,
    facilities,
    locationsByEventId: summerEventLocationOverlay.locations_by_event_id as Record<
      string,
      CrosslinkLocationInput
    >,
    today,
    calculateDistanceKm: haversineDistanceKm,
  });
  resultByDate.set(today, result);
  return result;
}
