"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTokyoToday } from "@/components/useTokyoToday";
import { selectSeasonalFacilities } from "@/lib/seasonal-facilities";
import type { Facility } from "@/types/facility";

export default function LandingSeasonalPicks({
  diversity,
  facilities,
  heading = "今の季節に合う候補",
  referenceDate,
}: {
  diversity: "both" | "prefecture" | "category" | "none";
  facilities: Facility[];
  heading?: string;
  referenceDate: string;
}) {
  const today = useTokyoToday();
  const accessDate = today ?? referenceDate;
  const picks = useMemo(
    () => selectSeasonalFacilities(facilities, accessDate, 3, diversity),
    [accessDate, diversity, facilities],
  );

  if (picks.length === 0) return null;

  return (
    <div className="mt-5" data-landing-seasonal-picks data-access-date={accessDate}>
      <h3 className="text-sm font-bold text-slate-900">{heading}</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {picks.map(({ facility, reason }) => (
          <Link
            key={facility.id}
            href={`/facilities/${facility.slug}`}
            className="rounded-xl border border-emerald-200 bg-white p-3 hover:border-emerald-400"
          >
            <p className="text-xs font-bold leading-5 text-emerald-800">{reason}</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{facility.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
