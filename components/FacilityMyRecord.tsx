"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type LoadState = "loading" | "guest" | "ready";

type VisitRow = {
  id: string;
  visited_on: string | null;
  family_revisit: string | null;
  parent_fatigue: string | null;
};

type VisitChildRow = {
  visit_id: string;
  child_id: string;
  satisfaction: string | null;
};

type ChildRow = {
  id: string;
  nickname: string | null;
};

const FAMILY_REVISIT_LABELS: Record<string, string> = {
  yes: "また行きたい✅",
  conditional: "条件次第🔄",
  once_enough: "一度で十分👍",
  no: "もう行かない🙅",
};

const SATISFACTION_LABELS: Record<string, string> = {
  loved: "大満足",
  enjoyed: "楽しんだ",
  neutral: "普通",
  not_fit: "合わなかった",
  could_not_join: "参加できず",
};

function formatVisitedOn(value: string | null) {
  if (!value) return "日付未設定";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}/${month}/${day}`;
}

export default function FacilityMyRecord({
  facilitySlug,
}: {
  facilitySlug: string;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [latestChildren, setLatestChildren] = useState<VisitChildRow[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        setLoadState("guest");
        return;
      }

      const { data: visitRows } = await supabase
        .from("visits")
        .select("id, visited_on, family_revisit, parent_fatigue")
        .eq("facility_slug", facilitySlug)
        .eq("user_id", user.id)
        .order("visited_on", { ascending: false, nullsFirst: false });

      if (!active) return;

      const typedVisits = (visitRows ?? []) as VisitRow[];
      setVisits(typedVisits);

      if (typedVisits.length === 0) {
        setLatestChildren([]);
        setChildren([]);
        setLoadState("ready");
        return;
      }

      const visitIds = typedVisits.map((visit) => visit.id);
      const latestVisitId = typedVisits[0].id;

      const [{ data: visitChildRows }, { data: childRows }] =
        await Promise.all([
          supabase
            .from("visit_children")
            .select("visit_id, child_id, satisfaction")
            .in("visit_id", visitIds),
          supabase.from("children").select("id, nickname").eq("user_id", user.id),
        ]);

      if (!active) return;

      setLatestChildren(
        ((visitChildRows ?? []) as VisitChildRow[]).filter(
          (row) => row.visit_id === latestVisitId,
        ),
      );
      setChildren((childRows ?? []) as ChildRow[]);
      setLoadState("ready");
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [facilitySlug]);

  const childNameById = useMemo(() => {
    return new Map(children.map((child) => [child.id, child.nickname ?? "子ども"]));
  }, [children]);

  if (loadState === "loading") {
    return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (loadState === "guest") return null;

  if (visits.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
        <p className="text-sm text-slate-500">まだこの施設の記録はありません</p>
      </div>
    );
  }

  const latestVisit = visits[0];
  const familyRevisitLabel = latestVisit.family_revisit
    ? FAMILY_REVISIT_LABELS[latestVisit.family_revisit] ?? latestVisit.family_revisit
    : "未設定";

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <h3 className="font-bold text-emerald-900 mb-3">あなたの記録</h3>
      <dl className="space-y-1.5 text-sm text-emerald-950">
        <div className="flex justify-between gap-3">
          <dt className="text-emerald-700">訪問回数</dt>
          <dd className="font-bold">{visits.length}回</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-emerald-700">前回訪問</dt>
          <dd className="font-bold">{formatVisitedOn(latestVisit.visited_on)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-emerald-700">また行きたい</dt>
          <dd className="font-bold text-right">{familyRevisitLabel}</dd>
        </div>
      </dl>
      {latestChildren.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {latestChildren.map((child) => (
            <span
              key={child.child_id}
              className="text-xs bg-white/80 text-emerald-800 border border-emerald-100 px-2 py-1 rounded-md font-medium"
            >
              {childNameById.get(child.child_id) ?? "子ども"}:{" "}
              {child.satisfaction
                ? SATISFACTION_LABELS[child.satisfaction] ?? child.satisfaction
                : "未設定"}
            </span>
          ))}
        </div>
      )}
      <Link
        href="/mypage/visits"
        className="mt-4 block w-full text-center bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-sm py-2.5 rounded-lg transition-colors"
      >
        📖 記録をもっと見る
      </Link>
    </div>
  );
}
