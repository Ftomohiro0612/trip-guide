"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DeletePassButton({ passId }: { passId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("この年パス登録を削除しますか？")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("annual_passes").delete().eq("id", passId);
    setDeleting(false);
    if (!error) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-slate-400 transition-colors hover:text-red-600 hover:underline disabled:opacity-50"
    >
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}
