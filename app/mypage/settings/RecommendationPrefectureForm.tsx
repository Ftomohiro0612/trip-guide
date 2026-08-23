"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PrefectureOption = {
  id: string;
  name: string;
};

export default function RecommendationPrefectureForm({
  options,
  initialPrefectureIds,
}: {
  options: readonly PrefectureOption[];
  initialPrefectureIds: readonly string[];
}) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initialPrefectureIds),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaveError("ログインが必要です");
      setSaving(false);
      return;
    }

    const prefectureIds = options
      .map((option) => option.id)
      .filter((id) => selectedIds.has(id));
    const { error } = await supabase
      .from("mypage_recommendation_settings")
      .upsert({
        user_id: user.id,
        prefecture_ids: prefectureIds,
        updated_at: new Date().toISOString(),
      });

    if (error) setSaveError("保存できませんでした。時間をおいて再度お試しください。");
    else setSaved(true);
    setSaving(false);
  }

  return (
    <form
      id="recommendation-prefectures"
      onSubmit={handleSave}
      aria-labelledby="recommendation-prefectures-heading"
      className="scroll-mt-24 space-y-5 rounded-[1.75rem] bg-gradient-to-br from-accent/10 via-white to-brand/10 p-5 shadow-sm ring-1 ring-accent/20 sm:p-6"
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
          NEXT OUTING
        </p>
        <h2
          id="recommendation-prefectures-heading"
          className="mt-1 text-xl font-black tracking-tight text-slate-950"
        >
          おすすめ地域
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          次のおでかけ候補を探したい地域を複数選べます。子ども別ではなく、家族共通の設定です。
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">おすすめ情報が欲しい都道府県</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const checked = selectedIds.has(option.id);
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm shadow-sm ring-1 transition-all focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${
                  checked
                    ? "bg-brand/10 font-bold text-brand ring-brand/30"
                    : "bg-white/90 text-slate-700 ring-slate-200/80 hover:bg-white hover:ring-brand/20"
                }`}
              >
                <input
                  type="checkbox"
                  name="recommendation_prefecture"
                  value={option.id}
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="h-5 w-5 accent-brand"
                />
                {option.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{selectedIds.size}件選択中</p>
        <button
          type="button"
          onClick={() => {
            setSelectedIds(new Set());
            setSaved(false);
            setSaveError(null);
          }}
          disabled={selectedIds.size === 0 || saving}
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-slate-600 hover:text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
        >
          選択をすべて外す
        </button>
      </div>

      {saveError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {saveError}
        </p>
      )}
      {saved && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          おすすめ地域を保存しました
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="min-h-12 w-full rounded-2xl bg-brand px-4 py-3 font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40 disabled:hover:translate-y-0"
      >
        {saving ? "保存中..." : "おすすめ地域を保存"}
      </button>
    </form>
  );
}
