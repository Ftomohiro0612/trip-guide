"use client";

import { useCrosslinkAnalytics } from "@/components/useCrosslinkAnalytics";
import {
  formatStraightLineDistance,
  type FacilityEventRecommendation,
} from "@/lib/event-facility-crosslinks";
import { getSummerEventAnchorId } from "@/lib/summer-event-hub";

const EVENT_TYPE_LABELS: Record<string, string> = {
  fireworks: "花火大会",
  summer_festival: "夏祭り・盆踊り",
  summer_tradition: "縁日・灯籠・風鈴",
  night_outing: "夜のおでかけ",
};

interface FacilityNearbySummerEventsProps {
  recommendations: readonly FacilityEventRecommendation[];
}

export default function FacilityNearbySummerEvents({
  recommendations,
}: FacilityNearbySummerEventsProps) {
  const { sectionRef, trackClick } = useCrosslinkAnalytics(
    "facility_to_event",
    recommendations.length,
  );
  if (recommendations.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="rounded-[2rem] bg-indigo-50/70 p-5 shadow-sm ring-1 ring-indigo-100 sm:p-8"
      aria-labelledby="facility-nearby-summer-events-heading"
      data-crosslink-section="facility_to_event"
      data-crosslink-item-count={recommendations.length}
    >
      <p className="text-xs font-black tracking-[0.18em] text-indigo-600">
        この施設とあわせて楽しめそう
      </p>
      <h2
        id="facility-nearby-summer-events-heading"
        className="mt-1 text-2xl font-black text-slate-950"
      >
        近くで開催予定の夏イベント
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        距離は施設からイベント会場または会場代表点までの直線距離の目安です。
      </p>

      <ul className="mt-4 grid gap-2.5">
        {recommendations.map((recommendation, index) => (
          <li key={recommendation.eventId}>
            <a
              href={`/events/summer#${getSummerEventAnchorId(recommendation.eventId)}`}
              onClick={() => trackClick(index + 1)}
              data-crosslink-position={index + 1}
              className="group flex min-h-20 flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                    {recommendation.eventType
                      ? EVENT_TYPE_LABELS[recommendation.eventType] ??
                        "夏イベント"
                      : "夏イベント"}
                  </span>
                  <span className="text-slate-500">
                    次回 {formatDate(recommendation.nextDate)}
                  </span>
                </span>
                <span className="mt-1 block text-sm font-bold leading-snug text-slate-900 group-hover:text-indigo-800 sm:text-base">
                  {recommendation.title}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-indigo-700">
                {formatStraightLineDistance(recommendation.distanceKm)} →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}
