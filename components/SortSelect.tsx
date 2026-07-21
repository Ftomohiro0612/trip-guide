"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { resetFacilityPage } from "@/lib/facility-pagination";

const OPTIONS: { value: string; label: string }[] = [
  { value: "recommend", label: "おすすめ順" },
  { value: "prefecture", label: "県別" },
  { value: "name", label: "名前順" },
];

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const current = searchParams.get("sort") ?? "recommend";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams);
    resetFacilityPage(params);
    if (e.target.value === "recommend") params.delete("sort");
    else params.set("sort", e.target.value);
    startTransition(() => {
      const s = params.toString();
      router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500">並び替え</span>
      <select
        value={current}
        onChange={onChange}
        className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-medium hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
