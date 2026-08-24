import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChildAvatar from "@/components/ChildAvatar";
import ChildRecommendationSection from "@/components/ChildRecommendationSection";
import {
  buildChildInsightSummaries,
  type ChildInsightSummary,
  type ChildInsightSummaryChild,
} from "@/lib/child-insight-summaries";
import type { ChildInsightVisit } from "@/lib/child-insights";
import {
  findGrowthRecordOnOrBefore,
  formatHeightCm,
  growthRecordHeight,
  type ChildGrowthRecord,
} from "@/lib/child-growth";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { getBuildDateString } from "@/lib/events";
import { prefectures } from "@/lib/facilities";
import {
  buildMypageRecommendations,
  type MypageRecommendations,
} from "@/lib/mypage-recommendations";
import { currentChildAge } from "@/lib/recommendation-age";
import { createClient } from "@/lib/supabase/server";
import {
  isMissingVisitEventSnapshotColumnError,
  visitDisplayName,
  type VisitEventSnapshot,
} from "@/lib/visit-event";
import {
  visitChildAgeLabel,
  type VisitChildCardData,
} from "../../visits/[id]/VisitChildCard";
import type { PrefectureId } from "@/types/facility";

export const metadata: Metadata = { title: "子どものページ" };

type Child = ChildInsightSummaryChild;

type Visit = VisitEventSnapshot & {
  id: string;
  facility_slug: string;
  facility_name: string;
  visited_on: string | null;
  created_at: string;
};

type ChildVisitRow = ChildInsightVisit & {
  id: string;
  child_age_at_visit: number | null;
  interest_other_note: string | null;
  behavior_other_note: string | null;
  child_diary: string | null;
};

type VisitPhotoRow = {
  visit_id: string;
  thumb_path: string | null;
};

type RecommendationSettingsRow = {
  prefecture_ids: unknown;
};

type Memory = Visit & {
  thumbUrl: string | null;
};

