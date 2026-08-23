import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ChildAvatar from "@/components/ChildAvatar";
import {
  findGrowthRecordOnOrBefore,
  growthRecordHeight,
  type ChildGrowthRecord,
} from "@/lib/child-growth";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { getFacilityBySlug, isFacilityVisible } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import { satisfactionLabels } from "@/lib/visit-labels";
import VisitPhotoGallery, {
  type VisitPhotoGalleryPhoto,
} from "../../[id]/VisitPhotoGallery";
import {
  getVisitChildProfile,
  visitChildAgeLabel,
  VisitChildCard,
  type VisitChildCardData,
} from "../../[id]/VisitChildCard";

export const metadata: Metadata = {
  title: "施設別おでかけ履歴",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: null,
  twitter: null,
};

type Visit = {
  id: string;
  user_id: string;
  facility_slug: string;
  facility_name: string;
  status: "draft" | "published";
  visited_on: string | null;
  parent_memo: string | null;
};

type VisitPhoto = {
  id: string;
  visit_id: string;
  storage_path: string;
  thumb_path: string;
  taken_on: string | null;
};

type ChildGrowthEntry = {
  row: VisitChildCardData;
  visitedOn: string | null;
};

type CountSummary = {
  label: string;
  count: number;
};

function formatVisitedOn(value: string | null): string {
  if (!value) return "日付未設定";
  return value.replaceAll("-", "/");
}

function hasReactionTags(row: VisitChildCardData): boolean {
  return (row.visit_child_tags ?? []).some((tag) => {
    if (Array.isArray(tag.reaction_tags)) {
      return Boolean(tag.reaction_tags[0]?.label);
    }
    return Boolean(tag.reaction_tags?.label);
  });
}

function hasOtherNotes(row: VisitChildCardData): boolean {
  return Boolean(
    row.interest_other_note?.trim() ||
      row.behavior_other_note?.trim() ||
      row.child_diary?.trim(),
  );
}

function reactionTagLabel(
  tag: NonNullable<VisitChildCardData["visit_child_tags"]>[number],
): string | null {
  if (Array.isArray(tag.reaction_tags)) {
    return tag.reaction_tags[0]?.label ?? null;
  }
  return tag.reaction_tags?.label ?? null;
}

function compactMemo(value: string | null): string | null {
  const memo = value?.trim();
  if (!memo) return null;
  return memo;
}

function getVisitId(row: VisitChildCardData & { visit_id?: string }): string | null {
  return row.visit_id ?? null;
}

function toCountSummaries(labels: string[], limit?: number): CountSummary[] {
  const firstIndexByLabel = new Map<string, number>();
  const countByLabel = new Map<string, number>();

  labels.forEach((label, index) => {
    if (!firstIndexByLabel.has(label)) {
      firstIndexByLabel.set(label, index);
    }
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + 1);
  });

  const summaries = Array.from(countByLabel.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (firstIndexByLabel.get(a.label) ?? 0) - (firstIndexByLabel.get(b.label) ?? 0);
    });

  return typeof limit === "number" ? summaries.slice(0, limit) : summaries;
}

