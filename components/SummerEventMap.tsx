"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { spreadNearbySummerEventMarkers } from "@/lib/summer-event-map";
import type { SummerMapDisplayed } from "@/lib/summer-event-map";
import type { SummerEventMapPoint } from "@/lib/summer-event-locations";

interface Props {
  points: SummerEventMapPoint[];
}

const PREFECTURE_COLORS: Record<string, string> = {
  tokyo: "#e11d48",
  kanagawa: "#7c3aed",
  chiba: "#0891b2",
  saitama: "#65a30d",
  yamanashi: "#9333ea",
  shizuoka: "#0284c7",
  nagano: "#059669",
  ibaraki: "#0f766e",
  tochigi: "#a16207",
  gunma: "#be123c",
  niigata: "#0369a1",
  aichi: "#c2410c",
  kyoto: "#7e22ce",
  osaka: "#dc2626",
  hyogo: "#4338ca",
  hiroshima: "#0f766e",
  fukuoka: "#a21caf",
  okayama: "#ca8a04",
  kagawa: "#0891b2",
  kumamoto: "#dc2626",
  nagasaki: "#2563eb",
  oita: "#16a34a",
  kagoshima: "#9333ea",
  saga: "#0f766e",
  miyazaki: "#c2410c",
  ehime: "#2563eb",
  tokushima: "#7e22ce",
  kochi: "#15803d",
};

const PRECISION_LABELS = {
  exact_venue: "確認済み会場点",
  area_representative: "広域会場の代表点",
  geocoded_venue: "公式会場名から確認した座標",
} as const;

export default function SummerEventMap({ points }: Props) {
  const displayedPoints = useMemo(
    () => spreadNearbySummerEventMarkers(points),
    [points],
  );

  return (
    <div
      data-summer-event-map
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="relative h-[420px] sm:h-[500px]">
        <MapContainer
          center={[35.65, 139.25]}
          zoom={7}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitSummerEventBounds points={displayedPoints} />
          {displayedPoints.map((point) => (
            <SummerEventMarker key={point.eventId} point={point} />
          ))}
        </MapContainer>
        <div className="pointer-events-none absolute bottom-3 left-3 z-[650] rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
          {points.length}件を表示中
        </div>
      </div>
    </div>
  );
}

function FitSummerEventBounds({
  points,
}: {
  points: readonly SummerMapDisplayed<SummerEventMapPoint>[];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;

    const bounds = L.latLngBounds(
      points.map(
        (point) =>
          [point.displayLatitude, point.displayLongitude] as [number, number],
      ),
    );
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 10 });
  }, [map, points]);

  return null;
}

function SummerEventMarker({
  point,
}: {
  point: SummerMapDisplayed<SummerEventMapPoint>;
}) {
  const isAreaRepresentative =
    point.coordinatePrecision === "area_representative";
  const color = PREFECTURE_COLORS[point.prefecture] ?? "#4f46e5";

  return (
    <CircleMarker
      center={[point.displayLatitude, point.displayLongitude]}
      radius={isAreaRepresentative ? 9 : 7}
      pathOptions={{
        color,
        weight: isAreaRepresentative ? 3 : 2,
        dashArray: isAreaRepresentative ? "5 4" : undefined,
        fillColor: color,
        fillOpacity: isAreaRepresentative ? 0.48 : 0.88,
      }}
    >
      <Popup>
        <div
          className="min-w-[210px] max-w-[250px]"
          data-summer-map-popup={point.eventId}
        >
          <p className="mb-1 text-xs font-bold text-indigo-700">
            {point.prefectureLabel} · {formatMapDate(point.nextDate)}
          </p>
          <p className="text-sm font-bold leading-snug text-slate-900">
            {point.title}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            📍 {point.mapLabel}
          </p>
          <p
            className={`mt-2 rounded-md px-2 py-1 text-[11px] font-bold ${
              isAreaRepresentative
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {PRECISION_LABELS[point.coordinatePrecision]}
            {isAreaRepresentative
              ? "（正確な打上地点・範囲を示すものではありません）"
              : ""}
          </p>
          <a
            href={`#${point.detailAnchor}`}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-indigo-700 px-3 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            詳しい紹介を見る ↓
          </a>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function formatMapDate(value: string | null): string {
  if (!value) return "開催日を公式確認中";
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}
