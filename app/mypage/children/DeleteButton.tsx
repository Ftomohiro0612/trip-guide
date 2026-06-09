"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  childId,
  nickname,
}: {
  childId: string;
  nickname: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("children").delete().eq("id", childId);
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 border border-slate-300 rounded text-slate-600"
        >
          キャンセル
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 bg-red-500 text-white rounded disabled:opacity-50"
        >
          {loading ? "..." : "削除"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`${nickname}を削除`}
      className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
    >
      ×
    </button>
  );
}
