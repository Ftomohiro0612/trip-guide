import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ChildAvatar from "@/components/ChildAvatar";
import facilitiesJson from "@/data/facilities_data.json";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = { title: "マイページ" };

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  avatar_url: string | null;
};

type VisitStat = {
  id: string;
  facility_slug: string;
  facility_name: string;
  visited_on: string | null;
  family_revisit: string;
};

type ChildVisit = {
  child_id: string;
  visit_id: string;
};

type ChildCategorySummary = {
  child: Child;
  categories: { category: string; count: number }[];
};

type AchievementStats = {
  distinctFacilityCount: number;
  totalVisitCount: number;
  wishlistCount: number;
  revisitCount: number;
};

type MonthCategory = {
  category: string;
  count: number;
};

type MonthData = {
  month: string;
  label: string;
  count: number;
  categories: MonthCategory[];
};

type VisitPhotoThumbRow = {
  visit_id: string;
  thumb_path: string | null;
  sort_order: number | null;
};

type RecentMemory = {
  visitId: string;
  facilityName: string;
  visitedOn: string | null;
  thumbPath: string;
  thumbUrl: string | null;
};

type FacilityCategorySource = { slug: string; category: string };

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
    typeof value.facility_name === "string" &&
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

function isVisitPhotoThumbRow(value: unknown): value is VisitPhotoThumbRow {
  return (
    isRecord(value) &&
    typeof value.visit_id === "string" &&
    (typeof value.thumb_path === "string" || value.thumb_path === null) &&
    (typeof value.sort_order === "number" || value.sort_order === null)
  );
}

const slugToCategory = new Map(
  getFacilityCategorySources(facilitiesJson).map((f) => [f.slug, f.category]),
);

const categoryColors: Record<string, string> = {
  "遊園地・テーマパーク": "bg-rose-400",
  "動物園": "bg-amber-400",
  "水族館": "bg-sky-400",
  "公園(大型遊具)": "bg-emerald-400",
  "屋内遊び場": "bg-violet-400",
  "科学館": "bg-cyan-400",
  "博物館": "bg-orange-400",
  "クラフト体験": "bg-pink-400",
  "味覚狩り": "bg-lime-400",
  "温泉プール": "bg-teal-400",
  "アスレチック": "bg-green-500",
  "美術館・体験": "bg-fuchsia-400",
  "スキー場・雪遊び": "bg-indigo-400",
  "体験": "bg-purple-400",
  "ホテル": "bg-stone-400",
  "公園・自然": "bg-lime-600",
  "展望台": "bg-blue-400",
  "自然・絶景": "bg-emerald-600",
  "屋内テーマパーク": "bg-red-500",
  "ゲームセンター": "bg-yellow-400",
};

function categoryForSlug(slug: string): string {
  if (slug.startsWith("manual-")) return "その他";
  return slugToCategory.get(slug) ?? "その他";
}

function categoryColor(category: string): string {
  return categoryColors[category] ?? "bg-slate-300";
}

function compareCategoryEntries(
  a: { category: string; count: number },
  b: { category: string; count: number },
): number {
  const aOther = a.category === "その他";
  const bOther = b.category === "その他";
  if (aOther !== bOther) return aOther ? 1 : -1;
  return b.count - a.count || a.category.localeCompare(b.category, "ja");
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
  const childIds = new Set(children.map((c) => c.id));
  const visitSlugById = new Map(visits.map((v) => [v.id, v.facility_slug]));
  const categoryCountsByChild = new Map<string, Map<string, number>>();

  for (const cv of childVisits) {
    if (!childIds.has(cv.child_id)) continue;
    const facilitySlug = visitSlugById.get(cv.visit_id);
    if (!facilitySlug) continue;
    const category = categoryForSlug(facilitySlug);
    const counts = categoryCountsByChild.get(cv.child_id) ?? new Map<string, number>();
    counts.set(category, (counts.get(category) ?? 0) + 1);
    categoryCountsByChild.set(cv.child_id, counts);
  }

  return children.map((child) => {
    const counts = categoryCountsByChild.get(child.id) ?? new Map<string, number>();
    const categories = Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort(compareCategoryEntries)
      .slice(0, 5);
    return { child, categories };
  });
}

