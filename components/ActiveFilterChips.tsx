"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ChipsProps {
  prefectures: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

const RAIN_LABELS: Record<string, string> = {
  "◎": "雨でも快適",
  "△": "一部雨OK",
  "×": "雨は不向き",
};

const FEE_LABELS: Record<string, string> = {
  free: "無料",
  paid: "有料",
};

export default function ActiveFilterChips({
  prefectures,
  categories,
}: ChipsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(params: URLSearchParams) {
    startTransition(() => {
      const s = params.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    });
  }

  function removeFromList(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    const list = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = list.filter((v) => v !== value);
    if (next.length) params.set(key, next.join(","));
    else params.delete(key);
    update(params);
  }

  function removeKey(key: string) {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    update(params);
  }

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  const prefList = (searchParams.get("prefectures") ?? "")
    .split(",")
    .filter(Boolean);
  for (const p of prefList) {
    const m = prefectures.find((pp) => pp.id === p);
    chips.push({
      key: `pref-${p}`,
      label: `📍 ${m?.name ?? p}`,
      onRemove: () => removeFromList("prefectures", p),
    });
  }

  const catList = (searchParams.get("categories") ?? "")
    .split(",")
    .filter(Boolean);
  for (const c of catList) {
    const m = categories.find((cc) => cc.id === c);
    chips.push({
      key: `cat-${c}`,
      label: `🏷️ ${m?.name ?? c}`,
      onRemove: () => removeFromList("categories", c),
    });
  }

  const indoorList = (searchParams.get("indoor") ?? "")
    .split(",")
    .filter(Boolean);
  for (const v of indoorList) {
    chips.push({
      key: `indoor-${v}`,
      label: `🏠 ${v}`,
      onRemove: () => removeFromList("indoor", v),
    });
  }

  const rainList = (searchParams.get("rain") ?? "")
    .split(",")
    .filter(Boolean);
  for (const v of rainList) {
    chips.push({
      key: `rain-${v}`,
      label: `☂️ ${RAIN_LABELS[v] ?? v}`,
      onRemove: () => removeFromList("rain", v),
    });
  }

  const fee = searchParams.get("fee");
  if (fee && (fee === "free" || fee === "paid")) {
    chips.push({
      key: "fee",
      label: `💴 ${FEE_LABELS[fee]}`,
      onRemove: () => removeKey("fee"),
    });
  }

  const tagList = (searchParams.get("tags") ?? "")
    .split(",")
    .filter(Boolean);
  for (const t of tagList) {
    chips.push({
      key: `tag-${t}`,
      label: `# ${t}`,
      onRemove: () => removeFromList("tags", t),
    });
  }

  const q = searchParams.get("q");
  if (q) {
    chips.push({
      key: "q",
      label: `🔍 "${q}"`,
      onRemove: () => removeKey("q"),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-slate-500 mr-1">適用中:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="inline-flex items-center gap-1 bg-sky-50 hover:bg-rose-50 text-sky-800 hover:text-rose-700 border border-sky-200 hover:border-rose-300 rounded-full pl-3 pr-2 py-1 text-xs font-medium transition-colors group"
          aria-label={`${c.label} を解除`}
        >
          <span>{c.label}</span>
          <span className="text-sky-400 group-hover:text-rose-500 text-base leading-none ml-0.5">
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