type GrowthTimelineItem = {
  visit: Visit;
  ageLabel: string;
  heightCm: number;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

function formatVisitedOn(value: string | null): string {
  return value ? value.replaceAll("-", "/") : "日付未設定";
}

async function loadPublishedChildVisits(
  supabase: ServerSupabaseClient,
  userId: string,
  visitIds: string[],
) {
  if (visitIds.length === 0) return { data: [] };

  const baseColumns =
    "id, facility_slug, facility_name, visited_on, created_at";
  const withEventSnapshots = await supabase
    .from("visits")
    .select(
      `${baseColumns}, event_id, event_title_snapshot, event_date_label_snapshot, event_venue_name_snapshot, event_prefecture_label_snapshot`,
    )
    .eq("user_id", userId)
    .eq("status", "published")
    .in("id", visitIds)
    .order("visited_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!isMissingVisitEventSnapshotColumnError(withEventSnapshots.error)) {
    return withEventSnapshots;
  }

  return supabase
    .from("visits")
    .select(baseColumns)
    .eq("user_id", userId)
    .eq("status", "published")
    .in("id", visitIds)
    .order("visited_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
}

function PreferenceSummary({
  summary,
}: {
  summary: ChildInsightSummary<Child>;
}) {
  if (summary.stage === "none") {
    return (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-slate-500">
          まだ{summary.child.nickname}の「好き」のヒントになる反応記録がありません
        </p>
        <Link
          href="/mypage/visits/new"
          className="inline-flex min-h-10 items-center rounded-lg text-xs font-bold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          おでかけを記録する →
        </Link>
      </div>
    );
  }

  if (summary.stage === "pre_sprout") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-800">
          {summary.child.nickname}の反応記録が{summary.visitCount}件たまりました
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          あと{3 - summary.visitCount}件で{summary.child.nickname}
          の「好き」のヒントが見えはじめます
        </p>
      </div>
    );
  }

  const isRanking = summary.stage === "ranking";
  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl px-4 py-3 ring-1 ${
          isRanking
            ? "bg-violet-50 ring-violet-100"
            : "bg-emerald-50 ring-emerald-100"
        }`}
      >
        <p className="text-xs font-black tracking-wide text-slate-700">
          {isRanking ? "✨ 好きの傾向" : "🌱 好きの芽"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {summary.visitCount}件の反応記録から見えてきたヒントです
        </p>
      </div>
      {summary.frequentInterests.length > 0 && (
        <div aria-label={`${summary.child.nickname}がよく楽しんだこと`}>
          <p className="text-xs font-bold text-slate-600">よく楽しんだこと</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.frequentInterests.map((interest) => (
              <li
                key={interest.id}
                className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-amber-100"
              >
                {interest.label}{" "}
                <span className="font-bold">{interest.count}回</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GrowthSection({
  latestHeightCm,
  timeline,
}: {
  latestHeightCm: number | null;
  timeline: GrowthTimelineItem[];
}) {
  return (
    <section className="space-y-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-6">
      <div>
        <p className="text-xs font-black tracking-[0.16em] text-amber-600">
          GROWING MEMORIES
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">成長の記録</h2>
      </div>

      {latestHeightCm === null ? (
        <div className="rounded-2xl bg-amber-50/70 px-4 py-5 ring-1 ring-amber-100">
          <p className="text-sm text-slate-600">身長はまだ記録されていません</p>
          <Link
            href="/mypage/children"
            className="mt-2 inline-flex min-h-10 items-center text-xs font-bold text-brand hover:underline"
          >
            プロフィール画面で記録する →
          </Link>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-4 rounded-2xl bg-emerald-50/70 px-4 py-4 ring-1 ring-emerald-100">
          <div>
            <p className="text-xs font-bold text-emerald-700">最新身長</p>
            <p className="mt-1 text-3xl font-black text-slate-950">
              {formatHeightCm(latestHeightCm)}
              <span className="ml-1 text-sm text-slate-500">cm</span>
            </p>
          </div>
          <Link
            href="/mypage/children"
            className="inline-flex min-h-10 items-center text-xs font-bold text-brand hover:underline"
          >
            記録を追加 →
          </Link>
        </div>
      )}

      {timeline.length > 0 && (
        <div className="border-t border-emerald-100 pt-4">
          <p className="text-xs font-bold text-emerald-700">訪問時の成長</p>
          <ol className="mt-2 space-y-2">
            {timeline.map(({ visit, ageLabel, heightCm }) => (
              <li key={visit.id}>
                <Link
                  href={`/mypage/visits/${visit.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50/70 px-3 py-3 text-xs transition-colors hover:bg-emerald-100/70"
                >
                  <span className="min-w-0">
                    <time
                      dateTime={visit.visited_on ?? undefined}
                      className="block text-slate-500"
                    >
                      {formatVisitedOn(visit.visited_on)}
                    </time>
                    <span className="mt-0.5 block truncate font-bold text-slate-800">
                      {visitDisplayName(visit)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-bold text-slate-700">
                    {ageLabel}・約{formatHeightCm(heightCm)}cm
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            各訪問日以前の、もっとも近い身長記録を表示しています
          </p>
        </div>
      )}
    </section>
  );
}

