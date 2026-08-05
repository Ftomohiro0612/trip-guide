"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resetFacilityPage } from "@/lib/facility-pagination";

type ChildChip = {
  id: string;
  nickname: string;
  age: number;
  ageTag: string;
};

function calcAge(birthYear: number, birthMonth: number): number {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth) {
    age -= 1;
  }
  return age;
}

// 施設タグは「0-3歳OK」「小学生向け」の2種だけが年齢の構造化タグ。
// 4〜5歳は対応タグがないためチップを出さない。
function ageToTag(age: number): string | null {
  if (age >= 0 && age <= 3) return "0-3歳OK";
  if (age >= 6 && age <= 12) return "小学生向け";
  return null;
}

export default function ChildAgeQuickFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [chips, setChips] = useState<ChildChip[]>([]);

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      const { data } = await supabase
        .from("children")
        .select("id, nickname, birth_year, birth_month")
        .eq("user_id", user.id)
        .order("birth_year", { ascending: true });
      if (!active || !data) return;

      const next: ChildChip[] = [];
      for (const child of data) {
        if (
          typeof child.id !== "string" ||
          typeof child.nickname !== "string" ||
          typeof child.birth_year !== "number" ||
          typeof child.birth_month !== "number"
        ) {
          continue;
        }
        const age = calcAge(child.birth_year, child.birth_month);
        const ageTag = ageToTag(age);
        if (!ageTag) continue;
        next.push({ id: child.id, nickname: child.nickname, age, ageTag });
      }
      setChips(next);
    }

    loadChildren();

    return () => {
      active = false;
    };
  }, []);

  if (chips.length === 0) return null;

  const tagList = (searchParams.get("tags") ?? "").split(",").filter(Boolean);

  function toggleTag(tag: string) {
    const params = new URLSearchParams(searchParams);
    const list = (params.get("tags") ?? "").split(",").filter(Boolean);
    const next = list.includes(tag)
      ? list.filter((v) => v !== tag)
      : [...list, tag];
    if (next.length) params.set("tags", next.join(","));
    else params.delete("tags");
    resetFacilityPage(params);
    startTransition(() => {
      const s = params.toString();
      router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-500">うちの子と行ける</span>
      {chips.map((chip) => {
        const isActive = tagList.includes(chip.ageTag);
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => toggleTag(chip.ageTag)}
            aria-pressed={isActive}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              isActive
                ? "border-brand bg-brand text-white"
                : "border-sky-200 bg-sky-50 text-sky-700 hover:border-brand/50"
            }`}
          >
            👧 {chip.nickname}（{chip.age}歳）と行ける
          </button>
        );
      })}
    </div>
  );
}
