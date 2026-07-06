"use client";

import { useFacilityIntentActions } from "@/components/useFacilityIntentActions";

export default function FacilityActionButtons({
  facilityId,
  facilitySlug,
  facilityName,
}: {
  facilityId?: number | string;
  facilitySlug: string;
  facilityName: string;
}) {
  const { handleRecord, handleWishlist, isWishlisted, loadState, toggling } =
    useFacilityIntentActions({
      facilityId,
      facilitySlug,
      facilityName,
      loadWishlistState: true,
    });

  if (loadState === "loading") {
    return (
      <div className="space-y-2">
        <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        {loadState === "guest"
          ? "記録・行きたいリストは無料登録で使えます。"
          : "行ったあとに、子どもごとの反応や再訪意向を記録しておけます。"}
      </p>
      <button
        onClick={handleRecord}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
      >
        この場所を記録する
      </button>
      <button
        onClick={handleWishlist}
        disabled={toggling}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
          isWishlisted
            ? "bg-pink-50 border border-pink-300 text-pink-600 hover:bg-pink-100"
            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {toggling ? "..." : isWishlisted ? "行きたいリスト済み" : "行きたいに追加"}
      </button>
    </div>
  );
}
