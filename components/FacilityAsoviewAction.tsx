"use client";

import { useSyncExternalStore } from "react";
import TrackedOutboundLink from "@/components/TrackedOutboundLink";
import type { AsoviewFacilityAction } from "@/lib/asoview-facility-actions";

export default function FacilityAsoviewAction({
  action,
}: {
  action: AsoviewFacilityAction;
}) {
  const expired = useSyncExternalStore(
    subscribeToCurrentDate,
    () => isExpired(action.display_through),
    () => false,
  );

  if (expired) return null;

  return (
    <section
      aria-label="アソビューのチケット・体験予約"
      className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4"
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-sky-200 px-2 py-0.5 text-[11px] font-black text-sky-950">
          PR
        </span>
        <p className="text-xs font-bold text-sky-800">アソビュー！</p>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        この施設で使えるチケット・体験予約です。
      </p>
      <TrackedOutboundLink
        href={action.url}
        contentType="affiliate"
        contentId={`asoview-${action.facility_id}`}
        intentType="affiliate_experience"
        linkLocation="facility_asoview_affiliate"
        analyticsEvent="affiliate_outbound_click"
        partner="asoview"
        campaignId="memorip-asoview-facility"
        sponsored
        className="flex w-full items-center justify-center gap-1 rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        <span>{action.label}</span>
        <span aria-hidden>↗</span>
      </TrackedOutboundLink>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        このリンクから購入・予約されると、メモリップに紹介料が入る場合があります。料金・空き状況・利用条件はリンク先でご確認ください。
      </p>
    </section>
  );
}

function subscribeToCurrentDate(onStoreChange: () => void) {
  const interval = window.setInterval(onStoreChange, 60_000);
  window.addEventListener("visibilitychange", onStoreChange);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("visibilitychange", onStoreChange);
  };
}

function isExpired(displayThrough: string) {
  if (!displayThrough) return true;
  const todayInJapan = new Date(Date.now() + 9 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
  return displayThrough < todayInJapan;
}
