"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { plannedDateChoices } from "@/lib/visit-intent";

export default function WishlistPlanChips({ facilitySlug }: { facilitySlug: string }) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choices] = useState(() => plannedDateChoices());
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("ログインが必要です。");
        const { data, error } = await supabase.from("wishlists").select("planned_date").eq("user_id", user.id).eq("facility_slug", facilitySlug).single();
        if (error) throw error;
        if (active) setSelectedLabel(choices.find((choice) => choice.date === data.planned_date)?.label ?? null);
      } catch { if (active) setError("予定を読み込めませんでした。"); }
      finally { if (active) setBusy(false); }
    }
    void load();
    return () => { active = false; };
  }, [facilitySlug, choices]);
  async function save(choice: { label: string; date: string }) {
    if (busy) return;
    setBusy(true); setError(null);
    const next = selectedLabel === choice.label ? null : choice.date;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です。");
      const { error } = await supabase.from("wishlists").update({ planned_date: next }).eq("user_id", user.id).eq("facility_slug", facilitySlug).select("id").single();
      if (error) throw error;
      setSelectedLabel(next ? choice.label : null);
    } catch { setError("予定を保存できませんでした。"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2 text-xs text-slate-500">
    <p>近々行く予定なら教えてください</p>
    <div className="flex gap-2">{choices.map((choice) => <button key={choice.label} type="button" disabled={busy} aria-pressed={selectedLabel === choice.label}
      onClick={() => void save(choice)} className={`rounded-full border px-3 py-1.5 disabled:opacity-50 ${selectedLabel === choice.label ? "border-brand bg-emerald-50 text-brand" : "border-slate-200"}`}>{choice.label}</button>)}</div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
  </div>;
}
