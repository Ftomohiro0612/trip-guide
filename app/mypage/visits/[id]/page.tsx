import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { getFacilityBySlug, isFacilityVisible } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import {
  crowdingLabels,
  expectationLabels,
  familyRevisitLabels,
  fatigueLabels,
  foodLabels,
  parkingLabels,
  timeWasEnoughLabels,
  visitLabel,
  weatherLabels,
} from "@/lib/visit-labels";
import DeleteVisitButton from "../DeleteVisitButton";
import VisitPhotoGallery, {
  type VisitPhotoGalleryPhoto,
} from "./VisitPhotoGallery";
import {
  getVisitChildProfile,
  VisitChildCard,
  type VisitChildCardData,
} from "./VisitChildCard";

export const metadata: Metadata = {
  title: "おでかけ記録詳細",
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
  family_revisit: string | null;
  parent_fatigue: string | null;
  expectation_vs_reality: string | null;
  parent_memo: string | null;
  weather: string | null;
  stay_duration_min: number | null;
  time_was_enough: string | null;
  food_rating: string | null;
  crowding: string | null;
  parking: string | null;
};

type VisitPhoto = {
  id: string;
  storage_path: string;
  thumb_path: string;
  taken_on: string | null;
};

function formatVisitedOn(value: string | null): string {
  if (!value) return "日付未設定";
  return value.replaceAll("-", "/");
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  const durationLabels: Record<number, string> = {
    60: "〜1時間",
    150: "2〜3時間",
    270: "4〜5時間",
    360: "6時間以上",
  };
  return durationLabels[minutes] ?? `${minutes}分`;
}

function chipLabel(labels: Record<string, string>, value: string | null): string | null {
  if (!value) return null;
  const label = visitLabel(labels, value);
  return label === "未記録" ? null : label;
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
  return Boolean(row.interest_other_note?.trim() || row.behavior_other_note?.trim());
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "violet";
}) {
  const className =
    tone === "green"
      ? "rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100"
      : "rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700 ring-1 ring-violet-100";
  return (
    <span className={className}>
      {label}: {value}
    </span>
  );
}

