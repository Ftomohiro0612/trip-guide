"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import SortSelect from "@/components/SortSelect";
import type { CategoryMeta, PrefectureMeta } from "@/types/facility";

interface Props {
  prefectures: PrefectureMeta[];
  categories: CategoryMeta[];
  resultCount: number;
}

const RAIN_OPTIONS = [
  { value: "◎", label: "◎ 雨でも快適" },
  { value: "△", label: "△ 一部OK" },
  { value: "×", label: "× 雨は不向き" },
];

const INDOOR_OPTIONS = [
  { value: "屋内", label: "屋内" },
  { value: "屋外", label: "屋外" },
  { value: "両方", label: "両方" },
];

const AGE_TAG_OPTIONS = [
  { value: "0-3歳OK", label: "👶 0-3歳OK" },
  { value: "小学生向け", label: "🧒 小学生向け" },
];

const DETAIL_TAG_OPTIONS = [
  { value: "雨の日OK", label: "☂️ 雨の日OK" },
  { value: "完全屋内", label: "🏠 完全屋内" },
  { value: "冬季限定", label: "⛄ 冬季限定" },
  { value: "季節限定", label: "🌸 季節限定" },
];

export default function MobileFilterBar({
  prefectures,
  categories,
  resultCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function getList(key: string): string[] {
    const v = searchParams.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  }

  function update(params: URLSearchParams) {
    startTransition(() => {
      const s = params.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    });
  }

  function toggleList(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    const list = getList(key);
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    if (next.length) params.set(key, next.join(","));
    else params.delete(key);
    update(params);
  }

  function setFee(value: "free" | "paid" | "") {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("fee", value);
    else params.delete("fee");
    update(params);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    update(params);
  }

  const fee = searchParams.get("fee") ?? "";
  const prefList = getList("prefectures");
  const catList = getList("categories");
  const indoorList = getList("indoor");
  const rainList = getList("rain");
  const tagList = getList("tags");
  const hasDetailTag = DETAIL_TAG_OPTIONS.some((t) => tagList.includes(t.value));

  return (
    <div className="lg:hidden mb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm"
          onClick={() => setOpen(true)}
        >
          <span aria-hidden>🎛️</span>
          絞り込み
        </button>
        <div className="flex min-h-10 flex-1 items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
          <SortSelect />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="fixed bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span aria-hidden>🎛️</span>絞り込み
                {isPending && (
                  <span className="text-xs font-normal text-slate-400">
                    更新中…
                  </span>
                )}
              </h2>
              <button
                type="button"
                className="text-2xl leading-none text-slate-400 hover:text-slate-700"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              {resultCount} 件の施設が該当
            </p>

            <FilterGroup label="エリア">
              {prefectures.map((p) => (
                <CheckboxItem
                  key={p.id}
                  checked={prefList.includes(p.id)}
                  onChange={() => toggleList("prefectures", p.id)}
                  label={`${p.name} (${p.count})`}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="カテゴリ">
              {categories.map((c) => (
                <CheckboxItem
                  key={c.id}
                  checked={catList.includes(c.id)}
                  onChange={() => toggleList("categories", c.id)}
                  label={`${c.name} (${c.count})`}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="屋内 / 屋外">
              {INDOOR_OPTIONS.map((o) => (
                <CheckboxItem
                  key={o.value}
                  checked={indoorList.includes(o.value)}
                  onChange={() => toggleList("indoor", o.value)}
                  label={o.label}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="雨天対応">
              {RAIN_OPTIONS.map((o) => (
                <CheckboxItem
                  key={o.value}
                  checked={rainList.includes(o.value)}
                  onChange={() => toggleList("rain", o.value)}
                  label={o.label}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="料金">
              <div className="flex gap-2">
                {[
                  { value: "", label: "すべて" },
                  { value: "free", label: "🆓 無料" },
                  { value: "paid", label: "💴 有料" },
                ].map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setFee(o.value as "free" | "paid" | "")}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      fee === o.value
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="年齢グループ">
              {AGE_TAG_OPTIONS.map((t) => (
                <CheckboxItem
                  key={t.value}
                  checked={tagList.includes(t.value)}
                  onChange={() => toggleList("tags", t.value)}
                  label={t.label}
                />
              ))}
            </FilterGroup>

            <CollapsibleFilterGroup
              label="詳細条件"
              forceOpen={hasDetailTag}
              last
            >
              {DETAIL_TAG_OPTIONS.map((t) => (
                <CheckboxItem
                  key={t.value}
                  checked={tagList.includes(t.value)}
                  onChange={() => toggleList("tags", t.value)}
                  label={t.label}
                />
              ))}
            </CollapsibleFilterGroup>

            <button
              type="button"
              onClick={clearAll}
              className="mt-2 w-full rounded-md border border-slate-200 py-2 text-sm text-slate-500 hover:text-brand"
            >
              条件をクリア
            </button>

            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-brand py-3 font-bold text-white"
              onClick={() => setOpen(false)}
            >
              この条件で見る ({resultCount})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`${last ? "" : "border-b border-slate-100"} py-3`}>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{label}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CollapsibleFilterGroup({
  label,
  children,
  forceOpen,
  last,
}: {
  label: string;
  children: React.ReactNode;
  forceOpen?: boolean;
  last?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const expanded = open || Boolean(forceOpen);

  return (
    <div className={`${last ? "" : "border-b border-slate-100"} py-3`}>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
      >
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <span className="text-xs text-slate-400" aria-hidden>
          {expanded ? "▲" : "▼"}
        </span>
      </button>
      {expanded && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

function CheckboxItem({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
      />
      <span className="text-slate-700 transition-colors group-hover:text-brand">
        {label}
      </span>
    </label>
  );
}
