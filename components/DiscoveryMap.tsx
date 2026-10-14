"use client";

import { useEffect, useRef, useState } from "react";
import MapViewClient from "@/components/MapViewClient";
import type { MapFacility } from "@/lib/map-facilities";

type DiscoveryMapPayload = {
  points: MapFacility[];
  total: number;
};

interface Props {
  dataHref?: string;
  points?: MapFacility[];
  highlightedPoint?: MapFacility;
  expectedCount?: number;
  height?: number;
  storageKey?: string;
  enableAreaSearch?: boolean;
}

export default function DiscoveryMap({
  dataHref,
  points,
  highlightedPoint,
  expectedCount,
  height = 520,
  storageKey,
  enableAreaSearch = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(Boolean(points));
  const [remote, setRemote] = useState<{
    href: string;
    payload: DiscoveryMapPayload;
  } | null>(null);
  const [errorHref, setErrorHref] = useState<string | null>(null);

  useEffect(() => {
    if (shouldLoad || points) return;
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [points, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || points || !dataHref) return;
    const href = dataHref;
    const controller = new AbortController();

    async function loadPoints() {
      try {
        const response = await fetch(href, { signal: controller.signal });
        if (!response.ok) throw new Error("discovery map request failed");
        const payload = (await response.json()) as DiscoveryMapPayload;
        if (!Array.isArray(payload.points) || typeof payload.total !== "number") {
          throw new Error("discovery map response was invalid");
        }
        setRemote({ href, payload });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error(loadError);
        setErrorHref(href);
      }
    }

    void loadPoints();
    return () => controller.abort();
  }, [dataHref, points, shouldLoad]);

  const payload = points
    ? { points, total: expectedCount ?? points.length }
    : remote && remote.href === dataHref
      ? remote.payload
      : null;
  const mapPoints = payload?.points ?? [];
  const mergedPoints =
    highlightedPoint &&
    !mapPoints.some((point) => point.id === highlightedPoint.id)
      ? [highlightedPoint, ...mapPoints]
      : mapPoints;

  return (
    <div
      ref={rootRef}
      data-discovery-map
      data-point-count={payload?.total ?? ""}
      data-loaded={payload ? "true" : "false"}
    >
      {payload ? (
        <MapViewClient
          facilities={mergedPoints}
          height={height}
          storageKey={storageKey}
          enableAreaSearch={enableAreaSearch}
          clustered
          highlightedFacilityId={highlightedPoint?.id}
          totalItems={payload.total}
        />
      ) : errorHref === dataHref ? (
        <div
          className="grid place-items-center rounded-2xl border border-amber-200 bg-amber-50 px-6 text-center text-sm font-medium text-amber-900"
          style={{ height }}
          role="status"
        >
          地図データを読み込めませんでした。時間をおいて再読み込みしてください。
        </div>
      ) : (
        <div
          className="grid place-items-center rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-12 text-center"
          style={{ height }}
          role="status"
        >
          <div>
            <p className="mb-2 text-3xl" aria-hidden>
              🗺️
            </p>
            <p className="text-sm text-slate-500">
              {shouldLoad ? "地図データを読み込んでいます…" : "地図を準備しています…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
