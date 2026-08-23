import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import VisitedPlacesMapClient from "@/components/VisitedPlacesMapClient";
import { isVisibleFacilitySlug } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import { isMissingVisitCoordinateColumnError } from "@/lib/visit-place-coordinates";
import {
  isEventFacilitySlug,
  isMissingVisitEventSnapshotColumnError,
  visitDisplayName,
  type VisitEventSnapshot,
} from "@/lib/visit-event";
import { buildFamilyOutingMapData } from "@/lib/visited-places";
import {
  familyRevisitLabels,
  fatigueLabels,
  satisfactionLabels,
  visitLabel,
} from "@/lib/visit-labels";

export const metadata: Metadata = { title: "おでかけ履歴" };

type Visit = VisitEventSnapshot & {
  id: string;
  facility_slug: string;
  facility_name: string;
  status: "draft" | "published";
  visited_on: string | null;
  family_revisit: string | null;
  parent_fatigue: string | null;
  parent_memo: string | null;
  weather: string | null;
  crowding: string | null;
  stay_duration_min: number | null;
};

type VisitChild = {
  visit_id: string;
  satisfaction: string | null;
  child_id: string;
  children: { nickname: string } | { nickname: string }[] | null;
  visit_child_tags: VisitChildTag[] | null;
};

type VisitChildTag = {
  tag_id: string;
  reaction_tags: { label: string } | { label: string }[] | null;
};

type VisitPhotoThumbRow = {
  visit_id: string;
  thumb_path: string | null;
  sort_order: number | null;
};

type VisitPhotoThumb = {
  thumbPath: string;
  thumbUrl: string | null;
};

type VisitMapRow = {
  facility_slug: string | null;
  facility_name?: string | null;
  visited_on: string | null;
  family_revisit: string | null;
  parent_fatigue: string | null;
  place_latitude?: number | null;
  place_longitude?: number | null;
};

type WishlistSlugRow = {
  facility_slug: string | null;
};

const VISIT_THUMBNAILS_PER_CARD = 2;

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadPublishedMapVisits(
  supabase: ServerSupabaseClient,
  userId: string,
) {
  const withCoordinates = await supabase
    .from("visits")
    .select(
      "facility_slug, facility_name, visited_on, family_revisit, parent_fatigue, place_latitude, place_longitude",
    )
    .eq("user_id", userId)
    .eq("status", "published");

  if (!isMissingVisitCoordinateColumnError(withCoordinates.error)) {
    return withCoordinates;
  }

  return supabase
    .from("visits")
    .select("facility_slug, facility_name, visited_on, family_revisit, parent_fatigue")
    .eq("user_id", userId)
    .eq("status", "published");
}

function formatVisitedOn(visitedOn: string | null): string {
  if (!visitedOn) return "日付未設定";
  return visitedOn.replaceAll("-", "/");
}

function childNickname(child: VisitChild["children"]): string {
  if (Array.isArray(child)) return child[0]?.nickname ?? "子ども";
  return child?.nickname ?? "子ども";
}

function reactionTagLabel(tag: VisitChildTag): string | null {
  if (Array.isArray(tag.reaction_tags)) {
    return tag.reaction_tags[0]?.label ?? null;
  }
  return tag.reaction_tags?.label ?? null;
}

function reactionTagsForVisit(children: VisitChild[]): string[] {
  const labels = children.flatMap((child) =>
    (child.visit_child_tags ?? [])
      .map(reactionTagLabel)
      .filter((label): label is string => Boolean(label)),
  );
  return Array.from(new Set(labels)).slice(0, 3);
}

function compactMemo(value: string | null): string | null {
  const memo = value?.trim();
  if (!memo) return null;
  return memo.replace(/\s+/g, " ");
}

function chipLabel(labels: Record<string, string>, value: string | null): string | null {
  if (!value) return null;
  const label = visitLabel(labels, value);
  return label === "未記録" ? null : label;
}

