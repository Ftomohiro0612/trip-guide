"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadQuickOptions, type QuickReactions } from "@/lib/quick-visit";

export default function QuickVisitReactions({ value, onChange, disabled = false }: {
  value: QuickReactions; onChange: (value: QuickReactions) => void; disabled?: boolean;
}) {
  const [options, setOptions] = useState<Awaited<ReturnType<typeof loadQuickOptions>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    loadQuickOptions().then((data) => { if (active) setOptions(data); })
      .catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!options) return <p className="text-sm text-slate-500">子ども・反応タグを読み込んでいます...</p>;
  if (!options.children.length) return <p className="text-sm text-slate-600">クイック記録には子どもの登録が必要です。<Link className="font-bold text-brand underline" href="/mypage/visits/new">通常の記録フォームへ</Link></p>;
  return <fieldset disabled={disabled} className="space-y-3">
    <legend className="text-sm font-bold">参加した子ども・反応タグ</legend>
    {options.children.map((child) => <div key={child.id} className="rounded-xl border border-slate-200 p-3">
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={child.id in value} onChange={() => {
        const next = { ...value };
        if (child.id in next) delete next[child.id]; else next[child.id] = [];
        onChange(next);
      }} />{child.nickname}</label>
      {child.id in value && <div className="mt-2 flex flex-wrap gap-2" aria-label={`${child.nickname}の反応タグ（1〜2個）`}>
        {options.tags.map((tag) => {
          const selected = value[child.id].includes(tag.id);
          return <button key={tag.id} type="button" aria-pressed={selected} disabled={!selected && value[child.id].length >= 2}
            className={`rounded-full border px-3 py-2 text-xs disabled:opacity-40 ${selected ? "border-brand bg-emerald-50 text-brand" : "border-slate-200"}`}
            onClick={() => onChange({ ...value, [child.id]: selected ? value[child.id].filter((id) => id !== tag.id) : [...value[child.id], tag.id] })}>{tag.label}</button>;
        })}
      </div>}
    </div>)}
  </fieldset>;
}
