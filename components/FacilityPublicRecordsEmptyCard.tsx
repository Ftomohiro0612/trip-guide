"use client";

import { useRouter } from "next/navigation";
import { useFacilityGuestRecord } from "@/components/FacilityGuestRecordProvider";
import { useWishlist } from "@/components/WishlistProvider";
import { buildAuthDest } from "@/lib/auth-dest";

export default function FacilityPublicRecordsEmptyCard({
  facilitySlug,
  facilityName,
}: {
  facilitySlug: string;
  facilityName: string;
}) {
  const router = useRouter();
  const { loadState } = useWishlist();
  const { openGuestRecord } = useFacilityGuestRecord();

  function handleVisit() {
    if (loadState === "loading") return;
    if (loadState === "guest") {
      openGuestRecord();
      return;
    }
    router.push(buildAuthDest("record", facilitySlug, facilityName));
  }

  return (
    <section
      className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
      aria-labelledby="public-records-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2
            id="public-records-heading"
            className="text-base font-bold text-emerald-950"
          >
            この場所での思い出を残してみませんか？
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            この施設に行ったら、お子さまの反応や「また行きたい」を記録してみてください。記録が集まると、どんな遊びが人気か、どの年齢の子が楽しみやすいかが見えるようになります。
          </p>
        </div>
        <button
          type="button"
          onClick={handleVisit}
          disabled={loadState === "loading"}
          className="w-full shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          行ったよ！記録する
        </button>
      </div>
    </section>
  );
}
