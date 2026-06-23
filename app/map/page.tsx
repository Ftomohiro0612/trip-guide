import type { Metadata } from "next";
import MapViewClient from "@/components/MapViewClient";
import { visibleFacilities } from "@/lib/facilities";

export const metadata: Metadata = {
  title: "地図から探す",
  description:
    "全国13都府県の子供向け遊び場を地図から探せます。雨の日OK、無料、県別の絞り込みにも対応。",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          地図から探す
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          マーカーをクリックすると詳細ページへ移動できます。県や条件で表示施設を絞り込めます。
        </p>
      </div>
      <MapViewClient
        facilities={visibleFacilities}
        height={680}
        storageKey="map"
      />
    </div>
  );
}
