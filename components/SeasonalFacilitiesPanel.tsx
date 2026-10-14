"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTokyoToday } from "@/components/useTokyoToday";
import { selectSeasonalFacilities } from "@/lib/seasonal-facilities";
import type { Facility } from "@/types/facility";

export default function SeasonalFacilitiesPanel({
  facilities,
  referenceDate,
}: {
  facilities: Facility[];
  referenceDate: string;
}) {
  const today = useTokyoToday();
  const picks = useMemo(
    () => selectSeasonalFacilities(facilities, today ?? referenceDate),
    [facilities, referenceDate, today],
  );

  if (!today || picks.length === 0) return null;

  return (
    <section
      data-seasonal-panel="facilities"
      data-access-date={today}
      aria-labelledby="seasonal-facilities-heading-home"
      className="py-2"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-emerald-700">今だから楽しめる</p>
          <h2
            id="seasonal-facilities-heading-home"
            className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            今の季節におすすめの施設
          </h2>
        </div>
        <Link
          href="/tag/seasonal"
          className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
        >
          季節の施設をもっと見る →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map(({ facility, reason }) => (
          <Link
            key={facility.id}
            href={`/facilities/${facility.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <p className="text-xs font-bold text-slate-500">
              {facility.prefecture}・{facility.category}
            </p>
            <h3 className="mt-1 text-base font-bold text-slate-900 group-hover:text-brand">
              {facility.name}
            </h3>
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold leading-relaxed text-emerald-900">
              {reason}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
