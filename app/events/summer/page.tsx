import type { Metadata } from "next";
import Link from "next/link";
import AffiliateExperienceCta from "@/components/AffiliateExperienceCta";
import {
  SummerAccessSummary,
  SummerEventMapSection,
  SummerHeroGroups,
} from "@/components/SummerDateContent";
import SummerEventExplorer from "@/components/SummerEventExplorer";
import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import {
  getBuildDateString,
  getVisibleSummerHubEvents,
  SUMMER_HERO_EVENT_IDS,
  SUMMER_HUB_MAX_AGE_DAYS,
  toEventView,
} from "@/lib/events";
import { buildSummerEventListJsonLd } from "@/lib/summer-event-hub";
import { buildSummerEventMapPoints } from "@/lib/summer-event-locations";
import { getSummerCrosslinkData } from "@/lib/summer-crosslink-data";

export const metadata: Metadata = {
  title: "夏祭り・花火大会2026｜全国47都道府県",
  description:
    "全国47都道府県の2026年夏祭り・花火大会を公式一次情報から掲載。指定期間、予約状況、都道府県、種類、無料で探せます。",
  alternates: { canonical: "/events/summer" },
  openGraph: {
    title: "夏祭り・花火大会2026｜メモリップ",
    description:
      "全国47都道府県の花火大会と夏祭りを、開催日の近い順から探せます。",
    url: "/events/summer",
  },
};

const SUMMER_HERO_TITLE = "全国の夏祭り・花火大会2026";

export default function SummerEventsPage() {
  const today = getBuildDateString(new Date());
  const visibleEvents = getVisibleSummerHubEvents(today);
  const views = visibleEvents.map((event) => toEventView(event, today));
  const mapPoints = buildSummerEventMapPoints(visibleEvents, today);
  const crosslinks = getSummerCrosslinkData(today);
  const eventListJsonLd = buildSummerEventListJsonLd(
    views.flatMap((view) =>
      view.venueName
        ? [
            {
              id: view.event.id,
              title: view.event.title,
              start_date: view.event.start_date,
              end_date: view.event.end_date,
              occurrence_dates: view.event.occurrence_dates,
              official_url: view.event.official_url,
              venue_name: view.venueName,
              prefecture_label: view.prefectureLabel,
            },
          ]
        : [],
    ),
  );

  return (
    <div className="bg-slate-50">
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: "イベント", href: "/events" },
          { name: "夏祭り・花火大会2026" },
        ]}
      />
      <JsonLd data={eventListJsonLd} />

      <section className="overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14 lg:py-16">
          <nav aria-label="パンくず" className="mb-5 text-xs text-indigo-100">
            <Link href="/" className="hover:text-white hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/events" className="hover:text-white hover:underline">
              イベント
            </Link>
            <span className="mx-1.5">/</span>
            <span>夏祭り・花火大会2026</span>
          </nav>
          <p className="text-sm font-bold text-amber-200">2026年・公式一次情報を確認</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            {SUMMER_HERO_TITLE}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-indigo-50 sm:text-base">
            花火大会と地域の夏祭りを主役に、開催中・開催日が近い順で掲載しています。夜間開園は別の補助枠に分けています。
          </p>
          <Link
            href="/events"
            className="mt-4 inline-flex text-sm font-bold text-amber-100 underline decoration-amber-200/60 underline-offset-4 hover:text-white"
          >
            展示・体験など、すべてのイベントを見る →
          </Link>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-bold">
            <a
              href="#summer-fireworks-heading"
              className="rounded-full bg-white px-4 py-2 text-indigo-950"
            >
              花火大会を見る
            </a>
            <a
              href="#summer-summer_festival-heading"
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white"
            >
              夏祭りを見る
            </a>
            <a
              href="#summer-event-map"
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white"
            >
              地図で探す
            </a>
            <a
              href="#summer-filters"
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white"
            >
              条件から探す
            </a>
          </div>
          <SummerAccessSummary
            views={views}
            maxAgeDays={SUMMER_HUB_MAX_AGE_DAYS}
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-9 sm:py-12">
        <SummerHeroGroups
          views={views}
          heroEventIds={SUMMER_HERO_EVENT_IDS}
          maxAgeDays={SUMMER_HUB_MAX_AGE_DAYS}
          referenceDate={today}
        />

        <SummerEventMapSection
          views={views}
          points={mapPoints}
          maxAgeDays={SUMMER_HUB_MAX_AGE_DAYS}
        />

        <div className="mt-12">
          <SummerEventExplorer
            views={views}
            eventFacilityRecommendations={crosslinks.eventToFacilities}
            maxAgeDays={SUMMER_HUB_MAX_AGE_DAYS}
            referenceDate={today}
          />
        </div>

        <AffiliateExperienceCta placement="events_summer" />

        <aside className="mt-12 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">展示・ワークショップも探す</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            このページは夏祭り・花火を中心に抽出しています。展示、工作、科学イベントなどは汎用イベント一覧で探せます。
          </p>
          <Link
            href="/events"
            className="mt-4 inline-flex text-sm font-bold text-brand hover:underline"
          >
            すべてのイベントを見る →
          </Link>
        </aside>
      </div>
    </div>
  );
}
