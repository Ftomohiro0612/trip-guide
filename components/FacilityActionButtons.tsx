"use client";

import { useFacilityGuestRecord } from "@/components/FacilityGuestRecordProvider";
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
  const { openGuestRecord } = useFacilityGuestRecord();
  const { handleRecord, handleWishlist, isWishlisted, loadState, toggling } =
    useFacilityIntentActions({
      facilityId,
      facilitySlug,
      facilityName,
      loadWishlistState: true,
      onGuestRecord: openGuestRecord,
    });

  if (loadState === "loading") {
    return (
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        {loadState === "guest"
          ? "記録は登録なしで体験できます。行きたいリストは無料登録で使えます。"
          : "行ったあとに、子どもごとの反応や再訪意向を記録しておけます。"}
      </p>
      <button
        onClick={handleRecord}
        className="w-full rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        この場所を記録する
      </button>
      <button
        onClick={handleWishlist}
        disabled={toggling}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-50 ${
          isWishlisted
            ? "bg-pink-50 border border-pink-300 text-pink-600 hover:bg-pink-100"
            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {toggling ? "..." : isWishlisted ? "行きたいリスト済み" : "行きたいに追加"}
      </button>
    </div>
  );
}
