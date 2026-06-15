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
  family_revisit: string;
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

function formatDuration(minutes: number | null): string {
  if (!minutes) return "未記録";
  const durationLabels: Record<number, string> = {
    60: "〜1時間",
    150: "2〜3時間",
    270: "4〜5時間",
    360: "6時間以上",
  };
  return durationLabels[minutes] ?? `${minutes}分`;
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">
        {value || "未記録"}
      </dd>
    </div>
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
      "id, child_id, child_age_at_visit, satisfaction, children(nickname, birth_year, birth_month, avatar_url), visit_child_tags(tag_id, reaction_tags(label))",
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
              {visitRow.facility_name}
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

      <section className="bg-white border border-slate-200 rounded-xl px-4 py-3">
        <dl>
          <DetailRow label="訪問日" value={formatVisitedOn(visitRow.visited_on)} />
          <DetailRow
            label="また行きたい"
            value={visitLabel(familyRevisitLabels, visitRow.family_revisit)}
          />
          <DetailRow
            label="親の疲れ度"
            value={visitLabel(fatigueLabels, visitRow.parent_fatigue)}
          />
          <DetailRow
            label="天気"
            value={visitLabel(weatherLabels, visitRow.weather)}
          />
          <DetailRow
            label="混雑度"
            value={visitLabel(crowdingLabels, visitRow.crowding)}
          />
          <DetailRow
            label="アクセス・移動"
            value={visitLabel(parkingLabels, visitRow.parking)}
          />
          <DetailRow label="滞在時間" value={formatDuration(visitRow.stay_duration_min)} />
          <DetailRow
            label="時間は足りたか"
            value={visitLabel(timeWasEnoughLabels, visitRow.time_was_enough)}
          />
          <DetailRow
            label="ごはん・食事"
            value={visitLabel(foodLabels, visitRow.food_rating)}
          />
          <DetailRow
            label="期待との比較"
            value={visitLabel(expectationLabels, visitRow.expectation_vs_reality)}
          />
        </dl>
      </section>

      {PHOTO_UPLOAD_ENABLED && photos.length > 0 && (
        <VisitPhotoGallery visitId={visitRow.id} initialPhotos={photos} />
      )}

      <section className="space-y-3">
        <h2 className="font-bold text-slate-800">子ども別満足度</h2>
        {childRows.length > 0 ? (
          <div className="space-y-3">
            {childRows.map((row) => {
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
        ) : (
          <p className="text-sm text-slate-400">子ども別の記録はありません</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-slate-800">メモ</h2>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {visitRow.parent_memo || "未記録"}
          </p>
        </div>
      </section>

      <div className="flex gap-2 pt-2">
        <Link
          href={`/mypage/visits/${visitRow.id}/edit`}
          className="flex-1 py-3 bg-brand text-white text-center text-sm font-bold rounded-xl hover:bg-brand-dark transition-colors"
        >
          編集する
        </Link>
        <DeleteVisitButton
          visitId={visitRow.id}
          facilityName={visitRow.facility_name}
          redirectTo="/mypage/visits"
        />
      </div>
    </div>
  );
}
