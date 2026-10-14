"use client";

import Link from "next/link";
import { useMemo } from "react";
import EventCard from "@/components/EventCard";
import { useTokyoToday } from "@/components/useTokyoToday";
import {
  getNextEventDate,
  isThisWeekend,
  refreshEventViewsForDate,
} from "@/lib/event-dates";
import type { EventView } from "@/lib/events";

const panelClass =
  "overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 px-5 py-7 shadow-xl shadow-red-100/50 sm:px-8 sm:py-9 lg:px-10";
const linkClass =
  "inline-flex min-h-11 items-center rounded-full bg-red-800 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700";

export default function SeasonalEventsPanel({
  views,
  referenceDate,
  maxAgeDays,
  placement,
}: {
  views: EventView[];
  referenceDate: string;
  maxAgeDays: number;
  placement: "home" | "events";
}) {
  const today = useTokyoToday();
  const renderDate = today ?? referenceDate;
  const selectedViews = useMemo(() => {
    const currentViews = today
      ? refreshEventViewsForDate(views, today, maxAgeDays)
      : views;
    const eventPrefectures = new Set<string>();

    return currentViews
      .flatMap((view) => {
        const nextDate = getNextEventDate(view.event, renderDate);
        if (nextDate === null) return [];
        const occurrenceCount = view.event.occurrence_dates?.length ?? 0;
        const startDate = view.event.start_date ?? nextDate;
        const duration =
          occurrenceCount ||
          (Date.parse(view.event.end_date ?? startDate) -
            Date.parse(startDate)) /
            86_400_000 +
            1;
        if (occurrenceCount === 0 && duration > 92) return [];
        return [{ view, nextDate, duration }];
      })
      .sort((a, b) => {
        const weekendOrder =
          Number(isThisWeekend(b.view.event, renderDate)) -
          Number(isThisWeekend(a.view.event, renderDate));
        return (
          weekendOrder ||
          a.nextDate.localeCompare(b.nextDate) ||
          a.duration - b.duration ||
          a.view.event.id.localeCompare(b.view.event.id)
        );
      })
      .filter(({ view }) => {
        if (eventPrefectures.has(view.event.prefecture)) return false;
        eventPrefectures.add(view.event.prefecture);
        return true;
      })
      .slice(0, 3)
      .map(({ view }) => view);
  }, [maxAgeDays, renderDate, today, views]);

  if (selectedViews.length === 0) return null;

  return (
    <section
      data-seasonal-panel="events"
      aria-labelledby={`seasonal-events-heading-${placement}`}
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
      className={panelClass}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2
          id={`seasonal-events-heading-${placement}`}
          className="text-2xl font-bold tracking-tight text-red-950 sm:text-3xl"
        >
          季節・週末のイベント
        </h2>
        <Link href="/events" className={linkClass}>
          イベントをもっと見る →
        </Link>
      </div>
      <div className="grid gap-4">
        {selectedViews.map((view) => (
          <EventCard key={view.event.id} view={view} />
        ))}
      </div>
    </section>
  );
}
