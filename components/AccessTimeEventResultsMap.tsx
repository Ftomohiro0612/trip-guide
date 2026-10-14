"use client";

import { useMemo } from "react";
import ResponsiveResultsMap from "@/components/ResponsiveResultsMap";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate } from "@/lib/event-dates";
import type { EventView } from "@/lib/events";
import type { Facility } from "@/types/facility";

export default function AccessTimeEventResultsMap({
  entries,
  views,
  maxAgeDays,
}: {
  entries: { facility: Facility; eventIds: string[] }[];
  views: EventView[];
  maxAgeDays: number;
}) {
  const today = useTokyoToday();
  const facilities = useMemo(() => {
    const currentIds = new Set(
      (today
        ? refreshEventViewsForDate(views, today, maxAgeDays)
        : views
      ).map((view) => view.event.id),
    );
    return entries.flatMap(({ facility, eventIds }) =>
      eventIds.some((id) => currentIds.has(id)) ? [facility] : [],
    );
  }, [entries, maxAgeDays, today, views]);

  if (facilities.length === 0) return null;

  return (
    <div
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
    >
      <ResponsiveResultsMap facilities={facilities} heading="地図で探す" />
    </div>
  );
}
