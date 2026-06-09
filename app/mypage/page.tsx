import type { Metadata } from "next";
import Link from "next/link";
import facilitiesJson from "@/data/facilities_data.json";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = { title: "マイページ" };

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
};

type VisitStat = {
  id: string;
  facility_slug: string;
  family_revisit: string;
};

type ChildVisit = {
  child_id: string;
  visit_id: string;
};

type ChildCategorySummary = {
  child: Child;
  categories: {
    category: string;
    count: number;
  }[];
};

type AchievementStats = {
  distinctFacilityCount: number;
  totalVisitCount: number;
  wishlistCount: number;
  revisitCount: number;
};

type FacilityCategorySource = {
  slug: string;
  category: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFacilityCategorySource(value: unknown): value is FacilityCategorySource {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.category === "string"
  );
}

function getFacilityCategorySources(value: unknown): FacilityCategorySource[] {
  if (!isRecord(value) || !Array.isArray(value.facilities)) return [];
  return value.facilities.filter(isFacilityCategorySource);
}

function isVisitStat(value: unknown): value is VisitStat {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.facility_slug === "string" &&
    typeof value.family_revisit === "string"
  );
}

function isChildVisit(value: unknown): value is ChildVisit {
  return (
    isRecord(value) &&
    typeof value.child_id === "string" &&
    typeof value.visit_id === "string"
  );
}

const slugToCategory = new Map(
  getFacilityCategorySources(facilitiesJson).map((facility) => [
    facility.slug,
    facility.category,
  ]),
);

function categoryForSlug(slug: string): string {
  if (slug.startsWith("manual-")) return "その他";
  return slugToCategory.get(slug) ?? "その他";
}

function calcAge(birthYear: number, birthMonth: number): number {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (
    today.getMonth() + 1 < birthMonth ||
    (today.getMonth() + 1 === birthMonth && today.getDate() < 1)
  ) {
    age -= 1;
  }
  return age;
}