export default async function ChildPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(`/mypage/children/${id}`)}`,
    );
  }

  const { data: childData } = await supabase
    .from("children")
    .select("id, nickname, birth_year, birth_month, avatar_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!childData) notFound();
  const child = childData as Child;

  const [
    visitChildrenResult,
    growthRecordsResult,
    recommendationSettingsResult,
    allVisitedSlugsResult,
    signedAvatarResult,
  ] = await Promise.all([
    supabase
      .from("visit_children")
      .select(
        "id, child_id, visit_id, child_age_at_visit, satisfaction, interest_other_note, behavior_other_note, child_diary, visit_child_tags(tag_id, reaction_tags(id, label, tag_type, sort_order))",
      )
      .eq("child_id", child.id),
    supabase
      .from("child_growth_records")
      .select("id, child_id, recorded_on, height_cm, created_at")
      .eq("child_id", child.id)
      .order("recorded_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("mypage_recommendation_settings")
      .select("prefecture_ids")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("visits")
      .select("facility_slug")
      .eq("user_id", user.id)
      .eq("status", "published"),
    child.avatar_url
      ? supabase.storage
          .from("child-avatars")
          .createSignedUrls([child.avatar_url], 60 * 60)
      : Promise.resolve({ data: [] }),
  ]);

  const allChildVisitRows = (visitChildrenResult.data ?? []) as ChildVisitRow[];
  const linkedVisitIds = Array.from(
    new Set(allChildVisitRows.map((row) => row.visit_id)),
  );
  const visitsResult = await loadPublishedChildVisits(
    supabase,
    user.id,
    linkedVisitIds,
  );
  const visits = (visitsResult.data ?? []) as Visit[];
  const publishedVisitIds = new Set(visits.map((visit) => visit.id));
  const childVisitRows = allChildVisitRows.filter((row) =>
    publishedVisitIds.has(row.visit_id),
  );
  const growthRecords = (growthRecordsResult.data ?? []) as ChildGrowthRecord[];
  const recentVisits = visits.slice(0, 8);

  const { data: photoRowsData } =
    PHOTO_UPLOAD_ENABLED && recentVisits.length > 0
      ? await supabase
          .from("visit_photos")
          .select("visit_id, thumb_path")
          .in(
            "visit_id",
            recentVisits.map((visit) => visit.id),
          )
          .not("thumb_path", "is", null)
          .order("visit_id", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: [] };
  const firstPhotoPathByVisitId = new Map<string, string>();
  for (const photo of (photoRowsData ?? []) as VisitPhotoRow[]) {
    if (
      photo.thumb_path &&
      !firstPhotoPathByVisitId.has(photo.visit_id)
    ) {
      firstPhotoPathByVisitId.set(photo.visit_id, photo.thumb_path);
    }
  }
  const photoPaths = Array.from(firstPhotoPathByVisitId.values());
  const { data: signedPhotos } =
    photoPaths.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(photoPaths, 60 * 60)
      : { data: [] };
  const signedPhotoUrlByPath = new Map(
    (signedPhotos ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const memories: Memory[] = recentVisits.map((visit) => {
    const thumbPath = firstPhotoPathByVisitId.get(visit.id);
    return {
      ...visit,
      thumbUrl: thumbPath
        ? signedPhotoUrlByPath.get(thumbPath) ?? null
        : null,
    };
  });

  const summary = buildChildInsightSummaries(
    [child],
    visits,
    childVisitRows,
  )[0];
  if (!summary) notFound();

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
        (prefectureId): prefectureId is PrefectureId =>
          typeof prefectureId === "string" &&
          knownPrefectureIds.has(prefectureId),
      )
    : [];
  const visitedSlugs = (allVisitedSlugsResult.data ?? [])
    .map((row) => row.facility_slug)
    .filter((slug): slug is string => typeof slug === "string");
  let recommendations: MypageRecommendations | null = null;
  if (
    summary.frequentInterests.length > 0 &&
    selectedPrefectureIds.length > 0
  ) {
    const childRecommendations = buildMypageRecommendations({
      children: [
        {
          id: child.id,
          nickname: child.nickname,
          birthYear: child.birth_year,
          birthMonth: child.birth_month,
          interests: summary.frequentInterests,
        },
      ],
      selectedPrefectureIds,
      visitedSlugs,
      facilityLimit: 2,
      eventLimit: 2,
    });
    if (
      childRecommendations.facilities.length > 0 ||
      childRecommendations.events.length > 0
    ) {
      recommendations = childRecommendations;
    }
  }

  const avatarUrl =
    signedAvatarResult.data?.[0]?.signedUrl ?? null;
  const currentAge = currentChildAge(
    child.birth_year,
    child.birth_month,
    getBuildDateString(),
  );
  const latestHeightCm = growthRecords[0]
    ? growthRecordHeight(growthRecords[0])
    : null;
  const childVisitByVisitId = new Map(
    childVisitRows.map((row) => [row.visit_id, row]),
  );
  const growthTimeline: GrowthTimelineItem[] = visits
    .flatMap((visit) => {
      const childVisit = childVisitByVisitId.get(visit.id);
      if (!childVisit) return [];
      const growthRecord = findGrowthRecordOnOrBefore(
        growthRecords,
        child.id,
        visit.visited_on,
      );
      const heightCm = growthRecord ? growthRecordHeight(growthRecord) : null;
      if (heightCm === null) return [];

      const ageRow: VisitChildCardData = {
        id: childVisit.id,
        child_id: childVisit.child_id,
        child_age_at_visit: childVisit.child_age_at_visit,
        satisfaction: childVisit.satisfaction,
        interest_other_note: childVisit.interest_other_note,
        behavior_other_note: childVisit.behavior_other_note,
        child_diary: childVisit.child_diary,
        children: child,
        visit_child_tags: null,
      };
      return [
        {
          visit,
          ageLabel: visitChildAgeLabel(ageRow, visit.visited_on),
          heightCm,
        },
      ];
    })
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#fffaf3]">
      <div className="mx-auto max-w-lg space-y-7 px-4 py-7 sm:space-y-8 sm:py-10">
        <Link
          href="/mypage/children"
          className="inline-flex min-h-10 items-center text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
        >
          ← 子どもプロフィール
        </Link>

        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-rose-950 px-5 py-7 text-white shadow-xl ring-1 ring-white/10 sm:px-7">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-300/15 blur-2xl" />
          <div className="relative flex flex-col items-center text-center">
            <div className="rounded-full bg-white/10 p-1.5 ring-1 ring-white/20 shadow-2xl">
              <ChildAvatar
                childId={child.id}
                nickname={child.nickname}
                avatarUrl={avatarUrl}
                size="xl"
              />
            </div>
            <p className="mt-5 text-xs font-black tracking-[0.18em] text-amber-200">
              OUR FAMILY STORY
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {child.nickname}のページ
            </h1>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold text-white/85">
              <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                {currentAge}歳
              </span>
              {latestHeightCm !== null && (
                <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                  最新 {formatHeightCm(latestHeightCm)}cm
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="space-y-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-6">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-amber-600">
              RECENT MEMORIES
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              この子の最近の思い出
            </h2>
          </div>

          {memories.length === 0 ? (
            <div className="rounded-2xl bg-amber-50/70 px-4 py-7 text-center ring-1 ring-amber-100">
              <p className="text-sm font-bold text-slate-700">
                まだ{child.nickname}の思い出はありません
              </p>
              <Link
                href="/mypage/visits/new"
                className="mt-3 inline-flex min-h-10 items-center text-xs font-bold text-brand hover:underline"
              >
                おでかけを記録する →
              </Link>
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
              <div className="flex w-max gap-3">
                {memories.map((memory) => (
                  <Link
                    key={memory.id}
                    href={`/mypage/visits/${memory.id}`}
                    className="group relative h-56 w-44 shrink-0 overflow-hidden rounded-2xl bg-slate-900 shadow-md ring-1 ring-slate-900/10 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  >
                    {memory.thumbUrl ? (
                      <Image
                        src={memory.thumbUrl}
                        alt={`${visitDisplayName(memory)}の写真`}
                        fill
                        sizes="176px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_20%_15%,#fed7aa_0%,transparent_32%),radial-gradient(circle_at_80%_30%,#bae6fd_0%,transparent_30%),linear-gradient(145deg,#0f172a_0%,#334155_48%,#14532d_100%)] text-5xl">
                        ✨
                      </span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-slate-950" />
                    <span className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 text-white">
                      {memory.event_id && (
                        <span className="mb-1 inline-flex rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-bold">
                          イベント記録
                        </span>
                      )}
                      <span className="block line-clamp-2 text-sm font-black leading-snug">
                        {visitDisplayName(memory)}
                      </span>
                      <span className="mt-1 block text-[10px] text-white/70">
                        {memory.event_date_label_snapshot ??
                          formatVisitedOn(memory.visited_on)}
                      </span>
                      {memory.event_venue_name_snapshot && (
                        <span className="block truncate text-[10px] text-white/60">
                          {memory.event_venue_name_snapshot}
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-6">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-amber-600">
              LITTLE FAVORITES
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              好きの芽・好きの傾向
            </h2>
          </div>
          <PreferenceSummary summary={summary} />
          {summary.visitCategories.length > 0 && (
            <div className="border-t border-amber-100 pt-4">
              <p className="text-xs font-bold text-slate-600">
                よく行った場所の傾向
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                一緒に行ったすべてのおでかけを、施設カテゴリ別に数えています
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {summary.visitCategories.map(({ category, count }) => (
                  <li
                    key={category}
                    className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-sky-100"
                  >
                    {category} <span className="font-bold">{count}回</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <GrowthSection
          latestHeightCm={latestHeightCm}
          timeline={growthTimeline}
        />

        {recommendations && (
          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-6">
            <ChildRecommendationSection
              childNickname={child.nickname}
              recommendations={recommendations}
            />
          </div>
        )}
      </div>
    </main>
  );
}
