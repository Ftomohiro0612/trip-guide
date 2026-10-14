"use client";

import { useMemo } from "react";
import SummerEventMapClient from "@/components/SummerEventMapClient";
import { useTokyoToday } from "@/components/useTokyoToday";
import {
  getNextEventDate,
  refreshEventViewsForDate,
} from "@/lib/event-dates";
import type { EventView, SummerEventType } from "@/lib/events";
import { getSummerEventAnchorId, selectSummerHeroEventsByType } from "@/lib/summer-event-hub";
import { getSummerEventMapCoverage } from "@/lib/summer-event-map-coverage";
import type { SummerEventMapPoint } from "@/lib/summer-event-locations";

const TYPE_LABELS: Record<SummerEventType, string> = {
  fireworks: "花火大会",
  summer_festival: "夏祭り・盆踊り",
  summer_tradition: "縁日・灯籠・風鈴",
  night_outing: "夜のおでかけ",
};

function useCurrentSummerViews(
  views: EventView[],
  maxAgeDays: number,
) {
  const today = useTokyoToday();
  const currentViews = useMemo(
    () =>
      today ? refreshEventViewsForDate(views, today, maxAgeDays) : views,
    [maxAgeDays, today, views],
  );
  return { currentViews, today };
}

export function SummerAccessSummary({
  views,
  maxAgeDays,
}: {
  views: EventView[];
  maxAgeDays: number;
}) {
  const { currentViews, today } = useCurrentSummerViews(views, maxAgeDays);
  const mainCount = currentViews.filter(
    (view) =>
      view.event.event_type === "fireworks" ||
      view.event.event_type === "summer_festival",
  ).length;
  const prefectureCount = new Set(
    currentViews.map((view) => view.event.prefecture),
  ).size;

  return (
    <div
      className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-indigo-100 sm:text-sm"
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
    >
      <span>全国{prefectureCount}都道府県・{currentViews.length}件を掲載</span>
      <span>花火・夏祭り {mainCount}件</span>
      <span>基準日 {today}</span>
    </div>
  );
}

export function SummerHeroGroups({
  views,
  heroEventIds,
  maxAgeDays,
  referenceDate,
}: {
  views: EventView[];
  heroEventIds: string[];
  maxAgeDays: number;
  referenceDate: string;
}) {
  const { currentViews, today } = useCurrentSummerViews(views, maxAgeDays);
  const renderDate = today ?? referenceDate;
  const viewById = new Map(
    currentViews.map((view) => [view.event.id, view] as const),
  );
  const events = currentViews.map((view) => view.event);
  const groups = [
    {
      type: "fireworks" as const,
      heading: "まもなく開催する花火大会",
    },
    {
      type: "summer_festival" as const,
      heading: "まもなく開催する夏祭り・盆踊り",
    },
  ].map((group) => ({
    ...group,
    events: selectSummerHeroEventsByType(
      events,
      heroEventIds,
      group.type,
      renderDate,
      4,
    ),
  }));

  if (groups.every((group) => group.events.length === 0)) return null;

  return (
    <div
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
    >
      {groups.map((group, index) =>
        group.events.length > 0 ? (
          <div key={group.type} className={index === 0 ? undefined : "mt-10"}>
            <section aria-labelledby={`${group.type}-hero-heading`}>
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-indigo-600">開催日が近い順</p>
                  <h2
                    id={`${group.type}-hero-heading`}
                    className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl"
                  >
                    {group.heading}
                  </h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {group.events.map((event) => {
                  const view = viewById.get(event.id);
                  return (
                    <article
                      key={event.id}
                      data-summer-hero-event={event.id}
                      className="flex min-h-56 flex-col rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                          {event.event_type
                            ? TYPE_LABELS[event.event_type]
                            : "夏イベント"}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {view?.prefectureLabel}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">
                        {event.title}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-indigo-700">
                        {formatHeroDate(getNextEventDate(event, renderDate))}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {view?.venueName}
                      </p>
                      <a
                        href={`#${getSummerEventAnchorId(event.id)}`}
                        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                        aria-label={`${event.title}の詳しい紹介を見る`}
                      >
                        詳しい紹介を見る ↓
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function SummerEventMapSection({
  views,
  points,
  maxAgeDays,
}: {
  views: EventView[];
  points: SummerEventMapPoint[];
  maxAgeDays: number;
}) {
  const { currentViews, today } = useCurrentSummerViews(views, maxAgeDays);
  const currentEventById = new Map(
    currentViews.map((view) => [view.event.id, view.event] as const),
  );
  const currentPoints = points.flatMap((point) => {
    const event = currentEventById.get(point.eventId);
    if (!event || !today) return today ? [] : [point];
    const nextDate = getNextEventDate(event, today);
    return nextDate ? [{ ...point, nextDate }] : [];
  });
  const coverage = getSummerEventMapCoverage(
    currentViews.map((view) => view.event),
    currentPoints,
  );

  return (
    <section
      id="summer-event-map"
      aria-labelledby="summer-event-map-heading"
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
      className="mt-12 scroll-mt-32 sm:scroll-mt-24"
      data-summer-map-listed-count={coverage.listedCount}
      data-summer-map-mapped-count={coverage.mappedCount}
      data-summer-map-unmapped-count={coverage.unmappedCount}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="summer-event-map-heading"
            tabIndex={-1}
            className="mt-1 scroll-mt-32 text-2xl font-bold text-slate-900 sm:scroll-mt-24 sm:text-3xl"
          >
            座標確認済みのイベントを地図で探す
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            掲載中{coverage.listedCount}件のうち、座標確認済み
            {coverage.mappedCount}件を地図に表示しています。残り
            {coverage.unmappedCount}件は下の一覧から確認できます。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
            ● 会場名から確認した座標
          </span>
          <span className="rounded-full border border-dashed border-amber-500 bg-amber-50 px-3 py-1.5 text-amber-800">
            ◌ 河川敷・湖・海岸などの代表点
          </span>
        </div>
      </div>

      <SummerEventMapClient points={currentPoints} />
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        広域会場の点は、正確な打上地点や観覧範囲を示すものではありません。地図が読み込めない場合も、下のイベント一覧は通常どおり利用できます。
      </p>
    </section>
  );
}

function formatHeroDate(value: string | null): string {
  if (!value) return "開催日 公式確認中";
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日開催`;
}
