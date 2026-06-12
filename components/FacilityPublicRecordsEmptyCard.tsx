"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthState = "loading" | "guest" | "ready";

export default function FacilityPublicRecordsEmptyCard({
  facilitySlug,
  facilityName,
}: {
  facilitySlug: string;
  facilityName: string;
}) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    let active = true;

    async function loadAuthState() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setAuthState(user ? "ready" : "guest");
    }

    loadAuthState();

    return () => {
      active = false;
    };
  }, []);

  const visitUrl = `/mypage/visits/new?facility=${encodeURIComponent(facilitySlug)}&name=${encodeURIComponent(facilityName)}`;
  const loginUrl = `/auth/login?redirectTo=${encodeURIComponent(visitUrl)}`;

  function handleVisit() {
    router.push(authState === "guest" ? loginUrl : visitUrl);
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
            みんなの記録は、ただいま集計中です
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900">
            この施設に行ったら、お子さまの反応や「また行きたい」を記録してみてください。記録が集まると、どんな遊びが人気か、どの年齢の子が楽しみやすいかが見えるようになります。
          </p>
        </div>
        <button
          type="button"
          onClick={handleVisit}
          disabled={authState === "loading"}
          className="w-full shrink-0 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          行ったよ！記録する
        </button>
      </div>
    </section>
  );
}