function buildChildCategorySummaries(
  children: Child[],
  visits: VisitStat[],
  childVisits: ChildVisit[],
): ChildCategorySummary[] {
  const childIds = new Set(children.map((child) => child.id));
  const visitSlugById = new Map(
    visits.map((visit) => [visit.id, visit.facility_slug]),
  );
  const categoryCountsByChild = new Map<string, Map<string, number>>();

  for (const childVisit of childVisits) {
    if (!childIds.has(childVisit.child_id)) continue;

    const facilitySlug = visitSlugById.get(childVisit.visit_id);
    if (!facilitySlug) continue;

    const category = categoryForSlug(facilitySlug);
    const currentCounts =
      categoryCountsByChild.get(childVisit.child_id) ?? new Map<string, number>();
    currentCounts.set(category, (currentCounts.get(category) ?? 0) + 1);
    categoryCountsByChild.set(childVisit.child_id, currentCounts);
  }

  return children.map((child) => {
    const counts = categoryCountsByChild.get(child.id) ?? new Map<string, number>();
    const categories = Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category, "ja"))
      .slice(0, 3);

    return { child, categories };
  });
}

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: children },
    { data: visitStats },
    { count: exactWishlistCount },
  ] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("children")
      .select("id, nickname, birth_year, birth_month")
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("visits")
          .select("id, facility_slug, family_revisit")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("wishlists")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const childRows = (children ?? []).filter(isRecord).filter((child): child is Child => {
    return (
      typeof child.id === "string" &&
      typeof child.nickname === "string" &&
      typeof child.birth_year === "number" &&
      typeof child.birth_month === "number"
    );
  });
  const visits = (visitStats ?? []).filter(isVisitStat);
  const visitIds = visits.map((visit) => visit.id);
  const { data: childVisitStats } =
    visitIds.length > 0
      ? await supabase
          .from("visit_children")
          .select("child_id, visit_id")
          .in("visit_id", visitIds)
      : { data: [] };
  const childVisits = (childVisitStats ?? []).filter(isChildVisit);

  const hasChildren = childRows.length > 0;
  const achievementStats: AchievementStats = {
    distinctFacilityCount: new Set(visits.map((visit) => visit.facility_slug)).size,
    totalVisitCount: visits.length,
    wishlistCount: exactWishlistCount ?? 0,
    revisitCount: visits.filter((visit) => visit.family_revisit === "yes").length,
  };
  const hasAchievementRecords =
    achievementStats.distinctFacilityCount > 0 ||
    achievementStats.totalVisitCount > 0 ||
    achievementStats.wishlistCount > 0 ||
    achievementStats.revisitCount > 0;
  const childCategorySummaries = buildChildCategorySummaries(
    childRows,
    visits,
    childVisits,
  );
  const hasChildCategoryRecords = childCategorySummaries.some(
    (summary) => summary.categories.length > 0,
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* ウェルカム */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">メモリップ by Trip Guide</p>
          <h1 className="text-xl font-bold text-slate-900">
            {profile?.display_name
              ? `こんにちは、${profile.display_name}さん 👋`
              : "こんにちは 👋"}
          </h1>
        </div>
        <Link
          href="/mypage/settings"
          className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
          aria-label="アカウント設定"
        >
          ⚙️
        </Link>
      </div>

      {/* 子どもプロフィール未登録プロンプト */}
      {!hasChildren && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <p className="font-semibold text-sky-900 text-sm">
            子どもプロフィールを登録すると便利です
          </p>
          <p className="text-sky-700 text-xs mt-1 leading-relaxed">
            ニックネームと生年月を登録することで、おでかけ記録に「当時の年齢」が自動でつきます。本名・学校名は不要です。登録しなくてもおでかけ記録は使えます。
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/mypage/children"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors"
            >
              登録する →
            </Link>
            <Link
              href="/mypage/visits/new"
              className="text-xs text-sky-600 hover:underline"
            >
              あとで登録する
            </Link>
          </div>
        </div>
      )}

      {/* 子どもプロフィール一覧 */}
      {hasChildren && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">子どもプロフィール</h2>
            <Link
              href="/mypage/children"
              className="text-brand text-sm hover:underline"
            >
              編集
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {childRows.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5"
              >
                <span className="text-lg">🧒</span>
                <span className="text-sm font-medium text-slate-800">
                  {child.nickname}
                </span>
                <span className="text-xs text-slate-400">
                  {calcAge(child.birth_year, child.birth_month)}歳
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="font-bold text-slate-800 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            href="/mypage/visits/new"
            icon="✏️"
            label="おでかけを記録"
            desc="今日行った場所を30秒で記録"
            primary
          />
          <ActionCard
            href="/mypage/wishlist"
            icon="⭐"
            label="行きたいリスト"
            desc="候補の施設をまとめておく"
          />
          <ActionCard
            href="/mypage/visits"
            icon="📖"
            label="おでかけ履歴"
            desc="これまでの記録を振り返る"
          />
        </div>
      </section>

      {/* おでかけ実績サマリー */}
      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">おでかけ実績</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          {hasAchievementRecords ? (
            <div className="grid grid-cols-2 gap-3">
              <AchievementMetric
                label="行った施設"
                value={`${achievementStats.distinctFacilityCount}か所`}
              />
              <AchievementMetric
                label="おでかけ回数"
                value={`${achievementStats.totalVisitCount}回`}
              />
              <AchievementMetric
                label="行きたいリスト"
                value={`${achievementStats.wishlistCount}件`}
              />
              <AchievementMetric
                label="また行きたい"
                value={`${achievementStats.revisitCount}件`}
              />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              記録するとここに実績が表示されます
            </p>
          )}
        </div>
      </section>

      {hasChildren && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-800">子ども別あそび実績</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            {hasChildCategoryRecords ? (
              childCategorySummaries.map((summary) => (
                <div key={summary.child.id} className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm">
                    {summary.child.nickname}
                  </p>
                  {summary.categories.length > 0 ? (
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {summary.categories
                        .map(({ category, count }) => `${category} ${count}回`)
                        .join(" / ")}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      まだ子ども別の記録がありません
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">
                子どもごとの記録をするとここに表示されます
              </p>
            )}
          </div>
        </section>
      )}

      {/* ログアウト */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
  desc,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl p-4 flex flex-col gap-1 transition-colors ${
        primary
          ? "bg-brand text-white hover:bg-brand-dark"
          : "bg-white border border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span
        className={`font-semibold text-sm ${primary ? "text-white" : "text-slate-800"}`}
      >
        {label}
      </span>
      <span
        className={`text-xs leading-relaxed ${primary ? "text-sky-100" : "text-slate-500"}`}
      >
        {desc}
      </span>
    </Link>
  );
}

function AchievementMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-slate-900">{value}</p>
      <p className="text-slate-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}
