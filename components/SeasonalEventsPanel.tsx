"use client";

import Link from "next/link";
import { useMemo } from "react";
import CompactEventCard from "@/components/CompactEventCard";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate } from "@/lib/event-dates";
import {
  getCompactEventAppealTags,
  selectChildEventViews,
  selectSeasonalEventViews,
} from "@/lib/event-discovery";
import type { EventView } from "@/lib/events";

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
  const selection = useMemo(() => {
    const renderDate = today ?? referenceDate;
    const currentViews = today
      ? refreshEventViewsForDate(views, today, maxAgeDays)
      : views;
    const seasonal = selectSeasonalEventViews(currentViews, renderDate);
    const child = selectChildEventViews(
      currentViews,
      renderDate,
      new Set(seasonal.map((view) => view.event.id)),
    );
    return { child, seasonal };
  }, [maxAgeDays, referenceDate, today, views]);

  if (!today) return null;

  if (placement === "events") {
    if (selection.child.picks.length === 0) return null;
    return (
      <section
        data-seasonal-panel="child-events"
        data-access-date={today}
        aria-labelledby="child-events-heading-events"
        className="mt-10 border-t border-slate-200 pt-7"
      >
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2
            id="child-events-heading-events"
            className="text-lg font-bold text-slate-900"
          >
            子どもが喜ぶおすすめイベント
          </h2>
          <Link href="/events" className="text-sm font-bold text-brand hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {selection.child.picks.map((pick) => (
            <CompactEventCard
              key={pick.view.event.id}
              view={pick.view}
              appealTags={pick.matchedTags}
              horizontal
            />
          ))}
        </div>
      </section>
    );
  }

  if (selection.seasonal.length === 0 && selection.child.picks.length === 0) {
    return null;
  }

  return (
    <div data-access-date={today} className="grid gap-9">
      {selection.seasonal.length > 0 ? (
        <section
          data-seasonal-panel="events"
          aria-labelledby="seasonal-events-heading-home"
          className="py-2"
        >
          <SectionHeading
            id="seasonal-events-heading-home"
            eyebrow="今日・今週末どこへ行く？"
            title="季節・週末のイベント"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selection.seasonal.map((view) => (
              <CompactEventCard
                key={view.event.id}
                view={view}
                appealTags={getCompactEventAppealTags(view.event)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {selection.child.picks.length > 0 ? (
        <section
          data-seasonal-panel="child-events"
          aria-labelledby="child-events-heading-home"
          className="py-2"
        >
          <SectionHeading
            id="child-events-heading-home"
            eyebrow="子どもの「好き」から選ぶ"
            title="子どもが喜ぶおすすめイベント"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selection.child.picks.map((pick) => (
              <CompactEventCard
                key={pick.view.event.id}
                view={pick.view}
                appealTags={pick.matchedTags}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  id,
  title,
}: {
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="text-xs font-bold text-rose-700">{eyebrow}</p>
        <h2
          id={id}
          className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          {title}
        </h2>
      </div>
      <Link
        href="/events"
        className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
      >
        イベントをもっと見る →
      </Link>
    </div>
  );
}
