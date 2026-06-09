"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteWishButton({
  wishId,
  facilityName,
}: {
  wishId: string;
  facilityName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${facilityName}」を行きたいリストから削除しますか？`)) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("wishlists").delete().eq("id", wishId);

    if (error) {
      window.alert(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "削除中..." : "削除"}
    </button>
  );
}
