"use client";

import { useEffect, useState } from "react";
import MapViewClient from "@/components/MapViewClient";
import type { Facility } from "@/types/facility";

interface Props {
  facilities: Facility[];
  heading?: string;
}

export default function ResponsiveResultsMap({
  facilities,
  heading = "このページの施設を地図で見る",
}: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <section className="mt-8" aria-labelledby="results-map-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="results-map-heading" className="text-xl font-bold text-slate-900">
          📍 {heading}
          <span className="ml-2 text-sm font-normal text-slate-500">
            {facilities.length}件
          </span>
        </h2>
        {!isDesktop && (
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
            aria-expanded={mobileOpen}
            aria-controls="results-map-panel"
          >
            {mobileOpen ? "地図を閉じる" : "地図で見る"}
          </button>
        )}
      </div>

      {(isDesktop || mobileOpen) && (
        <div id="results-map-panel" className="mt-3">
          <MapViewClient facilities={facilities} height={420} />
        </div>
      )}
    </section>
  );
}
