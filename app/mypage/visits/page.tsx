import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteVisitButton from "./DeleteVisitButton";

export const metadata: Metadata = { title: "おでかけ履歴" };

type Visit = {
  id: string;
  facility_slug: string;
  facility_name: string;
  visited_on: string | null;
  family_revisit: "yes" | "conditional" | "once_enough" | "no";
  parent_fatigue: "easy" | "normal" | "tired" | "exhausted" | null;
  weather: "sunny" | "cloudy" | "rainy" | "snowy" | "unknown" | null;
  crowding: "empty" | "normal" | "busy" | "very_busy" | "unknown" | null;
  stay_duration_min: number | null;
};

type VisitChild = {
  visit_id: string;
  satisfaction:
    | "loved"
    | "enjoyed"
    | "neutral"
    | "not_fit"
    | "could_not_join"
    | null;
  child_id: string;
  children: { nickname: string } | { nickname: string }[] | null;
};

const revisitLabels: Record<Visit["family_revisit"], string> = {
  yes: "✅ また行きたい",
  conditional: "🔄 条件次第",
  once_enough: "👍 一度で十分",
  no: "🙅 もう行かない",
};

const satisfactionLabels: Record<NonNullable<VisitChild["satisfaction"]>, string> = {
  loved: "大満足",
  enjoyed: "楽しんだ",
  neutral: "普通",
  not_fit: "合わなかった",
  could_not_join: "参加できず",
};

const fatigueEmojis: Record<NonNullable<Visit["parent_fatigue"]>, string> = {
  easy: "😊",
  normal: "🙂",
  tired: "😴",
  exhausted: "😵",
};

const weatherEmojis: Record<NonNullable<Visit["weather"]>, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧",
  snowy: "❄️",
  unknown: "",
};

const crowdingLabels: Record<NonNullable<Visit["crowding"]>, string> = {
  empty: "空いてた",
  normal: "ふつう",
  busy: "混雑",
  very_busy: "かなり混雑",
  unknown: "覚えていない",
};

function formatVisitedOn(visitedOn: string | null): string {
  if (!visitedOn) return "日付未設定";
  return visitedOn.replaceAll("-", "/");
}

function formatStayDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}時間${remainingMinutes}分`;
  }
  if (hours > 0) return `${hours}時間`;
  return `${remainingMinutes}分`;
}

function childNickname(child: VisitChild["children"]): string {
  if (Array.isArray(child)) return child[0]?.nickname ?? "子ども";
  return child?.nickname ?? "子ども";
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ no_child?: string; revisit?: string; child_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const filterRevisit = params.revisit === "yes";
  const filterChildId = params.child_id ?? null;

  let visitIds: string[] | null = null;
  if (filterChildId && user) {
    const { data: childVisitRows } = await supabase
      .from("visit_children")
      .select("visit_id")
      .eq("child_id", filterChildId);
    visitIds = (childVisitRows ?? []).map(
      (row: { visit_id: string }) => row.visit_id,
    );
  }

  let visitsQuery = user
    ? supabase
        .from("visits")
        .select(
          "id, facility_slug, facility_name, visited_on, family_revisit, parent_fatigue, weather, crowding, stay_duration_min",
        )
        .eq("user_id", user.id)
        .order("visited_on", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(100)
    : null;

  if (visitsQuery && visitIds !== null) {
    visitsQuery = visitIds.length > 0
      ? visitsQuery.in("id", visitIds)
      : visitsQuery.in("id", ["__no_match__"]);
  }
  if (visitsQuery && filterRevisit) {
    visitsQuery = visitsQuery.eq("family_revisit", "yes");
  }

  const { data: visits } = visitsQuery
    ? await visitsQuery
    : { data: [] };

  const visitRows = (visits ?? []) as Visit[];
  const visitIdsForChildren = visitRows.map((visit) => visit.id);
  const { data: allVisitChildren } =
    visitIdsForChildren.length > 0
      ? await supabase
          .from("visit_children")
          .select("visit_id, satisfaction, child_id, children(nickname)")
          .in("visit_id", visitIdsForChildren)
      : { data: [] };
  const childrenByVisit = new Map<string, VisitChild[]>();
  for (const childVisit of (allVisitChildren ?? []) as VisitChild[]) {
    const current = childrenByVisit.get(childVisit.visit_id) ?? [];
    current.push(childVisit);
    childrenByVisit.set(childVisit.visit_id, current);
  }

  let filterLabel: string | null = null;
  if (filterRevisit) filterLabel = "また行きたい";
  if (filterChildId) filterLabel = "子ども別フィルター";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
        ← マイページ
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">おでかけ履歴</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filterLabel
              ? `「${filterLabel}」でフィルター中`
              : "最近の記録を新しい順に表示します。"}
          </p>
        </div>
        <Link
          href="/mypage/visits/new"
          className="shrink-0 px-3 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors"
        >
          記録する
        </Link>
      </div>

      {filterLabel && (
        <Link
          href="/mypage/visits"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 rounded-full px-3 py-1.5 transition-colors"
        >
          ✕ フィルターを解除
        </Link>
      )}

      {params.no_child === "1" && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700 leading-relaxed">
          子どもプロフィールなしで保存しました。あとから登録すると、次回以降は子どもごとの満足度も残せます。
        </div>
      )}

      {visitRows.length > 0 ? (
        <div className="space-y-3">
          {visitRows.map((visit) => {
            const visitChildren = childrenByVisit.get(visit.id) ?? [];
            const stayDuration = formatStayDuration(visit.stay_duration_min);
            const hasFacilityPage = !visit.facility_slug.startsWith("manual-");
            return (
            <article
              key={visit.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-slate-900">{visit.facility_name}</h2>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatVisitedOn(visit.visited_on)}
                </span>
              </div>
              {visitChildren.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visitChildren.map((childVisit) => (
                    <span
                      key={`${childVisit.visit_id}-${childVisit.child_id}`}
                      className="text-xs text-slate-600 bg-slate-50 rounded-full px-2 py-1"
                    >
                      {childNickname(childVisit.children)}:{" "}
                      {childVisit.satisfaction
                        ? satisfactionLabels[childVisit.satisfaction]
                        : "未記録"}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{revisitLabels[visit.family_revisit]}</span>
                {visit.parent_fatigue && <span>{fatigueEmojis[visit.parent_fatigue]}</span>}
                {visit.weather && weatherEmojis[visit.weather] && (
                  <span>{weatherEmojis[visit.weather]}</span>
                )}
                {stayDuration && <span>{stayDuration}</span>}
                {visit.crowding && <span>{crowdingLabels[visit.crowding]}</span>}
              </div>
              <div className="flex items-center justify-between gap-3">
                {hasFacilityPage ? (
                  <Link
                    href={`/facilities/${visit.facility_slug}`}
                    className="text-slate-400 text-xs hover:underline"
                  >
                    施設ページ ↗
                  </Link>
                ) : (
                  <span />
                )}
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/mypage/visits/${visit.id}/edit`}
                    className="px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    編集
                  </Link>
                  <DeleteVisitButton
                    visitId={visit.id}
                    facilityName={visit.facility_name}
                  />
                </div>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-sm">
          まだ記録がありません
        </div>
      )}

    </div>
  );
}
