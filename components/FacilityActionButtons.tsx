"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LoadState = "loading" | "guest" | "ready";

export default function FacilityActionButtons({
  facilitySlug,
  facilityName,
}: {
  facilitySlug: string;
  facilityName: string;
}) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setUserId(null);
        setLoadState("guest");
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("facility_slug", facilitySlug)
        .maybeSingle();
      if (!active) return;
      setWishlistId(data?.id ?? null);
      setLoadState("ready");
    }
    init();
    return () => {
      active = false;
    };
  }, [facilitySlug]);

  const visitUrl = `/mypage/visits/new?facility=${encodeURIComponent(facilitySlug)}&name=${encodeURIComponent(facilityName)}`;
  const loginUrl = (next: string) =>
    `/auth/login?redirectTo=${encodeURIComponent(next)}`;

  async function toggleWishlist() {
    if (toggling) return;
    if (loadState === "guest") {
      router.push(loginUrl(`/facilities/${facilitySlug}`));
      return;
    }
    if (!userId) return;
    setToggling(true);
    const supabase = createClient();
    if (wishlistId) {
      const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
      if (error) {
        window.alert(error.message);
        setToggling(false);
        return;
      }
      setWishlistId(null);
    } else {
      const { data, error } = await supabase
        .from("wishlists")
        .insert({ user_id: userId, facility_slug: facilitySlug, facility_name: facilityName })
        .select("id")
        .single();
      if (error) {
        window.alert(error.message);
        setToggling(false);
        return;
      }
      setWishlistId(data?.id ?? null);
    }
    setToggling(false);
  }

  function handleVisit() {
    if (loadState === "guest") {
      router.push(loginUrl(visitUrl));
    } else {
      router.push(visitUrl);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-2">
        <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const isWishlisted = loadState === "ready" && !!wishlistId;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 leading-relaxed">
        行ったあとに、子どもごとの反応や再訪意向を記録しておけます。
      </p>
      <button
        onClick={toggleWishlist}
        disabled={toggling}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
          isWishlisted
            ? "bg-pink-50 border border-pink-300 text-pink-600 hover:bg-pink-100"
            : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {toggling ? "…" : isWishlisted ? "♥ 行きたいリスト済み" : "♡ 行きたい！"}
      </button>
      <button
        onClick={handleVisit}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors"
      >
        ✓ 行ったよ！記録する
      </button>
    </div>
  );
}
