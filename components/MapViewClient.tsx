"use client";

import dynamic from "next/dynamic";
import type { Facility } from "@/types/facility";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-emerald-50 grid place-items-center text-center p-12 h-[420px] sm:h-[520px]">
      <div>
        <p className="text-3xl mb-2" aria-hidden>
          🗺️
        </p>
        <p className="text-sm text-slate-500">地図を読み込んでいます…</p>
      </div>
    </div>
  ),
});

interface Props {
  facilities: Facility[];
  height?: number;
}

export default function MapViewClient(props: Props) {
  return <MapView {...props} />;
}