function buildMonthlyData(visits: VisitStat[]): MonthData[] {
  const visitsByMonth = new Map<string, Map<string, number>>();
  for (const visit of visits) {
    if (!visit.visited_on) continue;
    const month = visit.visited_on.slice(0, 7);
    const category = categoryForSlug(visit.facility_slug);
    const categoryCounts = visitsByMonth.get(month) ?? new Map<string, number>();
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    visitsByMonth.set(month, categoryCounts);
  }

  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const categories = Array.from(
      (visitsByMonth.get(month) ?? new Map<string, number>()).entries(),
    )
      .map(([category, count]) => ({ category, count }))
      .sort(compareCategoryEntries);
    return {
      month,
      label: `${d.getMonth() + 1}月`,
      count: categories.reduce((total, category) => total + category.count, 0),
      categories,
    };
  });
}

function formatVisitedOn(visitedOn: string | null): string {
  if (!visitedOn) return "日付未設定";
  return visitedOn.replaceAll("-", "/");
}

const revisitLabels: Record<string, string> = {
  yes: "✅ また行きたい",
  conditional: "🔄 条件次第",
  once_enough: "👍 一度で十分",
  no: "🙅 もう行かない",
};

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
      ? supabase.from("profiles").select("display_name").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("children")
      .select("id, nickname, birth_year, birth_month, avatar_url")
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("visits")
          .select("id, facility_slug, facility_name, visited_on, family_revisit")
          .eq("user_id", user.id)
          .eq("status", "published")
          .order("visited_on", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
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
      typeof child.birth_month === "number" &&
      (typeof child.avatar_url === "string" || child.avatar_url === null)
    );
  });
  const avatarPaths = childRows
    .map((child) => child.avatar_url)
    .filter((path): path is string => Boolean(path));
  const { data: signedAvatars } =
    avatarPaths.length > 0
      ? await supabase.storage
          .from("child-avatars")
          .createSignedUrls(avatarPaths, 60 * 60)
      : { data: [] };
  const avatarUrlByPath = new Map(
    (signedAvatars ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const visits = (visitStats ?? []).filter(isVisitStat);
  const visitIds = visits.map((v) => v.id);
  const candidateVisitIds = PHOTO_UPLOAD_ENABLED ? visitIds.slice(0, 12) : [];
  const { data: visitPhotoRows } =
    candidateVisitIds.length > 0
      ? await supabase
          .from("visit_photos")
          .select("visit_id, thumb_path, sort_order")
          .in("visit_id", candidateVisitIds)
          .not("thumb_path", "is", null)
          .order("visit_id", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [] };
  const { data: childVisitStats } =
    visitIds.length > 0
      ? await supabase
          .from("visit_children")
          .select("child_id, visit_id")
          .in("visit_id", visitIds)
      : { data: [] };
  const childVisits = (childVisitStats ?? []).filter(isChildVisit);
  const firstThumbPathByVisit = new Map<string, string>();
  for (const photo of (visitPhotoRows ?? []).filter(isVisitPhotoThumbRow)) {
    if (!photo.thumb_path || firstThumbPathByVisit.has(photo.visit_id)) continue;
    firstThumbPathByVisit.set(photo.visit_id, photo.thumb_path);
  }
  const recentMemoryCandidates = visits.flatMap((visit) => {
    const thumbPath = firstThumbPathByVisit.get(visit.id);
    return thumbPath
      ? [
          {
            visitId: visit.id,
            facilityName: visit.facility_name,
            visitedOn: visit.visited_on,
            thumbPath,
          },
        ]
      : [];
  }).slice(0, 4);
  const { data: signedMemoryThumbs } =
    recentMemoryCandidates.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(
            recentMemoryCandidates.map((memory) => memory.thumbPath),
            60 * 60,
          )
      : { data: [] };
  const signedMemoryThumbUrlByPath = new Map(
    (signedMemoryThumbs ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const recentMemories: RecentMemory[] = PHOTO_UPLOAD_ENABLED
    ? recentMemoryCandidates.map((memory) => ({
        ...memory,
        thumbUrl: signedMemoryThumbUrlByPath.get(memory.thumbPath) ?? null,
      }))
    : [];

  const hasChildren = childRows.length > 0;
  const achievementStats: AchievementStats = {
    distinctFacilityCount: new Set(visits.map((v) => v.facility_slug)).size,
    totalVisitCount: visits.length,
    wishlistCount: exactWishlistCount ?? 0,
    revisitCount: visits.filter((v) => v.family_revisit === "yes").length,
  };
  const hasAchievementRecords =
    achievementStats.distinctFacilityCount > 0 ||
    achievementStats.totalVisitCount > 0 ||
    achievementStats.wishlistCount > 0;

  const monthlyData = buildMonthlyData(visits);
  const hasMonthlyData = monthlyData.some((d) => d.count > 0);
  const recentVisits = visits.slice(0, 3);

  const childCategorySummaries = buildChildCategorySummaries(childRows, visits, childVisits);
  const hasChildCategoryRecords = childCategorySummaries.some(
    (s) => s.categories.length > 0,
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* ウェルカム */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">メモリップ</p>
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
            <Link href="/mypage/visits/new" className="text-xs text-sky-600 hover:underline">
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
            <Link href="/mypage/children" className="text-brand text-sm hover:underline">
              編集
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {childRows.map((child) => (
              <Link
                key={child.id}
                href={`#child-achievement-${child.id}`}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 transition-colors hover:border-brand/40 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <ChildAvatar
                  childId={child.id}
                  nickname={child.nickname}
                  avatarUrl={
                    child.avatar_url
                      ? avatarUrlByPath.get(child.avatar_url) ?? null
                      : null
                  }
                  size="sm"
                />
                <span className="text-sm font-medium text-slate-800">{child.nickname}</span>
                <span className="text-xs text-slate-400">
                  {calcAge(child.birth_year, child.birth_month)}歳
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 最近の思い出 */}
      {recentMemories.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">最近の思い出</h2>
            <Link href="/mypage/visits" className="text-brand text-sm hover:underline">
              もっと見る →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {recentMemories.map((memory) => (
              <Link
                key={memory.visitId}
                href={`/mypage/visits/${memory.visitId}`}
                className="min-w-0 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="aspect-square relative overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {memory.thumbUrl ? (
                    <Image
                      src={memory.thumbUrl}
                      alt={`${memory.facilityName}の写真`}
                      fill
                      sizes="96px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
                      写真なし
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-700">
                  {memory.facilityName}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatVisitedOn(memory.visitedOn)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="font-bold text-slate-800 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            href="/mypage/visits/new"
            icon="✏️"
            label="おでかけを記録"
            desc="今日行った場所を30秒で記録"
            primary
          />
          <ActionCard
            href="/mypage/visits/from-photo"
            icon="📷"
            label="写真からおでかけ記録をまとめて作る"
            desc="写真を選ぶだけで日付・場所を自動入力"
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

      {/* おでかけ実績 */}
      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">おでかけ実績</h2>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          {hasAchievementRecords ? (
            <>
              <div className="grid grid-cols-2 gap-1">
                <AchievementMetric
                  label="行った施設"
                  value={`${achievementStats.distinctFacilityCount}か所`}
                  href="/mypage/visits"
                />
                <AchievementMetric
                  label="おでかけ回数"
                  value={`${achievementStats.totalVisitCount}回`}
                  href="/mypage/visits"
                />
                <AchievementMetric
                  label="行きたいリスト"
                  value={`${achievementStats.wishlistCount}件`}
                  href="/mypage/wishlist"
                />
                <AchievementMetric
                  label="また行きたい"
                  value={`${achievementStats.revisitCount}件`}
                  href="/mypage/visits?revisit=yes"
                />
              </div>
              {hasMonthlyData && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">最近6ヶ月のおでかけ</p>
                  <MonthlyBarChart data={monthlyData} />
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-400 text-sm">記録するとここに実績が表示されます</p>
          )}
        </div>
      </section>

      {/* 最近のおでかけ */}
      {recentVisits.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">最近のおでかけ</h2>
            <Link href="/mypage/visits" className="text-brand text-sm hover:underline">
              すべて見る
            </Link>
          </div>
          <div className="space-y-2">
            {recentVisits.map((visit) => (
              <Link
                key={visit.id}
                href={`/mypage/visits/${visit.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-brand/40 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {visit.facility_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatVisitedOn(visit.visited_on)}
                  </p>
                </div>
                <span className="text-xs text-slate-500 shrink-0 text-right">
                  {revisitLabels[visit.family_revisit] ?? ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 子ども別あそび実績 */}
      {hasChildren && (
        <section className="space-y-3">
          <div>
            <h2 className="font-bold text-slate-800">子ども別あそび実績</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              お子さまごとに、一緒に行ったおでかけをカテゴリ別に集計しています。おでかけ実績とは数え方が違うため件数が一致しないことがあります。
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-5">
            {hasChildCategoryRecords ? (
              childCategorySummaries.map((summary) => (
                <div
                  key={summary.child.id}
                  id={`child-achievement-${summary.child.id}`}
                  className="scroll-mt-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ChildAvatar
                        childId={summary.child.id}
                        nickname={summary.child.nickname}
                        avatarUrl={
                          summary.child.avatar_url
                            ? avatarUrlByPath.get(summary.child.avatar_url) ?? null
                            : null
                        }
                        size="sm"
                      />
                      <p className="font-bold text-slate-800 text-sm truncate">
                        {summary.child.nickname}
                      </p>
                    </div>
                    <Link
                      href={`/mypage/visits?child_id=${summary.child.id}`}
                      className="text-xs text-brand hover:underline"
                    >
                      記録を見る ›
                    </Link>
                  </div>
                  {summary.categories.length > 0 ? (
                    <div className="space-y-2">
                      {summary.categories.map(({ category, count }) => (
                        <CategoryBar
                          key={category}
                          category={category}
                          count={count}
                          max={summary.categories[0].count}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      まだ子ども別の記録がありません
                    </p>
                  )}
                </div>
              ))
            ) : (
              <>
                {childCategorySummaries.map((summary) => (
                  <span
                    key={summary.child.id}
                    id={`child-achievement-${summary.child.id}`}
                    className="block scroll-mt-4"
                  />
                ))}
                <p className="text-slate-400 text-sm">
                  子どもごとの記録をするとここに表示されます
                </p>
              </>
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
      <span className={`font-semibold text-sm ${primary ? "text-white" : "text-slate-800"}`}>
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

function AchievementMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg p-2 hover:bg-slate-50 transition-colors"
    >
      <p className="font-bold text-slate-900 group-hover:text-brand transition-colors">
        {value}
      </p>
      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-0.5">
        {label}
        <span className="text-slate-300 group-hover:text-brand transition-colors">›</span>
      </p>
    </Link>
  );
}

function MonthlyBarChart({ data }: { data: MonthData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const legendCategories = Array.from(
    data
      .flatMap((d) => d.categories)
      .reduce((counts, { category, count }) => {
        counts.set(category, (counts.get(category) ?? 0) + count);
        return counts;
      }, new Map<string, number>()),
  )
    .map(([category, count]) => ({ category, count }))
    .sort(compareCategoryEntries);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height: "64px" }}>
        {data.map(({ month, label, count, categories }) => {
          const barHeight = count > 0 ? Math.max(Math.round((count / max) * 44), 6) : 0;
          return (
            <div key={month} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              {count > 0 && (
                <span className="text-[10px] font-medium text-brand leading-none">{count}</span>
              )}
              {count > 0 && (
                <div
                  className="w-full overflow-hidden rounded-t"
                  style={{ height: `${barHeight}px` }}
                >
                  <div className="flex h-full flex-col-reverse">
                    {categories.map(({ category, count: categoryCount }) => (
                      <div
                        key={category}
                        className={categoryColor(category)}
                        style={{
                          height: `${Math.round((categoryCount / count) * barHeight)}px`,
                        }}
                        title={`${category} ${categoryCount}回`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <span className="text-[9px] text-slate-400 leading-none pt-0.5">{label}</span>
            </div>
          );
        })}
      </div>
      {legendCategories.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {legendCategories.map(({ category }) => (
            <div key={category} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${categoryColor(category)}`} />
              <span className="text-[11px] text-slate-600">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBar({
  category,
  count,
  max,
}: {
  category: string;
  count: number;
  max: number;
}) {
  const pct = Math.round((count / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-700">{category}</span>
        <span className="text-slate-500 font-medium tabular-nums">{count}回</span>
      </div>
      <div className="bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-brand/70 rounded-full h-1.5 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
