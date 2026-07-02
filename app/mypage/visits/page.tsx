import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import VisitedPlacesMapClient from "@/components/VisitedPlacesMapClient";
import { isVisibleFacilitySlug } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import { buildVisitedPlacesMapData } from "@/lib/visited-places";
import {
  familyRevisitLabels,
  fatigueLabels,
  satisfactionLabels,
  visitLabel,
} from "@/lib/visit-labels";

export const metadata: Metadata = { title: "おでかけ履歴" };

type Visit = {
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
  visited_on: string | null;
};

const VISIT_THUMBNAILS_PER_CARD = 2;

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
  let filterChildNickname: string | null = null;

  if (filterChildId && user) {
    const { data: filterChild } = await supabase
      .from("children")
      .select("nickname")
      .eq("id", filterChildId)
      .eq("user_id", user.id)
      .maybeSingle();
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

  let visitsQuery = user
    ? supabase
        .from("visits")
        .select(
          "id, facility_slug, facility_name, status, visited_on, family_revisit, parent_fatigue, parent_memo, weather, crowding, stay_duration_min",
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

  const publishedMapVisitsQuery = user
    ? supabase
        .from("visits")
        .select("facility_slug, visited_on")
        .eq("user_id", user.id)
        .eq("status", "published")
    : null;

  const [{ data: visits }, { data: publishedMapVisits }] = await Promise.all([
    visitsQuery ? visitsQuery : Promise.resolve({ data: [] }),
    publishedMapVisitsQuery
      ? publishedMapVisitsQuery
      : Promise.resolve({ data: [] }),
  ]);

  const visitRows = (visits ?? []) as Visit[];
  const visitedMapFacilities = buildVisitedPlacesMapData(
    (publishedMapVisits ?? []) as VisitMapRow[],
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

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">
          家族の足あとマップ
          {visitedMapFacilities.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {visitedMapFacilities.length}か所
            </span>
          )}
        </h2>
        <VisitedPlacesMapClient
          visitedFacilities={visitedMapFacilities}
          height={{ mobile: 240, desktop: 360 }}
        />
      </section>

      {visitRows.length > 0 ? (
        <div className="space-y-3">
          {visitRows.map((visit) => {
            const visitChildren = childrenByVisit.get(visit.id) ?? [];
            const hasFacilityPage = isVisibleFacilitySlug(visit.facility_slug);
            const isStoredFacility = !visit.facility_slug.startsWith("manual-");
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
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
            >
              <div className="flex gap-3">
                {visitPhotos.length > 0 && (
                  <Link
                    href={`/mypage/visits/${visit.id}`}
                    className={`grid h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 transition-opacity hover:opacity-90 ${
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
                            alt={`${visit.facility_name}の写真`}
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
                    ))}
                  </Link>
                )}

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isDraft && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          下書き
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatVisitedOn(visit.visited_on)}
                      </span>
                    </div>
                    <h2 className="font-bold leading-snug text-slate-900">
                      <Link
                        href={`/mypage/visits/facility/${visit.facility_slug}`}
                        className="hover:text-brand transition-colors"
                      >
                        {visit.facility_name}
                      </Link>
                    </h2>
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
                    <p className="truncate text-xs leading-relaxed text-slate-500">
                      {memo}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    {hasFacilityPage ? (
                      <Link
                        href={`/facilities/${visit.facility_slug}`}
                        className="text-slate-400 text-xs hover:underline"
                      >
                        施設ページを見る
                      </Link>
                    ) : isStoredFacility ? (
                      <span className="text-slate-400 text-xs">
                        施設ページは現在公開していません
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/mypage/visits/${visit.id}/edit`}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600"
                      >
                        編集
                      </Link>
                      <Link
                        href={`/mypage/visits/${visit.id}`}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
                      >
                        詳細を見る
                      </Link>
                    </div>
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
  );
}