function GrowthSummary({
  entries,
  avatarUrl,
  growthRecords,
}: {
  entries: ChildGrowthEntry[];
  avatarUrl: string | null;
  growthRecords: ChildGrowthRecord[];
}) {
  const firstChild = getVisitChildProfile(entries[0]?.row.children ?? null);
  if (!firstChild) return null;

  const satisfactionSummaries = toCountSummaries(
    entries
      .map((entry) =>
        entry.row.satisfaction
          ? satisfactionLabels[entry.row.satisfaction] ?? entry.row.satisfaction
          : null,
      )
      .filter((label): label is string => Boolean(label)),
  );
  const reactionTagSummaries = toCountSummaries(
    entries.flatMap((entry) =>
      (entry.row.visit_child_tags ?? [])
        .map(reactionTagLabel)
        .filter((label): label is string => Boolean(label)),
    ),
    3,
  );
  const heightTimeline = entries
    .map((entry) => {
      const record = findGrowthRecordOnOrBefore(
        growthRecords,
        entry.row.child_id,
        entry.visitedOn,
      );
      const heightCm = record ? growthRecordHeight(record) : null;
      return heightCm === null ? null : { entry, heightCm };
    })
    .filter(
      (item): item is { entry: ChildGrowthEntry; heightCm: number } =>
        item !== null,
    )
    .slice(-5);

  return (
    <article className="space-y-3 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100">
      <div className="flex items-center gap-3">
        <ChildAvatar
          childId={entries[0].row.child_id}
          nickname={firstChild.nickname}
          avatarUrl={avatarUrl}
          size="md"
        />
        <div className="min-w-0">
          <h3 className="truncate font-black text-slate-950">{firstChild.nickname}</h3>
          <p className="text-xs text-slate-400">
            この施設での記録 {entries.length}回
          </p>
        </div>
      </div>

      {satisfactionSummaries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {satisfactionSummaries.map((summary) => (
            <span
              key={summary.label}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100"
            >
              {summary.label} {summary.count}回
            </span>
          ))}
        </div>
      )}

      {reactionTagSummaries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reactionTagSummaries.map((summary) => (
            <span
              key={summary.label}
              className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
            >
              {summary.label} {summary.count}回
            </span>
          ))}
        </div>
      )}

      {heightTimeline.length > 0 && (
        <div className="border-t border-emerald-100 pt-3">
          <p className="text-xs font-bold text-emerald-700">訪問時の成長</p>
          <ol className="mt-2 space-y-1.5">
            {heightTimeline.map(({ entry, heightCm }, index) => (
              <li
                key={`${entry.row.id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50/70 px-2.5 py-2 text-xs"
              >
                <time
                  dateTime={entry.visitedOn ?? undefined}
                  className="shrink-0 text-slate-500"
                >
                  {formatVisitedOn(entry.visitedOn)}
                </time>
                <span className="text-right font-bold text-slate-700">
                  {visitChildAgeLabel(entry.row, entry.visitedOn)}・約
                  {heightCm.toFixed(1)}cm
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-1.5 text-[11px] text-slate-400">
            各訪問日以前の、もっとも近い身長記録を表示しています
          </p>
        </div>
      )}
    </article>
  );
}

export default async function FacilityVisitHistoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        `/mypage/visits/facility/${slug}`,
      )}`,
    );
  }

  const { data: visits } = await supabase
    .from("visits")
    .select("id, user_id, facility_slug, facility_name, status, visited_on, parent_memo")
    .eq("user_id", user.id)
    .eq("facility_slug", slug)
    .order("visited_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const visitRows = (visits ?? []) as Visit[];
  const facility = slug.startsWith("manual-") ? undefined : getFacilityBySlug(slug);
  const facilityName = facility?.name ?? visitRows[0]?.facility_name ?? "この施設";
  const hasFacilityPage = isFacilityVisible(facility);
  const datedVisits = visitRows.filter((visit) => Boolean(visit.visited_on));
  const firstVisitedOn = datedVisits[0]?.visited_on ?? null;
  const lastVisitedOn = datedVisits[datedVisits.length - 1]?.visited_on ?? null;
  const publishedVisitCount = visitRows.filter(
    (visit) => visit.status === "published",
  ).length;
  const draftVisitCount = visitRows.filter((visit) => visit.status === "draft").length;
  const visitCountLabel =
    draftVisitCount > 0
      ? `公開済み ${publishedVisitCount}回 ／ 下書き ${draftVisitCount}件`
      : `訪問回数 ${visitRows.length}回`;

  if (visitRows.length === 0) {
    return (
      <main className="min-h-screen bg-[#fffaf3]">
      <div className="mx-auto max-w-lg space-y-5 px-4 py-7 sm:py-10">
        <Link
          href="/mypage/visits"
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          ← おでかけ履歴
        </Link>
        <header className="space-y-2">
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">MEMORIES AT THIS PLACE</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{facilityName}</h1>
        </header>
        <div className="rounded-[2rem] bg-white px-5 py-10 text-center shadow-sm ring-1 ring-amber-100">
          <p className="text-sm font-black text-slate-700">
            この施設のおでかけ記録はまだありません
          </p>
          <Link
            href="/mypage/visits"
            className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800"
          >
            履歴へ戻る
          </Link>
        </div>
      </div>
      </main>
    );
  }

  const visitIds = visitRows.map((visit) => visit.id);
  const visitById = new Map(visitRows.map((visit) => [visit.id, visit]));
  const visitOrderById = new Map(visitRows.map((visit, index) => [visit.id, index]));
  const [{ data: visitChildren }, { data: photoRows }] =
    visitIds.length > 0
      ? await Promise.all([
          supabase
            .from("visit_children")
            .select(
              "id, visit_id, child_id, child_age_at_visit, satisfaction, interest_other_note, behavior_other_note, child_diary, children(nickname, birth_year, birth_month, avatar_url), visit_child_tags(tag_id, reaction_tags(label))",
            )
            .in("visit_id", visitIds),
          PHOTO_UPLOAD_ENABLED
            ? supabase
                .from("visit_photos")
                .select("id, visit_id, storage_path, thumb_path, taken_on")
                .in("visit_id", visitIds)
                .order("visit_id", { ascending: true })
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] }),
        ])
      : [{ data: [] }, { data: [] }];

  const childRows = (visitChildren ?? []) as (VisitChildCardData & {
    visit_id: string;
  })[];
  const childIds = Array.from(new Set(childRows.map((row) => row.child_id)));
  const { data: growthRecords } =
    childIds.length > 0
      ? await supabase
          .from("child_growth_records")
          .select("id, child_id, recorded_on, height_cm, created_at")
          .in("child_id", childIds)
          .order("recorded_on", { ascending: true })
      : { data: [] };
  const growthRows = (growthRecords ?? []) as ChildGrowthRecord[];
  const childrenByVisit = new Map<string, VisitChildCardData[]>();
  const growthByChild = new Map<string, ChildGrowthEntry[]>();
  for (const childRow of childRows) {
    const visit = visitById.get(childRow.visit_id);
    if (!visit) continue;

    const visitChildrenForCard = childrenByVisit.get(childRow.visit_id) ?? [];
    visitChildrenForCard.push(childRow);
    childrenByVisit.set(childRow.visit_id, visitChildrenForCard);

    const currentGrowth = growthByChild.get(childRow.child_id) ?? [];
    currentGrowth.push({ row: childRow, visitedOn: visit.visited_on });
    growthByChild.set(childRow.child_id, currentGrowth);
  }
  for (const entries of growthByChild.values()) {
    entries.sort((a, b) => {
      const aVisitId = getVisitId(a.row as VisitChildCardData & { visit_id?: string });
      const bVisitId = getVisitId(b.row as VisitChildCardData & { visit_id?: string });
      return (
        (visitOrderById.get(aVisitId ?? "") ?? 0) -
        (visitOrderById.get(bVisitId ?? "") ?? 0)
      );
    });
  }

  const avatarPaths = childRows
    .map((row) => getVisitChildProfile(row.children)?.avatar_url)
    .filter((path): path is string => Boolean(path));
  const { data: signedAvatars } =
    avatarPaths.length > 0
      ? await supabase.storage
          .from("child-avatars")
          .createSignedUrls(Array.from(new Set(avatarPaths)), 60 * 60)
      : { data: [] };
  const avatarUrlByPath = new Map(
    (signedAvatars ?? []).map((row) => [row.path, row.signedUrl]),
  );

  const visitPhotos = (photoRows ?? []) as VisitPhoto[];
  const photoPaths = Array.from(
    new Set(visitPhotos.flatMap((photo) => [photo.thumb_path, photo.storage_path])),
  );
  const { data: signedPhotoUrls } =
    photoPaths.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(photoPaths, 60 * 60)
      : { data: [] };
  const signedPhotoUrlByPath = new Map(
    (signedPhotoUrls ?? []).map((row) => [row.path, row.signedUrl]),
  );
  const photosByVisit = new Map<string, VisitPhotoGalleryPhoto[]>();
  for (const photo of visitPhotos) {
    const current = photosByVisit.get(photo.visit_id) ?? [];
    current.push({
      id: photo.id,
      storagePath: photo.storage_path,
      thumbPath: photo.thumb_path,
      thumbUrl: signedPhotoUrlByPath.get(photo.thumb_path) ?? null,
      fullUrl: signedPhotoUrlByPath.get(photo.storage_path) ?? null,
      takenOn: photo.taken_on,
    });
    photosByVisit.set(photo.visit_id, current);
  }

  const growthGroups = Array.from(growthByChild.values()).filter((entries) =>
    entries.some(
      (entry) =>
        Boolean(entry.row.satisfaction) ||
        hasReactionTags(entry.row) ||
        hasOtherNotes(entry.row),
    ),
  );

  return (
    <main className="min-h-screen bg-[#fffaf3]">
    <div className="mx-auto max-w-lg space-y-8 px-4 py-7 sm:py-10">
      <Link
        href="/mypage/visits"
        className="text-slate-400 transition-colors hover:text-slate-600"
      >
        ← おでかけ履歴
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-black tracking-[0.18em] text-amber-600">MEMORIES AT THIS PLACE</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-2xl font-black text-slate-950">
            {facilityName}
          </h1>
          {hasFacilityPage && (
            <Link
              href={`/facilities/${facility.slug}`}
              className="shrink-0 text-sm font-bold text-brand hover:underline"
            >
              施設ページを見る →
            </Link>
          )}
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-slate-950">この施設のおでかけ</h2>
        <div className="grid grid-cols-3 divide-x divide-amber-100 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-amber-100">
          <div className="px-3 py-4">
            <p className="text-xs font-black text-amber-600">訪問回数</p>
            <p className="mt-1 text-sm font-black leading-relaxed text-slate-950">
              {visitCountLabel}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="text-xs font-black text-amber-600">はじめて</p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {firstVisitedOn ? formatVisitedOn(firstVisitedOn) : "未設定"}
            </p>
          </div>
          <div className="px-3 py-4">
            <p className="text-xs font-black text-amber-600">前回</p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {lastVisitedOn ? formatVisitedOn(lastVisitedOn) : "未設定"}
            </p>
          </div>
        </div>
      </section>

      {growthGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-slate-950">子どもごとの成長</h2>
          <div className="space-y-3">
            {growthGroups.map((entries) => {
              const child = getVisitChildProfile(entries[0].row.children);
              const avatarUrl = child?.avatar_url
                ? avatarUrlByPath.get(child.avatar_url) ?? null
                : null;
              return (
                <GrowthSummary
                  key={entries[0].row.child_id}
                  entries={entries}
                  avatarUrl={avatarUrl}
                  growthRecords={growthRows}
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">OUR FAMILY MEMORIES</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">おでかけの記録</h2>
        </div>
        <div className="space-y-4">
          {visitRows.map((visit) => {
            const rows = (childrenByVisit.get(visit.id) ?? []).filter(
              (row) =>
                Boolean(row.satisfaction) || hasReactionTags(row) || hasOtherNotes(row),
            );
            const photos = photosByVisit.get(visit.id) ?? [];
            const memo = compactMemo(visit.parent_memo);
            const isDraft = visit.status === "draft";

            return (
              <article
                key={visit.id}
                className="space-y-4 overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isDraft && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          下書き
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {formatVisitedOn(visit.visited_on)}
                      </span>
                    </div>
                    <Link
                      href={`/mypage/visits/${visit.id}`}
                      className="block text-xl font-black leading-tight text-slate-950 transition-colors hover:text-brand"
                    >
                      {visit.facility_name}
                    </Link>
                  </div>
                  <Link
                    href={`/mypage/visits/${visit.id}`}
                    className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-slate-800"
                  >
                    詳細を見る
                  </Link>
                </div>

                {PHOTO_UPLOAD_ENABLED && photos.length > 0 && (
                  <VisitPhotoGallery
                    visitId={visit.id}
                    initialPhotos={photos}
                    title="写真"
                    deletable={false}
                    variant="grid"
                  />
                )}

                {rows.length > 0 && (
                  <div className="space-y-3">
                    {rows.map((row) => {
                      const child = getVisitChildProfile(row.children);
                      if (!child) return null;
                      const avatarUrl = child.avatar_url
                        ? avatarUrlByPath.get(child.avatar_url) ?? null
                        : null;
                      const growthRecord = findGrowthRecordOnOrBefore(
                        growthRows,
                        row.child_id,
                        visit.visited_on,
                      );
                      return (
                        <VisitChildCard
                          key={row.id}
                          row={row}
                          visitedOn={visit.visited_on}
                          avatarUrl={avatarUrl}
                          approximateHeightCm={
                            growthRecord ? growthRecordHeight(growthRecord) : null
                          }
                        />
                      );
                    })}
                  </div>
                )}

                {memo && (
                  <blockquote className="border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed text-slate-700">
                    「{memo}」
                  </blockquote>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
    </main>
  );
}
