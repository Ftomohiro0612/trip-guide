import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import CategoryBar from "@/components/CategoryBar";
import ChildAvatar from "@/components/ChildAvatar";
import MypageHero from "@/components/MypageHero";
import MonthlyBarChart, { type MonthData } from "@/components/MonthlyBarChart";
import MonthlyDiffCard from "@/components/MonthlyDiffCard";
import MypageRecommendationSection from "@/components/MypageRecommendationSection";
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
import { buildMypageRecommendations } from "@/lib/mypage-recommendations";
import {
  buildChildStats,
  buildFamilyStats,
  recentMonthKeysJst,
  type ChildStats,
} from "@/lib/mypage-stats";
import { createClient } from "@/lib/supabase/server";
import { isMissingVisitCoordinateColumnError } from "@/lib/visit-place-coordinates";
import {
  buildFamilyOutingMapData,
  buildVisitedPlacesMapData,
} from "@/lib/visited-places";
import { prefectures } from "@/lib/facilities";
import type { PrefectureId } from "@/types/facility";
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
  place_latitude?: number | null;
  place_longitude?: number | null;
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

type RecommendationSettingsRow = {
  prefecture_ids: unknown;
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
            className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-brand/15"
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
        <p className="text-sm leading-relaxed text-slate-600">
          あと{3 - summary.visitCount}件で{summary.child.nickname}の「好き」のヒントが見えはじめます
        </p>
      </div>
    );
  }

  if (summary.stage === "sprout") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-success/10 px-3 py-2.5 ring-1 ring-success/15">
          <p className="text-xs font-bold tracking-wide text-slate-700">🌱 好きの芽</p>
          <p className="mt-1 text-xs text-slate-600">
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
      <div className="rounded-xl bg-accent/10 px-3 py-2.5 ring-1 ring-accent/15">
        <p className="text-xs font-bold tracking-wide text-slate-700">✨ 好きの傾向</p>
        <p className="mt-1 text-sm font-medium text-slate-800">
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

