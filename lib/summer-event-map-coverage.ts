import type { EventItem } from "@/lib/events";
import type { SummerEventMapPoint } from "@/lib/summer-event-locations";

export interface SummerEventMapCoverage {
  listedCount: number;
  mappedCount: number;
  unmappedCount: number;
}

export function getSummerEventMapCoverage(
  visibleEvents: readonly EventItem[],
  mapPoints: readonly SummerEventMapPoint[],
): SummerEventMapCoverage {
  const listedIds = new Set(visibleEvents.map((event) => event.id));
  const mappedIds = new Set(mapPoints.map((point) => point.eventId));

  if (mappedIds.size !== mapPoints.length) {
    throw new Error("Summer event map points must use unique event IDs.");
  }
  for (const eventId of mappedIds) {
    if (!listedIds.has(eventId)) {
      throw new Error(`Summer event map point is not listed: ${eventId}`);
    }
  }

  return {
    listedCount: visibleEvents.length,
    mappedCount: mapPoints.length,
    unmappedCount: visibleEvents.length - mapPoints.length,
  };
}