function familyMapBadgeText(visitedCount: number, wishlistCount: number): string {
  return [
    visitedCount > 0 ? `🐾${visitedCount}` : null,
    wishlistCount > 0 ? `♥${wishlistCount}` : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{
    no_child?: string;
    revisit?: string;
    child?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const filterRevisit = params.revisit === "yes";
  const filterChildSlot = /^[1-9]\d{0,2}$/.test(params.child ?? "")
    ? Number(params.child)
    : null;
  let filterChildId: string | null = null;
  let filterChildNickname: string | null = null;

  if (filterChildSlot && user) {
    const { data: orderedChildren } = await supabase
      .from("children")
      .select("id, nickname")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    const filterChild = orderedChildren?.[filterChildSlot - 1];
    filterChildId = typeof filterChild?.id === "string" ? filterChild.id : null;
    filterChildNickname =
      typeof filterChild?.nickname === "string" ? filterChild.nickname : null;
  }

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

  const visitSelect =
    "id, facility_slug, facility_name, status, visited_on, family_revisit, parent_fatigue, parent_memo, weather, crowding, stay_duration_min";
  const eventVisitSelect = `${visitSelect}, event_id, event_title_snapshot, event_date_label_snapshot, event_venue_name_snapshot, event_prefecture_label_snapshot`;

  function buildVisitsQuery(selectColumns: string) {
    if (!user) return null;
    let query = supabase
      .from("visits")
      .select(selectColumns)
      .eq("user_id", user.id)
      .order("visited_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (visitIds !== null) {
      query = visitIds.length > 0
        ? query.in("id", visitIds)
        : query.in("id", ["__no_match__"]);
    }
    if (filterRevisit) query = query.eq("family_revisit", "yes");
    return query;
  }

  const visitsPromise = (async () => {
    const withEventSnapshots = buildVisitsQuery(eventVisitSelect);
    if (!withEventSnapshots) return { data: [] };
    const result = await withEventSnapshots;
    if (!isMissingVisitEventSnapshotColumnError(result.error)) return result;
    const fallback = buildVisitsQuery(visitSelect);
    return fallback ? await fallback : { data: [] };
  })();

  const publishedMapVisitsPromise = user
    ? loadPublishedMapVisits(supabase, user.id)
    : Promise.resolve({ data: [] });

  const wishlistSlugsQuery = user
    ? supabase.from("wishlists").select("facility_slug").eq("user_id", user.id)
    : null;

  const [{ data: visits }, { data: publishedMapVisits }, { data: wishlistRows }] =
    await Promise.all([
      visitsPromise,
      publishedMapVisitsPromise,
      wishlistSlugsQuery ? wishlistSlugsQuery : Promise.resolve({ data: [] }),
    ]);

  const visitRows = (visits ?? []) as unknown as Visit[];
  const wishlistSlugs = ((wishlistRows ?? []) as WishlistSlugRow[])
    .map((row) => row.facility_slug)
    .filter((slug): slug is string => Boolean(slug));
  const familyMapPlaces = buildFamilyOutingMapData(
    (publishedMapVisits ?? []) as VisitMapRow[],
    wishlistSlugs,
  );
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
  const visitIdsForChildren = visitRows.map((visit) => visit.id);
  const [{ data: allVisitChildren }, { data: visitPhotoRows }] =
    visitIdsForChildren.length > 0
      ? await Promise.all([
          supabase
            .from("visit_children")
            .select(
              "visit_id, satisfaction, child_id, children(nickname), visit_child_tags(tag_id, reaction_tags(label))",
            )
            .in("visit_id", visitIdsForChildren),
          supabase
            .from("visit_photos")
            .select("visit_id, thumb_path, sort_order")
            .in("visit_id", visitIdsForChildren)
            .order("visit_id", { ascending: true })
            .order("sort_order", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];
  const childrenByVisit = new Map<string, VisitChild[]>();
  for (const childVisit of (allVisitChildren ?? []) as VisitChild[]) {
    const current = childrenByVisit.get(childVisit.visit_id) ?? [];
    current.push(childVisit);
    childrenByVisit.set(childVisit.visit_id, current);
  }
  const thumbPathsByVisit = new Map<string, string[]>();
  for (const photo of (visitPhotoRows ?? []) as VisitPhotoThumbRow[]) {
    if (!photo.thumb_path) continue;
    const current = thumbPathsByVisit.get(photo.visit_id) ?? [];
    if (current.length >= VISIT_THUMBNAILS_PER_CARD) continue;
    current.push(photo.thumb_path);
    thumbPathsByVisit.set(photo.visit_id, current);
  }
  const thumbPaths = Array.from(new Set([...thumbPathsByVisit.values()].flat()));
  const { data: signedThumbUrls } =
    thumbPaths.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(thumbPaths, 60 * 60)
      : { data: [] };
  const signedThumbUrlByPath = new Map(
    (signedThumbUrls ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const photosByVisit = new Map<string, VisitPhotoThumb[]>();
  for (const [visitId, paths] of thumbPathsByVisit.entries()) {
    photosByVisit.set(
      visitId,
      paths.map((path) => ({
        thumbPath: path,
        thumbUrl: signedThumbUrlByPath.get(path) ?? null,
      })),
    );
  }

  let filterLabel: string | null = null;
  if (filterRevisit) filterLabel = "また行きたい";
  if (filterChildId) {
    filterLabel = filterChildNickname
      ? `${filterChildNickname}の記録`
      : "子ども別フィルター";
  }

  return (
    <main className="min-h-screen bg-[#fffaf3]">
    <div className="mx-auto max-w-lg space-y-7 px-4 py-7 sm:py-10">
      <Link href="/mypage" className="text-sm font-bold text-slate-400 transition-colors hover:text-slate-600">
        ← マイページ
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">FAMILY OUTING ALBUM</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">おでかけ履歴</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filterLabel
              ? `「${filterLabel}」でフィルター中`
              : "最近の記録を新しい順に表示します。"}
          </p>
        </div>
        <Link
          href="/mypage/visits/new"
          className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          記録する
        </Link>
      </div>

      {!filterLabel && visitRows.length > 0 && (
        <Link
          href="/mypage/memories"
          className="group flex items-center justify-between overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 via-violet-950 to-rose-950 px-5 py-5 text-white shadow-lg"
        >
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-white/60">
              FAMILY MEMORIES
            </p>
            <p className="mt-1 font-black">写真で思い出を振り返る</p>
            <p className="mt-0.5 text-xs text-white/70">1画面1思い出を、縦送りで</p>
          </div>
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          >
            ↑
          </span>
        </Link>
      )}

      {filterLabel && (
        <Link
          href="/mypage/visits"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-amber-100 transition-colors hover:text-slate-700"
        >
          ✕ フィルターを解除
        </Link>
      )}

      {params.no_child === "1" && (
        <div className="rounded-2xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-700 ring-1 ring-sky-200">
          子どもプロフィールなしで保存しました。あとから登録すると、次回以降は子どもごとの満足度も残せます。
        </div>
      )}

      <section className="space-y-4">
        <div>
        <p className="text-xs font-black tracking-[0.18em] text-amber-600">OUR OUTING MAP</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">
          家族のおでかけマップ
          {familyMapBadge && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {familyMapBadge}
            </span>
          )}
        </h2>
        </div>
        <VisitedPlacesMapClient
          places={familyMapPlaces}
          height={{ mobile: 240, desktop: 360 }}
        />
      </section>

      {visitRows.length > 0 ? (
        <div className="space-y-6">
          {visitRows.map((visit) => {
            const visitChildren = childrenByVisit.get(visit.id) ?? [];
            const hasFacilityPage = isVisibleFacilitySlug(visit.facility_slug);
            const isStoredFacility =
              !visit.facility_slug.startsWith("manual-") &&
              !isEventFacilitySlug(visit.facility_slug);
            const isEventRecord = Boolean(visit.event_id);
            const displayName = visitDisplayName(visit);
            const revisitLabel = chipLabel(familyRevisitLabels, visit.family_revisit);
            const fatigueLabel = chipLabel(fatigueLabels, visit.parent_fatigue);
            const isDraft = visit.status === "draft";
            const visitPhotos = photosByVisit.get(visit.id) ?? [];
            const childSatisfaction = visitChildren
              .filter((childVisit) => Boolean(childVisit.satisfaction))
              .slice(0, 2);
            const reactionTags = reactionTagsForVisit(visitChildren);
            const memo = compactMemo(visit.parent_memo);
            return (
            <article
              key={visit.id}
              className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-amber-100"
            >
              <Link
                href={`/mypage/visits/${visit.id}`}
                className="group/photo relative block aspect-[4/3] overflow-hidden bg-slate-900"
              >
                {visitPhotos.length > 0 ? (
                  <div
                    className={`absolute inset-0 grid bg-black ${
                      visitPhotos.length === 1 ? "grid-cols-1" : "grid-cols-2 gap-0.5"
                    }`}
                  >
                    {visitPhotos.map((photo, photoIndex) => (
                      <div
                        key={`${photo.thumbPath}-${photoIndex}`}
                        className="relative min-h-0 min-w-0"
                      >
                        {photo.thumbUrl ? (
                          <Image
                            src={photo.thumbUrl}
                            alt={`${displayName}の写真`}
                            fill
                            sizes="(max-width: 512px) 100vw, 512px"
                            className="object-cover transition-transform duration-300 group-hover/photo:scale-[1.02]"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
                            写真なし
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#fed7aa_0%,transparent_32%),radial-gradient(circle_at_80%_30%,#bae6fd_0%,transparent_30%),linear-gradient(145deg,#0f172a_0%,#334155_48%,#14532d_100%)]">
                    <span className="flex h-full items-center justify-center pb-12 text-6xl" aria-hidden="true">✨</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/85" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                    {isEventRecord ? "記録日: " : ""}{formatVisitedOn(visit.visited_on)}
                  </span>
                  {isDraft && (
                    <span className="rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-amber-950 shadow">下書き</span>
                  )}
                  {isEventRecord && (
                    <span className="rounded-full bg-violet-200 px-3 py-1.5 text-xs font-black text-violet-950 shadow">イベント記録</span>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
                  <p className="text-xs font-bold tracking-[0.16em] text-white/65">OUR FAMILY MEMORY</p>
                  <h2 className="mt-1 text-[clamp(1.25rem,5.5vw,1.875rem)] font-black leading-tight text-white [overflow-wrap:anywhere] drop-shadow">
                    {displayName}
                  </h2>
                </div>
              </Link>

                <div className="min-w-0 space-y-3 p-5">
                  <div className="space-y-1">
                    {isEventRecord && (
                      <div className="space-y-0.5 text-xs text-slate-500">
                        {visit.event_date_label_snapshot && (
                          <p className="font-medium text-slate-600">
                            {visit.event_date_label_snapshot}
                          </p>
                        )}
                        {visit.event_venue_name_snapshot && (
                          <p>
                            会場: {visit.event_venue_name_snapshot}
                            {visit.event_prefecture_label_snapshot
                              ? `（${visit.event_prefecture_label_snapshot}）`
                              : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {childSatisfaction.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {childSatisfaction.map((childVisit) => (
                        <span
                          key={`${childVisit.visit_id}-${childVisit.child_id}`}
                          className="rounded-full bg-slate-50 px-2 py-1 text-xs text-slate-600"
                        >
                          {childNickname(childVisit.children)}:{" "}
                          {satisfactionLabels[childVisit.satisfaction ?? ""] ??
                            childVisit.satisfaction}
                        </span>
                      ))}
                    </div>
                  )}

                  {reactionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {reactionTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {revisitLabel && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                        また行きたい: {revisitLabel}
                      </span>
                    )}
                    {fatigueLabel && (
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                        疲れ: {fatigueLabel}
                      </span>
                    )}
                  </div>

                  {memo && (
                    <blockquote className="border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed text-slate-700">
                      「{memo}」
                    </blockquote>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex min-w-0 flex-col gap-1">
                      {!isEventRecord && (
                        <Link
                          href={`/mypage/visits/facility/${visit.facility_slug}`}
                          className="text-xs font-bold text-amber-700 hover:underline"
                        >
                          この場所での思い出
                        </Link>
                      )}
                      {hasFacilityPage ? (
                        <Link
                          href={`/facilities/${visit.facility_slug}`}
                          className="text-xs text-slate-400 hover:underline"
                        >
                          施設ページを見る
                        </Link>
                      ) : isStoredFacility ? (
                        <span className="text-xs text-slate-400">
                          施設ページは現在公開していません
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/mypage/visits/${visit.id}/edit`}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600"
                      >
                        編集
                      </Link>
                      <Link
                        href={`/mypage/visits/${visit.id}`}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-slate-800"
                      >
                        詳細を見る
                      </Link>
                    </div>
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
    </main>
  );
}
