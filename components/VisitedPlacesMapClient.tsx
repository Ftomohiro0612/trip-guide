"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { VisitedPlaceFacility } from "@/lib/visited-places";

export type VisitedPlacesMapHeight =
  | number
  | {
      mobile: number;
      desktop: number;
    };

type Props = {
  visitedFacilities: VisitedPlaceFacility[];
  height: VisitedPlacesMapHeight;
  showDetailLink?: boolean;
};

const VisitedPlacesMap = dynamic(() => import("./VisitedPlacesMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-sky-50 to-emerald-50 px-4 text-center">
      <div>
        <p className="text-2xl" aria-hidden>
          🗺️
        </p>
        <p className="mt-1 text-sm text-slate-500">地図を読み込んでいます…</p>
      </div>
    </div>
  ),
});

function heightStyle(height: VisitedPlacesMapHeight): CSSProperties {
  const mobile = typeof height === "number" ? height : height.mobile;
  const desktop = typeof height === "number" ? height : height.desktop;

  return {
    "--visited-map-height-mobile": `${mobile}px`,
    "--visited-map-height-desktop": `${desktop}px`,
  } as CSSProperties;
}

export default function VisitedPlacesMapClient({
  visitedFacilities,
  height,
  showDetailLink = false,
}: Props) {
  const hasFacilities = visitedFacilities.length > 0;

  return (
    <section className="space-y-2" data-testid="visited-places-map">
      {hasFacilities ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className="h-[var(--visited-map-height-mobile)] w-full sm:h-[var(--visited-map-height-desktop)]"
            style={heightStyle(height)}
          >
            <VisitedPlacesMap visitedFacilities={visitedFacilities} />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className="grid h-[var(--visited-map-height-mobile)] w-full place-items-center bg-gradient-to-br from-sky-50 to-emerald-50 px-4 py-6 text-center sm:h-[var(--visited-map-height-desktop)]"
            style={heightStyle(height)}
          >
            <div>
              <p className="text-3xl" aria-hidden>
                🗺️
              </p>
              <p className="mt-2 text-sm text-slate-500">
                記録すると、家族のおでかけの足あとがここに残ります
              </p>
              <Link
                href="/mypage/visits/new"
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                最初のおでかけを記録する
              </Link>
            </div>
          </div>
        </div>
      )}

      {showDetailLink && (
        <div className="text-right">
          <Link
            href="/mypage/visits"
            className="text-sm font-medium text-brand hover:underline"
          >
            おでかけ履歴を見る →
          </Link>
        </div>
      )}
    </section>
  );
}
