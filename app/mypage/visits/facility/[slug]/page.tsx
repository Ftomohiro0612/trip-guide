import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ChildAvatar from "@/components/ChildAvatar";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { getFacilityBySlug, isFacilityVisible } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import { satisfactionLabels } from "@/lib/visit-labels";
import VisitPhotoGallery, {
  type VisitPhotoGalleryPhoto,
} from "../../[id]/VisitPhotoGallery";
import {
  getVisitChildProfile,
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
}: {
  entries: ChildGrowthEntry[];
  avatarUrl: string | null;
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

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <ChildAvatar
          childId={entries[0].row.child_id}
          nickname={firstChild.nickname}
          avatarUrl={avatarUrl}
          size="md"
        />
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 truncate">{firstChild.nickname}</h3>
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
      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        <Link
          href="/mypage/visits"
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          ← おでかけ履歴
        </Link>
        <header className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900">{facilityName}</h1>
        </header>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">
            この施設のおでかけ記録はまだありません
          </p>
          <Link
            href="/mypage/visits"
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            履歴へ戻る
          </Link>
        </div>
      </div>
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
              "id, visit_id, child_id, child_age_at_visit, satisfaction, children(nickname, birth_year, birth_month, avatar_url), visit_child_tags(tag_id, reaction_tags(label))",
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
    entries.some((entry) => Boolean(entry.row.satisfaction) || hasReactionTags(entry.row)),
  );

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <Link
        href="/mypage/visits"
        className="text-slate-400 transition-colors hover:text-slate-600"
      >
        ← おでかけ履歴
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 break-words text-xl font-bold text-slate-900">
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

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">この施設のおでかけ</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-bold text-slate-400">訪問回数</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
              {visitCountLabel}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-bold text-slate-400">はじめて</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {firstVisitedOn ? formatVisitedOn(firstVisitedOn) : "未設定"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-bold text-slate-400">前回</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {lastVisitedOn ? formatVisitedOn(lastVisitedOn) : "未設定"}
            </p>
          </div>
        </div>
      </section>

      {growthGroups.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-800">子どもごとの成長</h2>
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
                />
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">おでかけの記録</h2>
        <div className="space-y-4">
          {visitRows.map((visit) => {
            const rows = (childrenByVisit.get(visit.id) ?? []).filter(
              (row) => Boolean(row.satisfaction) || hasReactionTags(row),
            );
            const photos = photosByVisit.get(visit.id) ?? [];
            const memo = compactMemo(visit.parent_memo);
            const isDraft = visit.status === "draft";

            return (
              <article
                key={visit.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
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
                      className="block font-bold text-slate-900 transition-colors hover:text-brand"
                    >
                      {visit.facility_name}
                    </Link>
                  </div>
                  <Link
                    href={`/mypage/visits/${visit.id}`}
                    className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
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
                      return (
                        <VisitChildCard
                          key={row.id}
                          row={row}
                          visitedOn={visit.visited_on}
                          avatarUrl={avatarUrl}
                        />
                      );
                    })}
                  </div>
                )}

                {memo && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {memo}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