export default async function VisitDetailPage({
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
    redirect(`/auth/login?redirectTo=${encodeURIComponent(`/mypage/visits/${id}`)}`);
  }

  const { data: visit } = await supabase
    .from("visits")
    .select(
      "id, user_id, facility_slug, facility_name, status, visited_on, family_revisit, parent_fatigue, expectation_vs_reality, parent_memo, weather, stay_duration_min, time_was_enough, food_rating, crowding, parking",
    )
    .eq("id", id)
    .maybeSingle();

  if (!visit) notFound();

  const visitRow = visit as Visit;
  if (visitRow.user_id !== user.id) notFound();
  const isDraft = visitRow.status === "draft";

  const { data: visitChildren } = await supabase
    .from("visit_children")
    .select(
      "id, child_id, child_age_at_visit, satisfaction, interest_other_note, behavior_other_note, children(nickname, birth_year, birth_month, avatar_url), visit_child_tags(tag_id, reaction_tags(label))",
    )
    .eq("visit_id", visitRow.id);

  const childRows = (visitChildren ?? []) as VisitChildCardData[];
  const avatarPaths = childRows
    .map((row) => getVisitChildProfile(row.children)?.avatar_url)
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
  const facility = visitRow.facility_slug.startsWith("manual-")
    ? undefined
    : getFacilityBySlug(visitRow.facility_slug);
  const hasFacilityPage = isFacilityVisible(facility);
  let photos: VisitPhotoGalleryPhoto[] = [];

  if (PHOTO_UPLOAD_ENABLED) {
    const { data: photoRows } = await supabase
      .from("visit_photos")
      .select("id, storage_path, thumb_path, taken_on")
      .eq("visit_id", visitRow.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
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
    photos = visitPhotos.map((photo) => ({
      id: photo.id,
      storagePath: photo.storage_path,
      thumbPath: photo.thumb_path,
      thumbUrl: signedPhotoUrlByPath.get(photo.thumb_path) ?? null,
      fullUrl: signedPhotoUrlByPath.get(photo.storage_path) ?? null,
      takenOn: photo.taken_on,
    }));
  }

  const reflectiveChildRows = childRows.filter(
    (row) => Boolean(row.satisfaction) || hasReactionTags(row) || hasOtherNotes(row),
  );
  const revisitLabel = chipLabel(familyRevisitLabels, visitRow.family_revisit);
  const fatigueLabel = chipLabel(fatigueLabels, visitRow.parent_fatigue);
  const optionalSummaryItems = [
    { label: "天気", value: chipLabel(weatherLabels, visitRow.weather) },
    { label: "混雑", value: chipLabel(crowdingLabels, visitRow.crowding) },
    { label: "アクセス・移動", value: chipLabel(parkingLabels, visitRow.parking) },
    { label: "滞在時間", value: formatDuration(visitRow.stay_duration_min) },
    {
      label: "時間は足りたか",
      value: chipLabel(timeWasEnoughLabels, visitRow.time_was_enough),
    },
    { label: "ごはん・食事", value: chipLabel(foodLabels, visitRow.food_rating) },
    {
      label: "期待との比較",
      value: chipLabel(expectationLabels, visitRow.expectation_vs_reality),
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
  const hasPrimarySummary = Boolean(revisitLabel || fatigueLabel);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link
        href="/mypage/visits"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← 履歴に戻る
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 break-words">
              <Link
                href={`/mypage/visits/facility/${visitRow.facility_slug}`}
                className="hover:text-brand transition-colors"
              >
                {visitRow.facility_name}
              </Link>
            </h1>
            {isDraft && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  下書き
                </span>
                <Link
                  href={`/mypage/visits/${visitRow.id}/edit`}
                  className="text-xs font-bold text-brand hover:underline"
                >
                  編集して公開
                </Link>
              </div>
            )}
            {hasFacilityPage ? (
              <Link
                href={`/facilities/${facility.slug}`}
                className="mt-1 inline-block text-sm text-brand hover:underline"
              >
                施設ページを見る →
              </Link>
            ) : facility ? (
              <p className="mt-1 text-sm text-slate-400">
                施設ページは現在公開していません
              </p>
            ) : null}
          </div>
          <span className="shrink-0 text-xs text-slate-400">
            {formatVisitedOn(visitRow.visited_on)}
          </span>
        </div>
      </header>

      {PHOTO_UPLOAD_ENABLED && photos.length > 0 && (
        <VisitPhotoGallery
          visitId={visitRow.id}
          initialPhotos={photos}
          deletable={false}
          variant="large"
        />
      )}

      {reflectiveChildRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-800">子どもの反応</h2>
          <div className="space-y-3">
            {reflectiveChildRows.map((row) => {
              const child = getVisitChildProfile(row.children);
              if (!child) return null;
              const avatarUrl = child.avatar_url
                ? avatarUrlByPath.get(child.avatar_url) ?? null
                : null;
              return (
                <VisitChildCard
                  key={row.id}
                  row={row}
                  visitedOn={visitRow.visited_on}
                  avatarUrl={avatarUrl}
                />
              );
            })}
          </div>
        </section>
      )}

      {(hasPrimarySummary || optionalSummaryItems.length > 0) && (
        <section className="space-y-3">
          <h2 className="font-bold text-slate-800">評価サマリ</h2>
          {hasPrimarySummary && (
            <div className="flex flex-wrap gap-2">
              {revisitLabel && (
                <SummaryChip label="また行きたい" value={revisitLabel} tone="green" />
              )}
              {fatigueLabel && (
                <SummaryChip label="親の疲れ度" value={fatigueLabel} tone="violet" />
              )}
            </div>
          )}
          {optionalSummaryItems.length > 0 && (
            <dl className="grid gap-2 sm:grid-cols-2">
              {optionalSummaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <dt className="text-xs font-bold text-slate-400">{item.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-800">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {visitRow.parent_memo?.trim() && (
        <section className="space-y-2">
          <h2 className="font-bold text-slate-800">メモ</h2>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {visitRow.parent_memo}
            </p>
          </div>
        </section>
      )}

      <div className="space-y-3 pt-2">
        <Link
          href={`/mypage/visits/${visitRow.id}/edit`}
          className="block w-full py-3 bg-brand text-white text-center text-sm font-bold rounded-xl hover:bg-brand-dark transition-colors"
        >
          編集する
        </Link>
        <div className="text-right">
          <DeleteVisitButton
            visitId={visitRow.id}
            facilityName={visitRow.facility_name}
            redirectTo="/mypage/visits"
            variant="subtle"
          />
        </div>
      </div>
    </div>
  );
}
