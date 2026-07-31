"use client";

import Link from "next/link";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const VIEW_KEY = "memorip:first-memory-prompt-view";

function sendEvent(eventName: "first_memory_prompt_view" | "first_memory_start") {
  try {
    window.gtag?.("event", eventName, {
      prompt_location: "child_profile_zero_visit",
    });
  } catch {
    // Analytics must never block the first-record path.
  }
}

export default function FirstMemoryActivationCard() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(VIEW_KEY)) return;
      window.sessionStorage.setItem(VIEW_KEY, "1");
    } catch {
      // Sending once per mount is still safe when storage is unavailable.
    }
    sendEvent("first_memory_prompt_view");
  }, []);

  return (
    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-sm">
      <p className="text-xs font-black tracking-[0.14em] text-amber-700">
        最初の1件でできること
      </p>
      <h2 className="mt-2 text-lg font-black leading-snug text-slate-950">
        1件記録すると、家族のMemory Storyが完成します
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        行った場所と日付だけから始められます。写真がなくても、子どもの反応やひとことが、あとで見返せる1枚の思い出になります。
      </p>
      <Link
        href="/mypage/visits/new"
        onClick={() => sendEvent("first_memory_start")}
        className="mt-4 block w-full rounded-xl bg-brand px-4 py-3 text-center text-sm font-black text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        最初の思い出をつくる →
      </Link>
    </section>
  );
}
