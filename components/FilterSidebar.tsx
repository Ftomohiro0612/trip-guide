"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
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

const TAG_OPTIONS = [
  { value: "0-3歳OK", label: "👶 0-3歳OK" },
  { value: "小学生向け", label: "🧒 小学生向け" },
  { value: "雨の日OK", label: "☂️ 雨の日OK" },
  { value: "完全屋内", label: "🏠 完全屋内" },
  { value: "冬季限定", label: "⛄ 冬季限定" },
  { value: "季節限定", label: "🌸 季節限定" },
];

export default function FilterSidebar({
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

  // Close drawer on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed bottom-4 right-4 z-30 bg-brand text-white shadow-lg rounded-full px-5 py-3 font-bold text-sm flex items-center gap-2 hover:bg-brand-dark"
        onClick={() => setOpen(true)}
      >
        🎛️ 絞り込み
      </button>

      <aside
        className={`${open ? "fixed inset-0 z-40 bg-black/40" : "hidden"} lg:static lg:bg-transparent lg:z-auto lg:block`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div
          className={`${open ? "fixed right-0 top-0 bottom-0 w-[88%] max-w-sm" : ""} lg:static lg:w-auto bg-white lg:bg-transparent overflow-y-auto p-5 lg:p-0`}
        >
          <div className="flex items-center justify-between mb-4 lg:mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span aria-hidden>🎛️</span>絞り込み
              {isPending && (
                <span className="text-xs font-normal text-slate-400">
                  更新中…
                </span>
              )}
            </h2>
            <button
              type="button"
              className="lg:hidden text-slate-400 hover:text-slate-700 text-2xl leading-none"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-slate-500 mb-4">
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
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    fee === o.value
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-slate-700 border-slate-200 hover:border-brand"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="タグ" last>
            {TAG_OPTIONS.map((t) => (
              <CheckboxItem
                key={t.value}
                checked={tagList.includes(t.value)}
                onChange={() => toggleList("tags", t.value)}
                label={t.label}
              />
            ))}
          </FilterGroup>

          <button
            type="button"
            onClick={clearAll}
            className="w-full mt-2 text-sm text-slate-500 hover:text-brand py-2 border border-slate-200 rounded-md"
          >
            条件をクリア
          </button>

          <button
            type="button"
            className="lg:hidden mt-3 w-full bg-brand text-white font-bold py-3 rounded-lg"
            onClick={() => setOpen(false)}
          >
            この条件で見る ({resultCount})
          </button>
        </div>
      </aside>
    </>
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
      <h3 className="font-semibold text-sm text-slate-700 mb-2">{label}</h3>
      <div className="space-y-1.5">{children}</div>
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
    <label className="flex items-center gap-2 cursor-pointer text-sm py-1 group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
      />
      <span className="text-slate-700 group-hover:text-brand transition-colors">
        {label}
      </span>
    </label>
  );
}
