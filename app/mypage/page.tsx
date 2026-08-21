import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import CategoryBar from "@/components/CategoryBar";
import ChildAvatar from "@/components/ChildAvatar";
import MypageHero from "@/components/MypageHero";
import MonthlyBarChart, { type MonthData } from "@/components/MonthlyBarChart";
import MonthlyDiffCard from "@/components/MonthlyDiffCard";
import MyPlacesEventCard from "@/components/MyPlacesEventCard";
import VisitedPlacesMapClient from "@/components/VisitedPlacesMapClient";
import facilitiesJson from "@/data/facilities_data.json";
import {
  PASS_BADGE_CLASS,
  formatPassDateJa,
  passStatus,
} from "@/lib/annual-pass";
import { normalizeChildLikeCategory } from "@/lib/child-likes";
import {
  buildFrequentInterestTagsByChild,
  buildVisitCategoryCountsByChild,
  filterChildLikeVisits,
  type ChildInsightVisit,
  type FrequentInterestTag,
  type VisitCategoryCount,
} from "@/lib/child-insights";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { getMyPlacesEvents } from "@/lib/my-places-events";
import {
  buildChildStats,
  buildFamilyStats,
  recentMonthKeysJst,
  type ChildStats,
} from "@/lib/mypage-stats";
import { createClient } from "@/lib/supabase/server";
import {
  buildFamilyOutingMapData,
  buildVisitedPlacesMapData,
} from "@/lib/visited-places";
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
  created_at: string;
  family_revisit: string;
  parent_fatigue: string | null;
};

type ChildInsightSummary = {
  child: Child;
  anchorId: string;
  visitCount: number;
  stage: ChildStats["stage"];
  visitCategories: VisitCategoryCount[];
  frequentInterests: FrequentInterestTag[];
};

type AchievementStats = {
  wishlistCount: number;
  revisitCount: number;
};

type VisitPhotoThumbRow = {
  visit_id: string;
  thumb_path: string | null;
  sort_order: number | null;
};

type MemoryPhoto = {
  visitId: string;
  facilityName: string;
  thumbPath: string;
};

type WishlistSlugRow = {
  facility_slug: string | null;
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
    typeof value.created_at === "string" &&
    typeof value.family_revisit === "string"
  );
}

