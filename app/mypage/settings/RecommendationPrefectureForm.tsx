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
      className="scroll-mt-6 space-y-4 border-t border-slate-100 pt-6"
    >
      <div>
        <h2 className="text-sm font-bold text-slate-800">
          おすすめ情報が欲しい都道府県
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
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
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  checked
                    ? "border-violet-300 bg-violet-50 font-bold text-violet-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  name="recommendation_prefecture"
                  value={option.id}
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="h-4 w-4 accent-violet-600"
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
          className="text-xs font-bold text-slate-600 hover:underline disabled:opacity-40"
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
        className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-40"
      >
        {saving ? "保存中..." : "おすすめ地域を保存"}
      </button>
    </form>
  );
}
