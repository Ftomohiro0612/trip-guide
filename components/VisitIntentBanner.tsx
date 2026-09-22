"use client";

import { useEffect, useState } from "react";
import QuickVisitForm from "@/components/QuickVisitForm";
import { createClient } from "@/lib/supabase/client";
import { selectVisitIntent, shiftDate, tokyoDate, type VisitIntent } from "@/lib/visit-intent";

export default function VisitIntentBanner() {
  const [intent, setIntent] = useState<VisitIntent | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const today = tokyoDate();
      const [wishlists, visits] = await Promise.all([
        supabase.from("wishlists").select("id, facility_slug, facility_name, planned_date, visit_prompt_shown_at, visit_prompt_dismissed_at")
          .eq("user_id", user.id).gte("planned_date", shiftDate(today, -7)).lte("planned_date", shiftDate(today, -1)).is("visit_prompt_dismissed_at", null),
        supabase.from("visits").select("facility_slug, visited_on").eq("user_id", user.id).gte("visited_on", shiftDate(today, -8)),
      ]);
      if (wishlists.error || visits.error || !active) return;
      const candidate = selectVisitIntent(wishlists.data ?? [], visits.data ?? [], today);
      if (!candidate) return;
      // Claim before displaying, including reloads and concurrent tabs.
      let claim = supabase.from("wishlists").update({ visit_prompt_shown_at: new Date().toISOString() })
        .eq("id", candidate.id).eq("user_id", user.id).eq("planned_date", candidate.planned_date!).is("visit_prompt_dismissed_at", null);
      claim = candidate.visit_prompt_shown_at ? claim.eq("visit_prompt_shown_at", candidate.visit_prompt_shown_at) : claim.is("visit_prompt_shown_at", null);
      const result = await claim.select("id");
      if (active && !result.error && result.data?.length) setIntent(candidate);
    }
    void load();
    return () => { active = false; };
  }, []);
  async function dismiss(didNotGo: boolean) {
    if (!intent || busy) return;
    setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const now = new Date().toISOString();
      const { error } = await supabase.from("wishlists").update(didNotGo
        ? { planned_date: null, visit_prompt_dismissed_at: now } : { visit_prompt_shown_at: now }).eq("id", intent.id).eq("user_id", user.id);
      if (error) throw error;
      setIntent(null);
    } catch { setError("保存できませんでした。もう一度お試しください。"); }
    finally { setBusy(false); }
  }
  if (!intent) return null;
  if (recording) return <QuickVisitForm intent={intent} onCancel={() => { setRecording(false); setIntent(null); }} />;
  const relative = intent.planned_date === shiftDate(tokyoDate(), -1) ? "昨日" : intent.planned_date;
  return <section className="space-y-3 rounded-xl bg-emerald-50 p-4 lg:col-span-2 lg:order-first">
    <p className="text-sm font-bold">{relative}、{intent.facility_name}に行きましたか？ 10秒で記録する</p>
    <div className="flex flex-wrap gap-3 text-sm"><button disabled={busy} onClick={() => setRecording(true)} className="rounded-lg bg-brand px-3 py-2 font-bold text-white">記録する</button>
      <button disabled={busy} onClick={() => void dismiss(false)}>まだ</button><button disabled={busy} onClick={() => void dismiss(true)}>行かなかった</button></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
