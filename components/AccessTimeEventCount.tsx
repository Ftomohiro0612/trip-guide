"use client";

import { useEventViews } from "@/components/useEventViews";
import type { EventViewsInput } from "@/lib/event-view-payload";

import { useMemo } from "react";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate } from "@/lib/event-dates";

export default function AccessTimeEventCount({
  views: inputViews,
  maxAgeDays,
}: {
  views: EventViewsInput;
  maxAgeDays: number;
}) {
  const views = useEventViews(inputViews);
  const today = useTokyoToday();
  const count = useMemo(
    () =>
      today
        ? refreshEventViewsForDate(views, today, maxAgeDays).length
        : views.length,
    [maxAgeDays, today, views],
  );

  return (
    <p
      className="mt-3 text-xs font-medium text-slate-500"
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
      data-access-event-count
    >
      掲載中 {count}件
    </p>
  );
}
