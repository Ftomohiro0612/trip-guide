import type { Metadata } from "next";
import MapViewClient from "@/components/MapViewClient";
import { prefectures, visibleFacilities } from "@/lib/facilities";

export const metadata: Metadata = {
  title: "地図から探す",
  description: `全国${prefectures.length}都府県の子供向け遊び場を地図から探せます。現在地と施設の位置関係を地図で確認できます。`,
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
          マーカーをクリックすると詳細ページへ移動できます。条件を指定して探す場合は施設一覧をご利用ください。
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
