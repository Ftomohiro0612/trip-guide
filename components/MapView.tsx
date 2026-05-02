"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { Facility, PrefectureId } from "@/types/facility";
import { categoryIcon } from "@/lib/icons";

interface Props {
  facilities: Facility[];
  height?: number;
}

const PREF_COLORS: Record<PrefectureId, string> = {
  shizuoka: "#0ea5e9",
  nagano: "#10b981",
  yamanashi: "#a855f7",
};

const PREF_LABELS: Record<PrefectureId, string> = {
  shizuoka: "🗻 静岡",
  nagano: "🏔️ 長野",
  yamanashi: "🍇 山梨",
};

interface PlacedFacility extends Facility {
  latitude: number;
  longitude: number;
}

function hasCoords(f: Facility): f is PlacedFacility {
  return (
    typeof f.latitude === "number" &&
    typeof f.longitude === "number" &&
    Number.isFinite(f.latitude) &&
    Number.isFinite(f.longitude)
  );
}

export default function MapView({ facilities, height = 520 }: Props) {
  const placed = useMemo(() => facilities.filter(hasCoords), [facilities]);

  const [activePrefs, setActivePrefs] = useState<Record<PrefectureId, boolean>>(
    {
      shizuoka: true,
      nagano: true,
      yamanashi: true,
    },
  );
  const [showRain, setShowRain] = useState(false);
  const [showFree, setShowFree] = useState(false);

  const visible = useMemo(() => {
    return placed.filter((f) => {
      if (!activePrefs[f.prefecture_id]) return false;
      if (showRain && f.rain_friendly === "×") return false;
      if (showFree && !f.is_free) return false;
      return true;
    });
  }, [placed, activePrefs, showRain, showFree]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div className="absolute z-[1000] top-3 left-3 right-3 sm:right-auto flex flex-wrap gap-2">
        {(Object.keys(PREF_LABELS) as PrefectureId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              setActivePrefs((s) => ({ ...s, [id]: !s[id] }))
            }
            className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-all ${
              activePrefs[id]
                ? "bg-white text-slate-900 border-white"
                : "bg-white/60 text-slate-400 border-white/60 line-through"
            }`}
            style={
              activePrefs[id]
                ? { boxShadow: `0 0 0 2px ${PREF_COLORS[id]}` }
                : undefined
            }
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
              style={{ backgroundColor: PREF_COLORS[id] }}
            />
            {PREF_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowRain((v) => !v)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-colors ${
            showRain
              ? "bg-sky-500 text-white border-sky-500"
              : "bg-white text-slate-700 border-slate-200 hover:border-sky-400"
          }`}
        >
          ☂️ 雨でも遊べる
        </button>
        <button
          type="button"
          onClick={() => setShowFree((v) => !v)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-colors ${
            showFree
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
          }`}
        >
          🆓 無料のみ
        </button>
      </div>

      <div className="absolute z-[1000] bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-700">
        {visible.length} 施設を表示中
      </div>

      <MapContainer
        center={[35.8, 138.5]}
        zoom={8}
        scrollWheelZoom
        style={{ height, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsOnChange points={visible} />
        {visible.map((f) => (
          <FacilityMarker
            key={f.id}
            facility={f}
            color={PREF_COLORS[f.prefecture_id]}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function FitBoundsOnChange({ points }: { points: PlacedFacility[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 11 });
  }, [points, map]);
  return null;
}

function FacilityMarker({
  facility,
  color,
}: {
  facility: PlacedFacility;
  color: string;
}) {
  const highlighted =
    facility.rain_friendly === "◎" || facility.is_free;
  return (
    <CircleMarker
      center={[facility.latitude, facility.longitude]}
      radius={highlighted ? 8 : 6}
      pathOptions={{
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }}
    >
      <Popup>
        <div className="min-w-[200px]">
          <p className="text-xs text-slate-500 mb-1">
            {facility.prefecture} · {facility.category}
          </p>
          <p className="font-bold text-slate-900 text-sm leading-tight mb-2">
            <span className="mr-1" aria-hidden>
              {categoryIcon(facility.category_id)}
            </span>
            {facility.name}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {facility.is_free && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                🆓 無料
              </span>
            )}
            <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
              ☂️ {facility.rain_friendly}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
              👶 {facility.target_age}
            </span>
          </div>
          <Link
            href={`/facilities/${facility.slug}`}
            className="inline-block w-full text-center bg-brand hover:bg-brand-dark text-white text-xs font-bold px-2 py-1.5 rounded transition-colors"
          >
            詳細を見る →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
