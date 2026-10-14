"use client";

import Link from "next/link";
import { useMemo } from "react";
import FacilityEventCard from "@/components/FacilityEventCard";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate } from "@/lib/event-dates";
import type { EventView } from "@/lib/events";

export default function FacilityEventsClient({
  views,
  maxAgeDays,
  prefecture,
}: {
  views: EventView[];
  maxAgeDays: number;
  prefecture?: { id: string; name: string };
}) {
  const today = useTokyoToday();
  const currentViews = useMemo(
    () =>
      (today
        ? refreshEventViewsForDate(views, today, maxAgeDays)
        : views
      ).slice(0, 3),
    [maxAgeDays, today, views],
  );

  if (currentViews.length === 0) return null;

  return (
    <section
      className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-8"
      aria-labelledby="facility-events-heading"
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
    >
      <p className="text-xs font-black tracking-[0.18em] text-amber-600">UPCOMING EVENTS</p>
      <h2 id="facility-events-heading" className="mt-1 mb-4 text-2xl font-black text-slate-950">
        この施設の今後のイベント
      </h2>
      <div className="grid gap-3">
        {currentViews.map((view) => (
          <FacilityEventCard key={view.event.id} view={view} />
        ))}
      </div>
      {prefecture ? (
        <Link
          href={`/events/${prefecture.id}`}
          className="mt-3 inline-flex text-sm font-bold text-brand hover:text-brand-dark hover:underline"
        >
          {prefecture.name}のイベントをもっと見る →
        </Link>
      ) : null}
    </section>
  );
}
