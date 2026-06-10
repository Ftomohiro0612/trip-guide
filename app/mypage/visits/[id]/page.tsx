import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFacilityBySlug } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import DeleteVisitButton from "../DeleteVisitButton";
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

const familyRevisitLabels: Record<string, string> = {
  yes: "また行きたい",
  conditional: "条件次第",
  once_enough: "一度で十分",
  no: "もう行かない",
};

const fatigueLabels: Record<string, string> = {
  easy: "楽だった",
  normal: "普通",
  tired: "少し疲れた",
  exhausted: "かなり疲れた",
};

const weatherLabels: Record<string, string> = {
  sunny: "晴れ",
  cloudy: "曇り",
  rainy: "雨",
  snowy: "雪",
  unknown: "覚えていない",
};

const crowdingLabels: Record<string, string> = {
  empty: "空いていた",
  normal: "普通",
  busy: "混んでいた",
  very_busy: "かなり混んでいた",
  unknown: "覚えていない",
};

const parkingLabels: Record<string, string> = {
  car_easy: "車：駐車場に余裕あり",
  car_normal: "車：駐車場ふつう",
  car_trouble: "車：駐車場で困った",
  train: "電車で行った",
  bus: "バスで行った",
  walk_bike: "徒歩・自転車で行った",
};

const timeLabels: Record<string, string> = {
  enough: "十分だった",
  want_more: "足りなかった",
  too_long: "長かった",
};

const foodLabels: Record<string, string> = {
  no_meal: "食事なし",
  ate_inside: "施設内で食べた",
  brought_food: "持参した",
  ate_outside: "外で食べた",
  had_trouble: "食事で困った",
};

const expectationLabels: Record<string, string> = {
  exceeded: "期待以上",
  met: "ほぼ期待通り",
  below: "期待以下",
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
      "id, user_id, facility_slug, facility_name, visited_on, family_revisit, parent_fatigue, expectation_vs_reality, parent_memo, weather, stay_duration_min, time_was_enough, food_rating, crowding, parking",
    )
    .eq("id", id)
    .maybeSingle();

  if (!visit) notFound();

  const visitRow = visit as Visit;
  if (visitRow.user_id !== user.id) notFound();

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
            {facility && (
              <Link
                href={`/facilities/${facility.slug}`}
                className="mt-1 inline-block text-sm text-brand hover:underline"
              >
                施設ページを見る →
              </Link>
            )}
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
            value={familyRevisitLabels[visitRow.family_revisit] ?? visitRow.family_revisit}
          />
          <DetailRow
            label="親の疲れ度"
            value={
              visitRow.parent_fatigue
                ? fatigueLabels[visitRow.parent_fatigue] ?? visitRow.parent_fatigue
                : null
            }
          />
          <DetailRow
            label="天気"
            value={
              visitRow.weather
                ? weatherLabels[visitRow.weather] ?? visitRow.weather
                : null
            }
          />
          <DetailRow
            label="混雑度"
            value={
              visitRow.crowding
                ? crowdingLabels[visitRow.crowding] ?? visitRow.crowding
                : null
            }
          />
          <DetailRow
            label="アクセス・移動"
            value={
              visitRow.parking
                ? parkingLabels[visitRow.parking] ?? visitRow.parking
                : null
            }
          />
          <DetailRow label="滞在時間" value={formatDuration(visitRow.stay_duration_min)} />
          <DetailRow
            label="時間は足りたか"
            value={
              visitRow.time_was_enough
                ? timeLabels[visitRow.time_was_enough] ?? visitRow.time_was_enough
                : null
            }
          />
          <DetailRow
            label="ごはん・食事"
            value={
              visitRow.food_rating
                ? foodLabels[visitRow.food_rating] ?? visitRow.food_rating
                : null
            }
          />
          <DetailRow
            label="期待との比較"
            value={
              visitRow.expectation_vs_reality
                ? expectationLabels[visitRow.expectation_vs_reality] ??
                  visitRow.expectation_vs_reality
                : null
            }
          />
        </dl>
      </section>

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
