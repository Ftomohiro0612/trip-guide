"use client";

import { useState } from "react";
import Link from "next/link";
import { useCrosslinkAnalytics } from "@/components/useCrosslinkAnalytics";
import {
  EVENT_TO_FACILITY_INITIAL_LIMIT,
  formatStraightLineDistance,
  type EventFacilityRecommendation,
} from "@/lib/event-facility-crosslinks";

interface EventNearbyFacilitiesProps {
  eventId: string;
  recommendations: readonly EventFacilityRecommendation[];
}

export default function EventNearbyFacilities({
  eventId,
  recommendations,
}: EventNearbyFacilitiesProps) {
  const [expanded, setExpanded] = useState(false);
  const { sectionRef, trackClick } = useCrosslinkAnalytics(
    "event_to_facility",
    recommendations.length,
  );
  if (recommendations.length === 0) return null;

  const visibleRecommendations = expanded
    ? recommendations
    : recommendations.slice(0, EVENT_TO_FACILITY_INITIAL_LIMIT);
  const hasMore = recommendations.length > EVENT_TO_FACILITY_INITIAL_LIMIT;
  const headingId = `event-nearby-facilities-${eventId}`;

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      data-crosslink-section="event_to_facility"
      data-crosslink-item-count={recommendations.length}
      className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="text-[11px] font-bold text-emerald-700">
            イベント前後のおでかけ候補
          </p>
          <h3
            id={headingId}
            className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg"
          >
            このイベントと一緒に行ける周辺スポット
          </h3>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 sm:max-w-64 sm:text-right">
          距離はイベント会場または会場代表点からの直線距離の目安です。
        </p>
      </div>

      <ul
        id={`${headingId}-items`}
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {visibleRecommendations.map((recommendation, index) => (
          <li key={recommendation.facilityId}>
            <Link
              href={`/facilities/${recommendation.facilitySlug}`}
              onClick={() => trackClick(index + 1)}
              data-crosslink-position={index + 1}
              className="group flex h-full min-h-24 flex-col rounded-md border border-emerald-100 bg-white px-3 py-2.5 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">
                  {recommendation.category}
                </span>
                {recommendation.isRainOption ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    ☂️ 雨の日候補
                  </span>
                ) : null}
              </span>
              <span className="mt-1 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-800">
                {recommendation.facilityName}
              </span>
              <span className="mt-auto pt-1.5 text-xs font-bold text-emerald-700">
                {formatStraightLineDistance(recommendation.distanceKm)} →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${headingId}-items`}
          data-crosslink-expand
          onClick={() => setExpanded((current) => !current)}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
        >
          {expanded
            ? "表示を戻す"
            : `さらに見る（あと${recommendations.length - EVENT_TO_FACILITY_INITIAL_LIMIT}件）`}
        </button>
      ) : null}
    </section>
  );
}