function isChildVisit(value: unknown): value is ChildInsightVisit {
  return (
    isRecord(value) &&
    typeof value.child_id === "string" &&
    typeof value.visit_id === "string" &&
    (typeof value.satisfaction === "string" || value.satisfaction === null) &&
    (Array.isArray(value.visit_child_tags) || value.visit_child_tags === null)
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

function categoryForSlug(slug: string): string {
  if (slug.startsWith("manual-")) return "その他";
  return slugToCategory.get(slug) ?? "その他";
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

function buildChildInsightSummaries(
  children: Child[],
  visits: VisitStat[],
  childVisits: ChildInsightVisit[],
): ChildInsightSummary[] {
  const eligibleChildVisits = filterChildLikeVisits(childVisits);
  const categoryByVisitId = new Map(
    visits.map((visit) => [
      visit.id,
      normalizeChildLikeCategory(categoryForSlug(visit.facility_slug)),
    ]),
  );
  const visitCategoriesByChild = buildVisitCategoryCountsByChild(
    childVisits,
    categoryByVisitId,
  );

  const statsByChild = new Map(
    buildChildStats(children.map((child) => child.id), eligibleChildVisits).map(
      (stats) => [stats.childId, stats],
    ),
  );
  const frequentInterestsByChild =
    buildFrequentInterestTagsByChild(eligibleChildVisits);

  return children.map((child, index) => {
    const stats = statsByChild.get(child.id) ?? {
      childId: child.id,
      visitCount: 0,
      stage: "none" as const,
    };
    return {
      child,
      anchorId: `child-likes-${index + 1}`,
      visitCount: stats.visitCount,
      stage: stats.stage,
      visitCategories: (visitCategoriesByChild.get(child.id) ?? []).sort(
        compareCategoryEntries,
      ),
      frequentInterests: frequentInterestsByChild.get(child.id) ?? [],
    };
  });
}

function FrequentInterests({
  childNickname,
  interests,
}: {
  childNickname: string;
  interests: FrequentInterestTag[];
}) {
  if (interests.length === 0) return null;

  return (
    <div
      className="space-y-2 border-t border-slate-100 pt-3"
      aria-label={`${childNickname}がよく楽しんだこと`}
    >
      <p className="text-xs font-bold text-slate-600">よく楽しんだこと</p>
      <ul className="flex flex-wrap gap-2">
        {interests.map((interest) => (
          <li
            key={interest.id}
            className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 ring-1 ring-sky-100"
          >
            {interest.label} <span className="font-bold">{interest.count}回</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChildPreferenceContent({ summary }: { summary: ChildInsightSummary }) {
  if (summary.stage === "none") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-400">
          まだ{summary.child.nickname}の「好き」のヒントになる反応記録がありません
        </p>
        <Link
          href="/mypage/visits/new"
          className="inline-flex rounded text-xs font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          おでかけを記録する →
        </Link>
      </div>
    );
  }

  if (summary.stage === "pre_sprout") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">
          {summary.child.nickname}の反応記録が{summary.visitCount}件たまりました
        </p>
        <p className="text-sm leading-relaxed text-emerald-700">
          あと{3 - summary.visitCount}件で{summary.child.nickname}の「好き」のヒントが見えはじめます
        </p>
      </div>
    );
  }

  if (summary.stage === "sprout") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-emerald-50 px-3 py-2.5">
          <p className="text-xs font-bold tracking-wide text-emerald-700">🌱 好きの芽</p>
          <p className="mt-1 text-xs text-emerald-700">
            {summary.visitCount}件の反応記録から見えてきたヒントです
          </p>
        </div>
        <FrequentInterests
          childNickname={summary.child.nickname}
          interests={summary.frequentInterests}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-amber-50 px-3 py-2.5">
        <p className="text-xs font-bold tracking-wide text-amber-700">✨ 好きの傾向</p>
        <p className="mt-1 text-sm font-medium text-amber-950">
          {summary.visitCount}件の反応記録から見えてきたヒントです
        </p>
      </div>
      <FrequentInterests
        childNickname={summary.child.nickname}
        interests={summary.frequentInterests}
      />
    </div>
  );
}

function VisitCategoryTendency({ summary }: { summary: ChildInsightSummary }) {
  if (summary.visitCategories.length === 0) return null;

  return (
    <div
      className="space-y-2 border-t border-slate-100 pt-3"
      aria-label={`${summary.child.nickname}がよく行った場所の傾向`}
    >
      <div>
        <p className="text-xs font-bold text-slate-600">よく行った場所の傾向</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
          一緒に行ったすべてのおでかけを、施設カテゴリ別に数えています
        </p>
      </div>
      <div className="space-y-2">
        {summary.visitCategories.map(({ category, count }) => (
          <CategoryBar
            key={category}
            category={category}
            count={count}
            max={summary.visitCategories[0]?.count ?? 1}
          />
        ))}
      </div>
    </div>
  );
}

function ChildInsightsContent({ summary }: { summary: ChildInsightSummary }) {
  return (
    <div className="space-y-3">
      <ChildPreferenceContent summary={summary} />
      <VisitCategoryTendency summary={summary} />
    </div>
  );
}

function buildMonthlyData(visits: VisitStat[], now: Date): MonthData[] {
  // 6ヶ月推移は「いつ行ったか」の可視化なのでvisited_on、ヒーローの今月だけcreated_atで集計する。
  const visitsByMonth = new Map<string, Map<string, number>>();
  for (const visit of visits) {
    if (!visit.visited_on) continue;
    const month = visit.visited_on.slice(0, 7);
    const category = categoryForSlug(visit.facility_slug);
    const categoryCounts = visitsByMonth.get(month) ?? new Map<string, number>();
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    visitsByMonth.set(month, categoryCounts);
  }

  return recentMonthKeysJst(now, 6).map((month) => {
    const categories = Array.from(
      (visitsByMonth.get(month) ?? new Map<string, number>()).entries(),
    )
      .map(([category, count]) => ({ category, count }))
      .sort(compareCategoryEntries);
    return {
      month,
      label: `${Number(month.slice(5, 7))}月`,
      count: categories.reduce((total, category) => total + category.count, 0),
      categories,
    };
  });
}

function formatVisitedOn(visitedOn: string | null): string {
  if (!visitedOn) return "日付未設定";
  return visitedOn.replaceAll("-", "/");
}

function formatMonthDay(date: string | null): string {
  if (!date) return "";
  const [, month, day] = date.split("-");
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(dayNumber)) return "";
  return `${monthNumber}/${dayNumber}`;
}

const revisitLabels: Record<string, string> = {
  yes: "✅ また行きたい",
  conditional: "🔄 条件次第",
  once_enough: "👍 一度で十分",
  no: "🙅 もう行かない",
};

type AnnualPassRow = {
  id: string;
  facility_slug: string;
  facility_name: string;
  expires_on: string;
};

function isAnnualPassRow(row: unknown): row is AnnualPassRow {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.facility_slug === "string" &&
    typeof r.facility_name === "string" &&
    typeof r.expires_on === "string"
  );
}

function familyMapBadgeText(visitedCount: number, wishlistCount: number): string {
  return [
    visitedCount > 0 ? `🐾 行った${visitedCount}か所` : null,
    wishlistCount > 0 ? `♥ 行きたい${wishlistCount}か所` : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: children }, { data: visitStats }, { data: wishlistRows }] =
    await Promise.all([
    supabase
      .from("children")
      .select("id, nickname, birth_year, birth_month, avatar_url")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    user
      ? supabase
          .from("visits")
          .select(
            "id, facility_slug, facility_name, visited_on, created_at, family_revisit, parent_fatigue",
          )
          .eq("user_id", user.id)
          .eq("status", "published")
          .order("visited_on", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("wishlists")
          .select("facility_slug")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const { data: annualPassRows } = user
    ? await supabase
        .from("annual_passes")
        .select("id, facility_slug, facility_name, expires_on")
        .eq("user_id", user.id)
        .order("expires_on", { ascending: true })
    : { data: [] };
  const annualPasses = (annualPassRows ?? []).filter(isAnnualPassRow);

  const childRows = (children ?? []).filter(isRecord).filter((child): child is Child => {
    return (
      typeof child.id === "string" &&
      typeof child.nickname === "string" &&
      typeof child.birth_year === "number" &&
      typeof child.birth_month === "number" &&
      (typeof child.avatar_url === "string" || child.avatar_url === null)
    );
  });
  const visits = (visitStats ?? []).filter(isVisitStat);
  if (user && childRows.length === 0 && visits.length === 0) {
    redirect("/mypage/onboarding");
  }

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
  const wishlistSlugRows = (wishlistRows ?? []) as WishlistSlugRow[];
  const wishlistSlugs = wishlistSlugRows
    .map((row) => row.facility_slug)
    .filter((slug): slug is string => Boolean(slug));
  const visitedSlugs = visits.map((visit) => visit.facility_slug);
  const myPlacesEvents = getMyPlacesEvents({ visitedSlugs, wishlistSlugs });
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
          .select(
            "child_id, visit_id, satisfaction, visit_child_tags(tag_id, reaction_tags(id, label, tag_type, sort_order))",
          )
          .in("visit_id", visitIds)
      : { data: [] };
  const childVisits = (childVisitStats ?? []).filter(isChildVisit);
  const visitPhotoThumbRows = (visitPhotoRows ?? []).filter(isVisitPhotoThumbRow);
  const visitById = new Map(visits.map((visit) => [visit.id, visit]));
  const visitOrderById = new Map(candidateVisitIds.map((id, index) => [id, index]));
  const firstThumbPathByVisit = new Map<string, string>();
  for (const photo of visitPhotoThumbRows) {
    if (!photo.thumb_path || firstThumbPathByVisit.has(photo.visit_id)) continue;
    firstThumbPathByVisit.set(photo.visit_id, photo.thumb_path);
  }
  const memoryPhotos: MemoryPhoto[] = PHOTO_UPLOAD_ENABLED
    ? visitPhotoThumbRows
        .filter((photo): photo is VisitPhotoThumbRow & { thumb_path: string } =>
          Boolean(photo.thumb_path),
        )
        .sort((a, b) => {
          const byVisitOrder =
            (visitOrderById.get(a.visit_id) ?? Number.MAX_SAFE_INTEGER) -
            (visitOrderById.get(b.visit_id) ?? Number.MAX_SAFE_INTEGER);
          return byVisitOrder || (a.sort_order ?? 0) - (b.sort_order ?? 0);
        })
        .slice(0, 8)
        .flatMap((photo) => {
          const visit = visitById.get(photo.visit_id);
          if (!visit) return [];
          return [
            {
              visitId: photo.visit_id,
              facilityName: visit.facility_name,
              thumbPath: photo.thumb_path,
            },
          ];
        })
    : [];
  const recentVisits = visits.slice(0, 5);
  const recentRecordThumbs = PHOTO_UPLOAD_ENABLED
    ? recentVisits
        .map((visit) => ({
          visitId: visit.id,
          thumbPath: firstThumbPathByVisit.get(visit.id),
        }))
        .filter((thumb): thumb is { visitId: string; thumbPath: string } =>
          Boolean(thumb.thumbPath),
        )
    : [];
  const photoPathsToSign = Array.from(
    new Set([
      ...recentRecordThumbs.map((record) => record.thumbPath),
      ...memoryPhotos.map((photo) => photo.thumbPath),
    ]),
  );
  const { data: signedPhotoUrls } =
    photoPathsToSign.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(photoPathsToSign, 60 * 60)
      : { data: [] };
  const signedPhotoUrlByPath = new Map(
    (signedPhotoUrls ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const recentRecordThumbUrlByVisitId = new Map(
    recentRecordThumbs.map((record) => [
      record.visitId,
      signedPhotoUrlByPath.get(record.thumbPath) ?? null,
    ]),
  );
  const memoryPhotosWithUrls = memoryPhotos
    .map((photo) => ({
      ...photo,
      thumbUrl: signedPhotoUrlByPath.get(photo.thumbPath) ?? null,
    }))
    .filter((photo): photo is MemoryPhoto & { thumbUrl: string } =>
      Boolean(photo.thumbUrl),
    );

  const hasChildren = childRows.length > 0;
  const now = new Date();
  const familyStats = buildFamilyStats(visits, now);
  const achievementStats: AchievementStats = {
    wishlistCount: wishlistSlugRows.length,
    revisitCount: visits.filter((v) => v.family_revisit === "yes").length,
  };
  const hasAchievementRecords =
    familyStats.totalVisitCount > 0 ||
    achievementStats.wishlistCount > 0;

  const monthlyData = buildMonthlyData(visits, now);
  const hasMonthlyData = monthlyData.some((d) => d.count > 0);
  const visitedMapFacilities = buildVisitedPlacesMapData(visits);
  const familyMapPlaces = buildFamilyOutingMapData(visits, wishlistSlugs);
  const familyMapVisitedCount = familyMapPlaces.filter(
    (place) => place.kind === "visited" || place.kind === "both",
  ).length;
  const familyMapWishlistCount = familyMapPlaces.filter(
    (place) => place.kind === "wishlist" || place.kind === "both",
  ).length;
  const familyMapBadge = familyMapBadgeText(
    familyMapVisitedCount,
    familyMapWishlistCount,
  );
  const recentFootprintFacilities = visitedMapFacilities
    .filter((facility) => facility.lastVisited)
    .slice(0, 2);
  const classicSpot =
    visitedMapFacilities
      .filter((facility) => facility.visitCount >= 2)
      .sort(
        (a, b) =>
          b.visitCount - a.visitCount ||
          (b.lastVisited ?? "").localeCompare(a.lastVisited ?? "") ||
          a.name.localeCompare(b.name, "ja"),
      )[0] ?? null;
  const firstTimeSpot =
    visitedMapFacilities.find(
      (facility) => facility.visitCount === 1 && facility.lastVisited,
    ) ?? null;

  const heroChildren = childRows.map((child, index) => ({
    id: child.id,
    anchorId: `child-likes-${index + 1}`,
    nickname: child.nickname,
    age: calcAge(child.birth_year, child.birth_month),
    avatarUrl: child.avatar_url ? avatarUrlByPath.get(child.avatar_url) ?? null : null,
  }));
  const isEmptyWithChildren = familyStats.totalVisitCount === 0 && hasChildren;
  const childInsightSummaries = buildChildInsightSummaries(
    childRows,
    visits,
    childVisits,
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-6 lg:space-y-0 lg:py-6">
      <div data-mypage-section="hero" className="lg:col-span-2 lg:order-1">
        <MypageHero kids={heroChildren} stats={familyStats} />
      </div>

      <div data-mypage-section="monthly-diff" className="lg:col-span-2 lg:order-2">
        <MonthlyDiffCard stats={familyStats} />
      </div>

      <section data-mypage-section="quick-actions" className="lg:col-span-2 lg:order-3">
        <h2 className="sr-only">クイックアクション</h2>
        <div className="grid grid-cols-4 gap-2">
          <ActionCard href="/mypage/visits/new" icon="✏️" label="記録する" primary />
          <ActionCard href="/mypage/visits" icon="📖" label="振り返る" />
          <ActionCard href="/mypage/wishlist" icon="⭐" label="行きたい" />
          <ActionCard href="/mypage/visits/from-photo" icon="📷" label="写真から" />
        </div>
        <Link href="/facilities" className="mt-2 inline-flex text-xs text-slate-500 transition-colors hover:text-brand hover:underline">
          🔍 遊び場を探す
        </Link>
      </section>

      {familyStats.totalVisitCount > 0 && familyStats.totalVisitCount < 3 && (
        <div data-mypage-section="backfill-nudge" className="rounded-xl bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4 ring-1 ring-amber-100 lg:col-span-2 lg:order-3">
          <p className="text-sm font-semibold text-slate-900">
            過去のおでかけも、写真からまとめて入れられます
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            記録が増えるほど、おでかけマップと子どもの「好き」の記録が育ちます。去年の思い出も写真を選ぶだけで追加できます。
          </p>
          <Link
            href="/mypage/visits/from-photo"
            className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            📷 写真から過去の記録を追加 →
          </Link>
        </div>
      )}

      {annualPasses.length > 0 && (
        <div data-mypage-section="annual-passes" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 lg:col-span-2 lg:order-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-amber-900">🎫 年パス</p>
            <Link href="/mypage/passes" className="text-xs font-bold text-amber-700 hover:underline">
              すべて見る →
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5">
            {annualPasses.slice(0, 3).map((pass) => {
              const status = passStatus(pass.expires_on);
              return (
                <li key={pass.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link
                    href={`/facilities/${pass.facility_slug}`}
                    className="min-w-0 truncate font-medium text-slate-800 hover:text-brand hover:underline"
                  >
                    {pass.facility_name}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatPassDateJa(pass.expires_on)}まで
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${PASS_BADGE_CLASS[status.tone]}`}>
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {annualPasses.some((pass) => passStatus(pass.expires_on).tone !== "ok") && (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              期限が近い・切れた年パスがあります。行くなら今のうち！
            </p>
          )}
        </div>
      )}

      {!hasChildren && (
        <div data-mypage-section="child-profile-prompt" className="rounded-xl border border-sky-200 bg-sky-50 p-4 lg:col-span-2 lg:order-4">
          <p className="text-sm font-semibold text-sky-900">子どもプロフィールを登録すると便利です</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-700">ニックネームと生年月を登録することで、おでかけ記録に「当時の年齢」が自動でつきます。本名・学校名は不要です。登録しなくてもおでかけ記録は使えます。</p>
          <div className="mt-3 flex items-center gap-3">
            <Link href="/mypage/children" className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">登録する →</Link>
            <Link href="/mypage/visits/new" className="text-xs text-sky-600 hover:underline">あとで登録する</Link>
          </div>
        </div>
      )}

      {recentVisits.length > 0 && (
        <Link
          href="/mypage/memories"
          data-mypage-section="memory-stories-banner"
          className="group flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-violet-950 to-rose-950 px-4 py-3 text-white shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 lg:col-span-2 lg:order-4"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.16em] text-white/60">
              FAMILY MEMORIES
            </p>
            <p className="truncate text-sm font-black sm:text-base">
              写真で思い出を振り返る
            </p>
          </div>
          <span
            className="ml-3 shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-base transition-transform group-hover:-translate-y-0.5"
            aria-hidden="true"
          >
            ↑
          </span>
        </Link>
      )}

      <div data-mypage-section="recent-memories" className="lg:col-start-1 lg:order-5">
        {!isEmptyWithChildren && recentVisits.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">最近の思い出</h2>
              <Link href="/mypage/visits" className="text-sm text-brand hover:underline">すべて見る →</Link>
            </div>
            <div className="space-y-2">
              {recentVisits.map((visit) => {
                const thumbUrl = recentRecordThumbUrlByVisitId.get(visit.id) ?? null;
                const revisitLabel = revisitLabels[visit.family_revisit] ?? "";
                return (
                  <Link key={visit.id} href={`/mypage/visits/${visit.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sky-50 ring-1 ring-slate-200">
                      {thumbUrl ? <Image src={thumbUrl} alt={`${visit.facility_name}の写真`} fill sizes="56px" className="object-cover" unoptimized /> : <span className="flex h-full w-full items-center justify-center text-2xl" aria-hidden="true">🗺️</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">{visit.facility_name}</p>
                        {revisitLabel && <span className="shrink-0 text-right text-[11px] leading-tight text-slate-500">{revisitLabel}</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{formatVisitedOn(visit.visited_on)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <section data-mypage-section="family-map" className="space-y-3 lg:col-start-2 lg:order-6">
        <h2 className="font-bold text-slate-800">家族のおでかけマップ{familyMapBadge && <span className="ml-2 text-sm font-normal text-slate-400">{familyMapBadge}</span>}</h2>
        <VisitedPlacesMapClient places={familyMapPlaces} height={{ mobile: 200, desktop: 340 }} showDetailLink />
        {recentFootprintFacilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>最近増えた足あと:</span>
            {recentFootprintFacilities.map((facility) => (
              <Link key={facility.slug} href={`/mypage/visits/facility/${facility.slug}`} className="inline-flex max-w-full items-center rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 font-medium text-sky-700 hover:bg-sky-100">
                🆕 {facility.name} {formatMonthDay(facility.lastVisited)}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div data-mypage-section="footprints" className="lg:col-start-1 lg:order-7">
        {!isEmptyWithChildren && (
          <section className="space-y-3">
            <h2 className="font-bold text-slate-800">家族のあしあと帳</h2>
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              {hasAchievementRecords ? (
                <>
                  <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                    {achievementStats.wishlistCount > 0 && <Link href="/mypage/wishlist" className="block rounded-lg px-1 py-0.5 hover:bg-slate-50 hover:text-brand">⭐ また行きたい場所が <span className="font-bold text-brand">{achievementStats.wishlistCount}件</span> あります</Link>}
                    {achievementStats.revisitCount > 0 && <Link href="/mypage/visits?revisit=yes" className="block rounded-lg px-1 py-0.5 hover:bg-slate-50 hover:text-brand">✅ また行きたい と評価したおでかけが <span className="font-bold text-brand">{achievementStats.revisitCount}件</span></Link>}
                    {classicSpot && <Link href={`/mypage/visits/facility/${classicSpot.slug}`} className="block rounded-lg px-1 py-0.5 hover:bg-slate-50 hover:text-brand">🏅 定番スポット: {classicSpot.name}<span className="font-bold text-brand">({classicSpot.visitCount}回)</span></Link>}
                    {firstTimeSpot && <Link href={`/mypage/visits/facility/${firstTimeSpot.slug}`} className="block rounded-lg px-1 py-0.5 hover:bg-slate-50 hover:text-brand">🌱 最近の初めて: {firstTimeSpot.name}<span className="font-bold text-brand">({formatMonthDay(firstTimeSpot.lastVisited)})</span></Link>}
                  </div>
                  {hasMonthlyData && <div><p className="mb-2 text-xs text-slate-400">最近6ヶ月のおでかけ</p><MonthlyBarChart data={monthlyData} /></div>}
                </>
              ) : <p className="text-sm text-slate-400">記録すると、ここに家族のあしあとがたまっていきます</p>}
            </div>
          </section>
        )}
      </div>

      <div data-mypage-section="children-likes" className="lg:col-start-2 lg:order-7">
        {hasChildren && (
          <section className="space-y-3">
            <div>
              <h2 className="font-bold text-slate-800">子どもたちの「好き」</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                「大満足」か「楽しんだ」で、興味タグも選んだおでかけを「好き」のヒントとして数えています。「普通」「合わなかった」や、興味タグのない記録は含みません。
              </p>
            </div>
            <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4">
              {childInsightSummaries.map((summary, childIndex) => (
                <div
                  key={summary.child.id}
                  id={summary.anchorId}
                  className="scroll-mt-20 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
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
                      <p className="truncate text-sm font-bold text-slate-800">
                        {summary.child.nickname}
                      </p>
                    </div>
                    <Link
                      href={`/mypage/visits?child=${childIndex + 1}`}
                      className="rounded px-1 py-0.5 text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    >
                      記録を見る ›
                    </Link>
                  </div>
                  <ChildInsightsContent summary={summary} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div data-mypage-section="events" className="lg:col-span-2 lg:order-8">
        {myPlacesEvents.length > 0 && (
          <section className="space-y-3">
            <div><h2 className="font-bold text-slate-800">行きたい・行った場所のイベント</h2><p className="mt-1 text-xs text-slate-400">行きたいリストと家族の足あとから見つけました</p></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{myPlacesEvents.map((item) => <MyPlacesEventCard key={item.event.id} item={item} />)}</div>
          </section>
        )}
      </div>

      <div data-mypage-section="memory-photos" className="lg:col-span-2 lg:order-9">
        {memoryPhotosWithUrls.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-800">📷 思い出の写真</h2><Link href="/mypage/visits" className="text-sm text-brand hover:underline">すべて見る →</Link></div>
            <div className="-mx-4 overflow-x-auto px-4 pb-1"><div className="flex w-max gap-2.5">{memoryPhotosWithUrls.map((photo) => (
              <Link key={`${photo.visitId}-${photo.thumbPath}`} href={`/mypage/visits/${photo.visitId}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sky-50 ring-1 ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:h-24 sm:w-24"><Image src={photo.thumbUrl} alt={`${photo.facilityName}の写真`} fill sizes="(min-width: 640px) 96px, 80px" className="object-cover" unoptimized /></Link>
            ))}</div></div>
          </section>
        )}
      </div>

      <div data-mypage-section="account" className="pt-2 lg:col-span-2 lg:order-10"><LogoutButton /></div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-colors sm:p-3 ${
        primary
          ? "bg-brand text-white hover:bg-brand-dark"
          : "bg-white border border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl sm:text-2xl">{icon}</span>
      <span className={`text-xs font-semibold sm:text-sm ${primary ? "text-white" : "text-slate-800"}`}>
        {label}
      </span>
    </Link>
  );
}
