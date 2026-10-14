"use client";

import { useMemo } from "react";
import CompactEventCard from "@/components/CompactEventCard";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate, getNextEventDate } from "@/lib/event-dates";
import { getCompactEventAppealTags } from "@/lib/event-discovery";
import type { EventView } from "@/lib/events";

export default function LandingEventPicks({
  heading,
  maxAgeDays,
  referenceDate,
  views,
}: {
  heading: string;
  maxAgeDays: number;
  referenceDate: string;
  views: EventView[];
}) {
  const today = useTokyoToday();
  const accessDate = today ?? referenceDate;
  const currentViews = useMemo(() => {
    return refreshEventViewsForDate(views, accessDate, maxAgeDays)
      .slice()
      .sort((left, right) => {
        const leftDate = getNextEventDate(left.event, accessDate) ?? "9999-12-31";
        const rightDate = getNextEventDate(right.event, accessDate) ?? "9999-12-31";
        return leftDate.localeCompare(rightDate) || left.event.id.localeCompare(right.event.id);
      })
      .slice(0, 3);
  }, [accessDate, maxAgeDays, views]);

  if (currentViews.length === 0) return null;

  return (
    <div className="mt-5" data-landing-event-picks data-access-date={accessDate}>
      <h3 className="text-sm font-bold text-slate-900">{heading}</h3>
      <div className="mt-2 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {currentViews.map((view) => (
          <CompactEventCard
            key={view.event.id}
            view={view}
            appealTags={getCompactEventAppealTags(view.event)}
            horizontal
          />
        ))}
      </div>
    </div>
  );
}
