import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { getEventPrefectureLabel } from "@/lib/events";
import { isRegionId } from "@/lib/regions";
import {
  availableSilverWeekRegions,
  getSilverWeekRegionCollection,
  type SilverWeekEventPick,
  type SilverWeekFacilityPick,
} from "@/lib/silver-week";

export const metadata: Metadata = {
  title: "シルバーウィーク2026｜地域別のおでかけ特集",
  description:
    "シルバーウィークに行く理由がある施設・イベントを、全国7地域から選んでテーマ別に紹介します。",
  alternates: { canonical: "/events/silver-week" },
  openGraph: {
    title: "シルバーウィーク2026｜地域別のおでかけ特集",
    description:
      "地域を選んで、雨でも楽しめる場所、連休イベント、一日遊べる施設、無料のおでかけ先を探せます。",
    url: "/events/silver-week",
  },
};

interface SilverWeekPageProps {
  searchParams: Promise<{ region?: string | string[] }>;
}

export default async function SilverWeekPage({
  searchParams,
}: SilverWeekPageProps) {
  const rawRegion = (await searchParams).region;
  const requestedRegion = typeof rawRegion === "string" ? rawRegion : undefined;
  const regionId =
    requestedRegion && isRegionId(requestedRegion)
      ? requestedRegion
      : undefined;
  const collection = regionId
    ? getSilverWeekRegionCollection(regionId)
    : undefined;

  return (
    <div className="min-h-screen bg-amber-50/40">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: "イベント", href: "/events" },
          { name: "シルバーウィーク2026" },
        ]}
      />

      <section className="overflow-hidden bg-gradient-to-br from-orange-950 via-amber-800 to-rose-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 lg:py-16">
          <nav aria-label="パンくず" className="mb-5 text-xs text-amber-100">
            <Link href="/" className="hover:text-white hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/events" className="hover:text-white hover:underline">
              イベント
            </Link>
            <span className="mx-1.5">/</span>
            <span>シルバーウィーク2026</span>
          </nav>
          <p className="text-sm font-bold text-amber-200">
            2026年9月19日〜23日・地域別編集
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            この連休、どこへ行く？
            <span className="block text-amber-100">地域から選ぶシルバーウィーク</span>
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-amber-50 sm:text-base">
            全国の候補を一列に並べず、身近な地域から。雨の日、期間限定イベント、一日コース、無料のおでかけを、行く理由と一緒に厳選しました。
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-9 sm:py-12">
        <section aria-labelledby="region-selector-heading">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-amber-800">STEP 1</p>
            <h2
              id="region-selector-heading"
              className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              {collection ? "地域を切り替える" : "おでかけする地域を選ぶ"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              地域を選ぶと、この連休に行く理由がある候補をテーマ別にご紹介します。
            </p>
          </div>

          {requestedRegion && !collection ? (
            <p
              role="status"
              className="mt-5 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-900"
            >
              指定された地域は見つかりませんでした。下の地域から選び直してください。
            </p>
          ) : null}

          <div
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            data-silver-week-region-selector
          >
            {availableSilverWeekRegions.map((region) => {
              const active = collection?.region.id === region.id;
              return (
                <Link
                  key={region.id}
                  href={{
                    pathname: "/events/silver-week",
                    query: { region: region.id },
                  }}
                  aria-current={active ? "page" : undefined}
                  data-silver-week-region={region.id}
                  className={`group rounded-2xl border p-4 transition-all ${
                    active
                      ? "border-amber-700 bg-amber-800 text-white shadow-lg shadow-amber-200"
                      : "border-amber-200 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                  }`}
                >
                  <span className="text-lg font-bold">{region.name}</span>
                  <span
                    className={`mt-2 block text-xs leading-relaxed ${
                      active ? "text-amber-100" : "text-slate-500"
                    }`}
                  >
                    {region.prefectures.map((prefecture) => prefecture.name).join("・")}
                  </span>
                  <span
                    className={`mt-3 inline-flex text-sm font-bold ${
                      active ? "text-white" : "text-amber-800"
                    }`}
                  >
                    {active ? "選択中" : "この地域を見る →"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {collection ? (
          <div
            className="mt-12"
            data-silver-week-results={collection.region.id}
          >
            <div className="border-b border-amber-200 pb-6">
              <p className="text-sm font-bold text-amber-800">STEP 2</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
                {collection.region.name}の編集セレクション
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                条件に合う全件ではなく、画像の有無や内容の充実度、地域内のバランスを見て、この連休に選びたい候補だけを掲載しています。
              </p>
            </div>

            <div className="mt-10 grid gap-14">
              <FacilityThemeSection
                id="rainy"
                eyebrow="天気が変わっても選びやすい"
                title="雨でも楽しめる"
                description="雨対応が「◎」と確認できる施設から、屋内性と体験内容を見て選びました。"
                picks={collection.rainy}
              />
              <EventThemeSection picks={collection.events} />
              <FacilityThemeSection
                id="all-day"
                eyebrow="予定を細かく組まなくても大丈夫"
                title="1日遊べる"
                description="施設ジャンル、紹介文、現地でできることの数から、滞在の選択肢が多い施設を選びました。"
                picks={collection.allDay}
              />
              <FacilityThemeSection
                id="budget"
                eyebrow="出費を抑えてもう一か所"
                title="無料・低予算"
                description="利用無料、またはデータ上で「無料」と確認できる施設から選びました。"
                picks={collection.budget}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function FacilityThemeSection({
  id,
  eyebrow,
  title,
  description,
  picks,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  picks: SilverWeekFacilityPick[];
}) {
  return (
    <section
      aria-labelledby={`silver-week-${id}-heading`}
      data-silver-week-theme={id}
      data-silver-week-card-count={picks.length}
    >
      <ThemeHeading
        id={`silver-week-${id}-heading`}
        eyebrow={eyebrow}
        title={title}
        description={description}
        count={picks.length}
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map((pick) => (
          <FacilityFeatureCard key={pick.facility.id} pick={pick} theme={id} />
        ))}
      </div>
    </section>
  );
}

function EventThemeSection({ picks }: { picks: SilverWeekEventPick[] }) {
  return (
    <section
      aria-labelledby="silver-week-events-heading"
      data-silver-week-theme="events"
      data-silver-week-card-count={picks.length}
    >
      <ThemeHeading
        id="silver-week-events-heading"
        eyebrow="2026年9月19日〜23日に開催"
        title="連休イベント"
        description="シルバーウィーク期間と会期が重なり、公開中の公式案内があるイベントを選びました。"
        count={picks.length}
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {picks.map((pick) => (
          <EventFeatureCard key={pick.event.id} pick={pick} />
        ))}
      </div>
    </section>
  );
}

function ThemeHeading({
  id,
  eyebrow,
  title,
  description,
  count,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-amber-800">{eyebrow}</p>
      <div className="mt-1 flex items-center gap-3">
        <h2 id={id} className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
          {count}件
        </span>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

function FacilityFeatureCard({
  pick,
  theme,
}: {
  pick: SilverWeekFacilityPick;
  theme: string;
}) {
  const { facility, reason } = pick;
  return (
    <article
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
      data-silver-week-card="facility"
      data-silver-week-theme-card={theme}
      data-facility-id={facility.id}
      data-rain-friendly={facility.rain_friendly}
      data-is-free={facility.is_free ? "true" : "false"}
      data-things-to-do-count={facility.things_to_do?.length ?? 0}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100">
        {facility.image ? (
          <Image
            src={facility.image}
            alt={facility.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl" aria-hidden>
            🍁
          </div>
        )}
      </div>
      <div className="flex flex-col p-4">
        <p className="text-xs font-bold text-slate-500">
          {facility.prefecture} ・ {facility.category}
        </p>
        <h3 className="mt-1 text-lg font-bold leading-snug text-slate-900">
          {facility.name}
        </h3>
        <p
          className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-bold leading-relaxed text-amber-950"
          data-silver-week-reason
        >
          {reason}
        </p>
        <Link
          href={`/facilities/${facility.slug}`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-bold text-white hover:bg-amber-800"
        >
          施設の詳細を見る →
        </Link>
      </div>
    </article>
  );
}

function EventFeatureCard({ pick }: { pick: SilverWeekEventPick }) {
  const { event, reason } = pick;
  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      data-silver-week-card="event"
      data-event-id={event.id}
      data-event-start-date={event.start_date ?? undefined}
      data-event-end-date={event.end_date ?? undefined}
      data-event-status={event.status}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-800">
          {event.date_label}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
          {getEventPrefectureLabel(event.prefecture)}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-bold leading-snug text-slate-900">
        {event.title}
      </h3>
      <p
        className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-bold leading-relaxed text-amber-950"
        data-silver-week-reason
      >
        {reason}
      </p>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
        {event.summary}
      </p>
      <a
        href={event.official_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-bold text-white hover:bg-amber-800"
      >
        公式情報を確認する ↗
      </a>
    </article>
  );
}
