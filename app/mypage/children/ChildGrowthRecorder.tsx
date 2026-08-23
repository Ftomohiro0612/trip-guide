"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatHeightCm,
  type ChildGrowthRecord,
} from "@/lib/child-growth";
import { createClient } from "@/lib/supabase/client";

function localDateString(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatRecordedOn(value: string): string {
  return value.replaceAll("-", "/");
}

export default function ChildGrowthRecorder({
  childId,
  nickname,
  initialRecords,
}: {
  childId: string;
  nickname: string;
  initialRecords: ChildGrowthRecord[];
}) {
  const router = useRouter();
  const [today] = useState(() => localDateString());
  const [records, setRecords] = useState(initialRecords);
  const [recordedOn, setRecordedOn] = useState(today);
  const [heightCm, setHeightCm] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const height = Number(heightCm);
    if (!recordedOn) {
      setError("記録日を選択してください");
      return;
    }
    if (recordedOn > today) {
      setError("未来の日付は選択できません");
      return;
    }
    if (!Number.isFinite(height) || height <= 0 || height > 300) {
      setError("身長は0より大きく300cm以下で入力してください");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { data, error: saveError } = await supabase
      .from("child_growth_records")
      .upsert(
        {
          child_id: childId,
          recorded_on: recordedOn,
          height_cm: Math.round(height * 10) / 10,
        },
        { onConflict: "child_id,recorded_on" },
      )
      .select("id, child_id, recorded_on, height_cm, created_at")
      .single();

    if (saveError || !data) {
      setError(saveError?.message ?? "身長の保存に失敗しました");
      setSaving(false);
      return;
    }

    const savedRecord = data as ChildGrowthRecord;
    setRecords((current) =>
      [savedRecord, ...current.filter((record) => record.recorded_on !== recordedOn)]
        .sort((a, b) => b.recorded_on.localeCompare(a.recorded_on))
        .slice(0, 10),
    );
    setHeightCm("");
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="border-t border-slate-100 pt-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">身長の記録</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            おでかけの思い出と一緒に、成長を振り返れます
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setError(null);
            setSaved(false);
          }}
          className="shrink-0 rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-bold text-brand transition-colors hover:bg-brand/5"
        >
          {open ? "閉じる" : "身長を記録する"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100"
        >
          <p className="text-xs font-bold text-emerald-800">
            {nickname}の身長を記録
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>記録日</span>
              <input
                type="date"
                required
                max={today}
                value={recordedOn}
                onChange={(event) => setRecordedOn(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>身長（cm）</span>
              <input
                type="number"
                required
                min="0.1"
                max="300"
                step="0.1"
                inputMode="decimal"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="例: 105.5"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            同じ日付ですでに記録がある場合は、その日の身長を更新します。別の日の記録は履歴に残ります。
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {saved && (
            <p aria-live="polite" className="text-xs font-medium text-emerald-700">
              身長を記録しました
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-brand py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "保存中..." : "記録する"}
          </button>
        </form>
      )}

      {records.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">最近の記録</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/70 px-3">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                <time dateTime={record.recorded_on} className="text-slate-500">
                  {formatRecordedOn(record.recorded_on)}
                </time>
                <span className="font-bold text-slate-700">
                  {formatHeightCm(record.height_cm)} cm
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-400">身長の記録はまだありません</p>
      )}
    </section>
  );
}
