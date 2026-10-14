"use client";

import { useEffect, useId, useState } from "react";
import DiscoveryMap from "@/components/DiscoveryMap";
import type { MapFacility } from "@/lib/map-facilities";

interface Props {
  dataHref?: string;
  points?: MapFacility[];
  highlightedPoint?: MapFacility;
  heading?: string;
  totalItems: number;
  height?: number;
  storageKey?: string;
  enableAreaSearch?: boolean;
}

export default function ResponsiveDiscoveryMap({
  heading = "該当する施設を地図で見る",
  totalItems,
  ...mapProps
}: Props) {
  const headingId = useId();
  const panelId = useId();
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
    <section className="mt-8" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-bold text-slate-900">
          📍 {heading}
          <span className="ml-2 text-sm font-normal text-slate-500">
            {totalItems.toLocaleString("ja-JP")}施設
          </span>
        </h2>
        {!isDesktop && (
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm"
            aria-expanded={mobileOpen}
            aria-controls={panelId}
          >
            {mobileOpen ? "地図を閉じる" : "地図で見る"}
          </button>
        )}
      </div>

      {(isDesktop || mobileOpen) && (
        <div id={panelId} className="mt-3">
          <DiscoveryMap expectedCount={totalItems} {...mapProps} />
        </div>
      )}
    </section>
  );
}