function formatMonthDay(date: string | null): string {
  if (!date) return "";
  const [, month, day] = date.split("-");
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!Number.isFinite(monthNumber) || !Number.isFinite(dayNumber)) return "";
  return `${monthNumber}/${dayNumber}`;
}

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

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadPublishedVisitStats(
  supabase: ServerSupabaseClient,
  userId: string,
) {
  const withCoordinates = await supabase
    .from("visits")
    .select(
      "id, facility_slug, facility_name, visited_on, created_at, family_revisit, parent_fatigue, place_latitude, place_longitude",
    )
    .eq("user_id", userId)
    .eq("status", "published")
    .order("visited_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!isMissingVisitCoordinateColumnError(withCoordinates.error)) {
    return withCoordinates;
  }

  return supabase
    .from("visits")
    .select(
      "id, facility_slug, facility_name, visited_on, created_at, family_revisit, parent_fatigue",
    )
    .eq("user_id", userId)
    .eq("status", "published")
    .order("visited_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
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
      ? loadPublishedVisitStats(supabase, user.id)
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
  const recommendationSettingsResult = user
    ? await supabase
        .from("mypage_recommendation_settings")
        .select("prefecture_ids")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  const recommendationSettingsAvailable =
    Boolean(user) && recommendationSettingsResult.error === null;
  const knownPrefectureIds = new Set<string>(
    prefectures.map((prefecture) => prefecture.id),
  );
  const recommendationSettings = recommendationSettingsResult.data as
    | RecommendationSettingsRow
    | null;
  const selectedPrefectureIds = Array.isArray(
    recommendationSettings?.prefecture_ids,
  )
    ? recommendationSettings.prefecture_ids.filter(
        (id): id is PrefectureId =>
          typeof id === "string" && knownPrefectureIds.has(id),
      )
    : [];

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
  const photoPathsToSign = Array.from(
    new Set(memoryPhotos.map((photo) => photo.thumbPath)),
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
  const recommendations = buildMypageRecommendations({
    children: childInsightSummaries.map((summary) => ({
      id: summary.child.id,
      nickname: summary.child.nickname,
      birthYear: summary.child.birth_year,
      birthMonth: summary.child.birth_month,
      interests: summary.frequentInterests,
    })),
    selectedPrefectureIds,
    visitedSlugs,
  });
  const selectedPrefectureNames = selectedPrefectureIds.flatMap((id) => {
    const prefecture = prefectures.find((item) => item.id === id);
    return prefecture ? [prefecture.name] : [];
  });

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-5 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-8 lg:space-y-0 lg:py-8">
      <div data-mypage-section="hero" className="lg:col-span-2 lg:order-1">
        <MypageHero kids={heroChildren} stats={familyStats} />
      </div>

      <div
        data-mypage-section="memory-photos"
        className={
          visits.length > 0
            ? "overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-violet-950 to-rose-950 p-4 text-white shadow-xl ring-1 ring-white/10 sm:p-5 lg:col-span-2 lg:order-2"
            : "hidden"
        }
      >
        {visits.length > 0 && (
          <>
            <Link
              href="/mypage/memories"
              data-mypage-section="memory-stories-banner"
              className="group flex min-h-16 items-center justify-between rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[0.18em] text-white/60">
                  FAMILY MEMORIES
                </p>
                <h2 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
                  写真で思い出を振り返る
                </h2>
              </div>
              <span
                className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg transition-transform group-hover:-translate-y-1"
                aria-hidden="true"
              >
                ↑
              </span>
            </Link>

            {memoryPhotosWithUrls.length > 0 && (
              <section className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-white/80">思い出の写真</h2>
                  <Link
                    href="/mypage/visits"
                    className="rounded text-xs font-bold text-white/70 hover:text-white hover:underline"
                  >
                    すべて見る →
                  </Link>
                </div>
                <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5">
                  <div className="flex w-max gap-3">
                    {memoryPhotosWithUrls.map((photo) => (
                      <Link
                        key={`${photo.visitId}-${photo.thumbPath}`}
                        href={`/mypage/visits/${photo.visitId}`}
                        className="relative h-26 w-26 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-30 sm:w-30"
                      >
                        <Image
                          src={photo.thumbUrl}
                          alt={`${photo.facilityName}の写真`}
                          fill
                          sizes="(min-width: 640px) 120px, 104px"
                          className="object-cover"
                          unoptimized
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {recommendationSettingsAvailable && (
        <div
          data-mypage-section="recommendations"
          className="lg:col-span-2 lg:order-4"
        >
          <MypageRecommendationSection
            prefectureNames={selectedPrefectureNames}
            recommendations={recommendations}
          />
        </div>
      )}

      <section data-mypage-section="quick-actions" className="rounded-[1.75rem] bg-gradient-to-br from-white via-white to-brand/10 p-4 shadow-sm ring-1 ring-brand/15 sm:p-5 lg:col-span-2 lg:order-4">
        <h2 className="sr-only">クイックアクション</h2>
        <div className="grid grid-cols-4 gap-2">
          <ActionCard href="/mypage/visits/new" icon="✏️" label="記録する" primary />
          <ActionCard href="/mypage/visits" icon="📖" label="振り返る" />
          <ActionCard href="/mypage/wishlist" icon="⭐" label="行きたい" />
          <ActionCard href="/mypage/visits/from-photo" icon="📷" label="写真から" />
        </div>
        <Link href="/facilities" className="mt-2.5 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors hover:text-brand hover:underline">
          🔍 遊び場を探す
        </Link>
      </section>

      {familyStats.totalVisitCount > 0 && familyStats.totalVisitCount < 3 && (
        <div data-mypage-section="backfill-nudge" className="rounded-[1.75rem] bg-gradient-to-br from-accent/15 via-white to-brand/10 p-5 shadow-sm ring-1 ring-accent/20 sm:p-6 lg:col-span-2 lg:order-4">
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand">ADD MEMORIES</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950">過去のおでかけも、写真からまとめて入れられます</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">記録が増えるほど、おでかけマップと子どもの「好き」の記録が育ちます。去年の思い出も写真を選ぶだけで追加できます。</p>
          <Link href="/mypage/visits/from-photo" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-dark">
            📷 写真から過去の記録を追加 →
          </Link>
        </div>
      )}

      <section
        data-mypage-section="family-map"
        className="space-y-4 rounded-[1.75rem] bg-gradient-to-br from-white via-white to-success/10 p-4 shadow-sm ring-1 ring-success/20 sm:p-5 lg:col-span-2 lg:order-5"
      >
        <MypageSectionHeading
          eyebrow="FAMILY MAP"
          title="家族のおでかけマップ"
          description={familyMapBadge || undefined}
        />
        <VisitedPlacesMapClient places={familyMapPlaces} height={{ mobile: 220, desktop: 340 }} showDetailLink />
        {recentFootprintFacilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>最近増えた足あと:</span>
            {recentFootprintFacilities.map((facility) => (
              <Link key={facility.slug} href={`/mypage/visits/facility/${facility.slug}`} className="inline-flex min-h-9 max-w-full items-center rounded-full bg-brand/10 px-3 py-1 font-medium text-slate-700 ring-1 ring-brand/15 hover:bg-brand/15">
                🆕 {facility.name} {formatMonthDay(facility.lastVisited)}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div data-mypage-section="children-likes" className="lg:col-start-1 lg:order-5">
        {hasChildren && (
          <section className="space-y-4">
            <MypageSectionHeading
              eyebrow="THEIR FAVORITES"
              title="子どもたちの「好き」"
              description="「大満足」か「楽しんだ」で、興味タグも選んだおでかけを「好き」のヒントとして数えています。「普通」「合わなかった」や、興味タグのない記録は含みません。"
            />
            <div className="space-y-5 rounded-[1.75rem] bg-gradient-to-br from-white via-white to-brand/10 p-5 shadow-sm ring-1 ring-brand/15 sm:p-6">
              {childInsightSummaries.map((summary, childIndex) => (
                <div key={summary.child.id} id={summary.anchorId} className="scroll-mt-20 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <ChildAvatar
                        childId={summary.child.id}
                        nickname={summary.child.nickname}
                        avatarUrl={summary.child.avatar_url ? avatarUrlByPath.get(summary.child.avatar_url) ?? null : null}
                        size="sm"
                      />
                      <p className="truncate text-sm font-bold text-slate-900">{summary.child.nickname}</p>
                    </div>
                    <Link href={`/mypage/visits?child=${childIndex + 1}`} className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2 text-xs font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
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

      <div
        data-mypage-section="footprints"
        className={hasChildren ? "lg:col-start-2 lg:order-5" : "lg:col-span-2 lg:order-5"}
      >
        {!isEmptyWithChildren && (
          <section className="space-y-4">
            <MypageSectionHeading eyebrow="FAMILY FOOTPRINTS" title="家族のあしあと帳" />
            <div className="space-y-5 rounded-[1.75rem] bg-gradient-to-br from-white via-white to-accent/10 p-5 shadow-sm ring-1 ring-accent/20 sm:p-6">
              {hasAchievementRecords ? (
                <>
                  <div className="space-y-2 text-sm leading-relaxed text-slate-700">
                    {achievementStats.wishlistCount > 0 && <Link href="/mypage/wishlist" className="block rounded-lg px-2 py-1.5 hover:bg-brand/5 hover:text-brand">⭐ また行きたい場所が <span className="font-bold text-brand">{achievementStats.wishlistCount}件</span> あります</Link>}
                    {achievementStats.revisitCount > 0 && <Link href="/mypage/visits?revisit=yes" className="block rounded-lg px-2 py-1.5 hover:bg-brand/5 hover:text-brand">✅ また行きたい と評価したおでかけが <span className="font-bold text-brand">{achievementStats.revisitCount}件</span></Link>}
                    {classicSpot && <Link href={`/mypage/visits/facility/${classicSpot.slug}`} className="block rounded-lg px-2 py-1.5 hover:bg-brand/5 hover:text-brand">🏅 定番スポット: {classicSpot.name}<span className="font-bold text-brand">({classicSpot.visitCount}回)</span></Link>}
                    {firstTimeSpot && <Link href={`/mypage/visits/facility/${firstTimeSpot.slug}`} className="block rounded-lg px-2 py-1.5 hover:bg-brand/5 hover:text-brand">🌱 最近の初めて: {firstTimeSpot.name}<span className="font-bold text-brand">({formatMonthDay(firstTimeSpot.lastVisited)})</span></Link>}
                  </div>
                  {hasMonthlyData && <div className="border-t border-slate-100 pt-4"><p className="mb-3 text-xs font-bold tracking-wide text-slate-500">最近6ヶ月のおでかけ</p><MonthlyBarChart data={monthlyData} /></div>}
                </>
              ) : <p className="text-sm text-slate-500">記録すると、ここに家族のあしあとがたまっていきます</p>}
            </div>
          </section>
        )}
      </div>

      <div data-mypage-section="monthly-diff" className="lg:col-span-2 lg:order-6">
        <MonthlyDiffCard stats={familyStats} />
      </div>

      {annualPasses.length > 0 && (
        <section data-mypage-section="annual-passes" className="rounded-[1.75rem] bg-gradient-to-br from-accent/15 via-white to-brand/10 p-5 shadow-sm ring-1 ring-accent/20 sm:p-6 lg:col-span-2 lg:order-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-brand">FAMILY PASSES</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">🎫 年パス</h2>
            </div>
            <Link href="/mypage/passes" className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-bold text-slate-700 hover:text-brand hover:underline">すべて見る →</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {annualPasses.slice(0, 3).map((pass) => {
              const status = passStatus(pass.expires_on);
              return (
                <li key={pass.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link href={`/facilities/${pass.facility_slug}`} className="min-w-0 flex-1 truncate font-medium text-slate-800 hover:text-brand hover:underline">{pass.facility_name}</Link>
                  <span className="shrink-0 text-xs text-slate-500">{formatPassDateJa(pass.expires_on)}まで</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${PASS_BADGE_CLASS[status.tone]}`}>{status.label}</span>
                </li>
              );
            })}
          </ul>
          {annualPasses.some((pass) => passStatus(pass.expires_on).tone !== "ok") && <p className="mt-3 text-xs font-semibold text-slate-700">期限が近い・切れた年パスがあります。行くなら今のうち！</p>}
        </section>
      )}

      {!hasChildren && (
        <div data-mypage-section="child-profile-prompt" className="rounded-[1.75rem] bg-gradient-to-br from-brand/15 via-white to-accent/10 p-5 shadow-sm ring-1 ring-brand/20 sm:p-6 lg:col-span-2 lg:order-6">
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand">OUR FAMILY</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950">子どもプロフィールを登録すると便利です</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">ニックネームと生年月を登録することで、おでかけ記録に「当時の年齢」が自動でつきます。本名・学校名は不要です。登録しなくてもおでかけ記録は使えます。</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href="/mypage/children" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">登録する →</Link>
            <Link href="/mypage/visits/new" className="inline-flex min-h-11 items-center text-xs font-medium text-slate-600 hover:text-brand hover:underline">あとで登録する</Link>
          </div>
        </div>
      )}

      <div data-mypage-section="events" className="lg:col-span-2 lg:order-7">
        {myPlacesEvents.length > 0 && (
          <section className="space-y-4">
            <MypageSectionHeading eyebrow="NEARBY MOMENTS" title="行きたい・行った場所のイベント" description="行きたいリストと家族の足あとから見つけました" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{myPlacesEvents.map((item) => <MyPlacesEventCard key={item.event.id} item={item} />)}</div>
          </section>
        )}
      </div>

      <section data-mypage-section="account" className="rounded-[1.75rem] bg-gradient-to-br from-slate-100 via-white to-brand/5 p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6 lg:col-span-2 lg:order-8">
        <p className="text-[10px] font-bold tracking-[0.16em] text-brand">ACCOUNT</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">アカウント</h2>
        <div className="mt-4"><LogoutButton /></div>
      </section>
    </div>
  );
}

function MypageSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] text-brand">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
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
      className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-3 ${
        primary
          ? "rounded-2xl bg-brand text-white shadow-sm hover:bg-brand-dark"
          : "rounded-2xl bg-white/90 text-slate-800 shadow-sm ring-1 ring-brand/10 hover:bg-brand/5 hover:ring-brand/25"
      }`}
    >
      <span className="text-xl sm:text-2xl">{icon}</span>
      <span className={`text-xs font-semibold sm:text-sm ${primary ? "text-white" : "text-slate-800"}`}>
        {label}
      </span>
    </Link>
  );
}
