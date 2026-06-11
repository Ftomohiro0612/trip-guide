"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "visit-photos";

export default function DeleteVisitButton({
  visitId,
  facilityName,
  redirectTo,
}: {
  visitId: string;
  facilityName: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`「${facilityName}」の記録を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data: photoRows, error: photoError } = await supabase
      .from("visit_photos")
      .select("storage_path, thumb_path")
      .eq("visit_id", visitId);
    if (photoError) {
      console.warn("visit photo path fetch failed before visit delete", photoError);
    }
    const pathsToRemove = Array.from(
      new Set(
        (photoRows ?? []).flatMap((photo) => [
          photo.storage_path,
          photo.thumb_path,
        ]),
      ),
    );
    const { error } = await supabase.from("visits").delete().eq("id", visitId);
    if (error) {
      window.alert(error.message);
      setLoading(false);
      return;
    }
    if (pathsToRemove.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(pathsToRemove);
      if (removeError) {
        console.warn("visit photo storage remove failed after visit delete", removeError);
      }
    }
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
    }
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
