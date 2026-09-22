"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuickVisitReactions from "@/components/QuickVisitReactions";
import VisitPhotoUploader, { type VisitPhotoUploaderHandle } from "@/app/mypage/visits/VisitPhotoUploader";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { hasQuickReactions, insertQuickChildren, type QuickReactions } from "@/lib/quick-visit";
import { storeVisitCompletion } from "@/lib/visit-flow-session";
import { tokyoDate, type VisitIntent } from "@/lib/visit-intent";

type Choice = { slug: string; name: string };

function manualFacilitySlug(name: string): string {
  const encoded = Array.from(name.trim())
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
  return `manual-${encoded.slice(0, 120) || Date.now().toString(36)}`;
}

export default function QuickVisitForm({ intent, onCancel }: { intent: VisitIntent; onCancel: () => void }) {
  const router = useRouter();
  const [facility, setFacility] = useState<Choice>({ slug: intent.facility_slug, name: intent.facility_name });
  const [date, setDate] = useState(intent.planned_date ?? tokyoDate());
  const [reactions, setReactions] = useState<QuickReactions>({});
  const [memo, setMemo] = useState("");
  const [results, setResults] = useState<Choice[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const lock = useRef(false);
  const uploader = useRef<VisitPhotoUploaderHandle>(null);
  useEffect(() => {
    if (facility.slug || facility.name.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/facilities/search?q=${encodeURIComponent(facility.name.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data.results ?? []);
      } catch { if (!controller.signal.aborted) setError("施設を検索できませんでした。"); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [facility]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || saveBlocked || photoBusy || !facility.name.trim() || !date || !hasQuickReactions(reactions)) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です。");
      let visitId = savedId;
      if (!visitId) {
        const { data, error } = await supabase.from("visits").insert({
          user_id: user.id, facility_slug: facility.slug || manualFacilitySlug(facility.name), facility_name: facility.name.trim(),
          visited_on: date, visited_year: Number(date.slice(0, 4)), visited_month: Number(date.slice(5, 7)),
          date_precision: "exact", is_past_entry: date < tokyoDate(), status: "published",
          family_revisit: null, parent_fatigue: null, parent_memo: memo.trim() || null,
        }).select("id").single();
        if (error || !data) throw new Error(error?.message ?? "記録を保存できませんでした。");
        try { await insertQuickChildren(data.id, date, reactions); }
        catch (error) {
          const cleanup = await supabase.from("visits").delete().eq("id", data.id).eq("user_id", user.id);
          if (cleanup.error) {
            setSaveBlocked(true);
            throw new Error("記録の保存を完了できませんでした。おでかけ履歴を確認してください。");
          }
          throw error;
        }
        visitId = data.id;
        setSavedId(visitId);
      }
      if (PHOTO_UPLOAD_ENABLED) {
        const uploaded = await uploader.current?.upload(visitId!);
        if (uploaded && !uploaded.ok) throw new Error(`記録は保存済みです。写真だけ再試行できます。${uploaded.error}`);
      }
      const { error: dismissError } = await supabase.from("wishlists").update({ visit_prompt_dismissed_at: new Date().toISOString() })
        .eq("id", intent.id).eq("user_id", user.id);
      if (dismissError) throw new Error("記録は保存済みです。完了処理を再試行してください。");
      storeVisitCompletion({ visitId: visitId!, entryMethod: "standard" });
      router.push("/mypage/visits/complete");
    } catch (error) { setError(error instanceof Error ? error.message : "保存に失敗しました。"); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4 rounded-xl border border-brand/30 bg-white p-4 lg:col-span-2 lg:order-first">
    <h2 className="font-bold">クイック記録</h2>
    <fieldset disabled={busy || Boolean(savedId)} className="space-y-3">
      <label className="block text-sm">施設名<input required value={facility.name} onChange={(event) => { setFacility({ slug: "", name: event.target.value }); setResults([]); }} className="mt-1 block w-full rounded-lg border p-2" /></label>
      {searching && !facility.slug && facility.name.trim().length >= 2 && <p className="text-xs text-slate-500">検索中...</p>}
      {!facility.slug && results.map((result) => <button type="button" key={result.slug} className="block text-sm text-brand" onClick={() => { setFacility(result); setResults([]); }}>{result.name}</button>)}
      <label className="block text-sm">訪問日<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block rounded-lg border p-2" /></label>
      <QuickVisitReactions value={reactions} onChange={setReactions} />
      <details><summary className="cursor-pointer text-sm">コメント（任意）</summary><textarea aria-label="コメント" value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2 w-full rounded-lg border p-2" /></details>
    </fieldset>
    {PHOTO_UPLOAD_ENABLED && <details><summary className="cursor-pointer text-sm">写真（任意）</summary><VisitPhotoUploader ref={uploader} disabled={busy} initialExistingCount={0} onBusyChange={setPhotoBusy} /></details>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex gap-3"><button disabled={busy || saveBlocked || photoBusy || !date || !facility.name.trim() || !hasQuickReactions(reactions)} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? "保存中..." : savedId ? "保存を再試行" : "記録する"}</button>
      <button type="button" disabled={busy || Boolean(savedId)} onClick={onCancel} className="text-sm text-slate-500">閉じる</button></div>
  </form>;
}
