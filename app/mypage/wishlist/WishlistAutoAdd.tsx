"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function WishlistAutoAdd({
  facilitySlug,
  facilityName,
}: {
  facilitySlug?: string;
  facilityName?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!facilitySlug) return;

    let active = true;
    async function addWishlistOnce() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: existing } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("facility_slug", facilitySlug)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("wishlists").insert({
          user_id: user.id,
          facility_slug: facilitySlug,
          facility_name: facilityName || facilitySlug,
        });

        if (error && error.code !== "23505") {
          window.alert(error.message);
          return;
        }
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      url.searchParams.delete("name");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

      if (!active) return;
      setMessage("行きたいに追加しました");
      router.refresh();
    }

    addWishlistOnce();
    return () => {
      active = false;
    };
  }, [facilityName, facilitySlug, router]);

  if (!message) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
      {message}
    </div>
  );
}
