"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Facility } from "@/types/facility";
import { createClient } from "@/lib/supabase/client";
import type { UserStatusMap } from "./MapView";

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
  storageKey?: string;
}

export default function MapViewClient(props: Props) {
  const [userStatus, setUserStatus] = useState<UserStatusMap>();

  useEffect(() => {
    let active = true;

    async function loadUserStatus() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) return;

      const [{ data: visitRows }, { data: wishlistRows }] = await Promise.all([
        supabase
          .from("visits")
          .select("facility_slug, visited_on")
          .eq("user_id", user.id),
        supabase.from("wishlists").select("facility_slug").eq("user_id", user.id),
      ]);

      if (!active) return;

      const statusMap: UserStatusMap = new Map();

      for (const visit of visitRows ?? []) {
        const facilitySlug = visit.facility_slug as string | null;
        const visitedOn = visit.visited_on as string | null;
        if (!facilitySlug) continue;

        const current =
          statusMap.get(facilitySlug) ??
          { visitCount: 0, lastVisited: null, wishlisted: false };

        statusMap.set(facilitySlug, {
          ...current,
          visitCount: current.visitCount + 1,
          lastVisited:
            visitedOn && (!current.lastVisited || visitedOn > current.lastVisited)
              ? visitedOn
              : current.lastVisited,
        });
      }

      for (const wishlist of wishlistRows ?? []) {
        const facilitySlug = wishlist.facility_slug as string | null;
        if (!facilitySlug) continue;

        const current =
          statusMap.get(facilitySlug) ??
          { visitCount: 0, lastVisited: null, wishlisted: false };

        statusMap.set(facilitySlug, {
          ...current,
          wishlisted: true,
        });
      }

      setUserStatus(statusMap);
    }

    loadUserStatus();

    return () => {
      active = false;
    };
  }, []);

  return <MapView {...props} userStatus={userStatus} />;
}
