"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteVisitButton({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("この記録を削除しますか？")) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("visits").delete().eq("id", visitId);
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
      className="px-2.5 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {loading ? "削除中…" : "削除"}
    </button>
  );
}
