import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import SummerEventExplorer from "@/components/SummerEventExplorer";
import { BreadcrumbJsonLd, JsonLd } from "@/components/JsonLd";
import {
  getBuildDateString,
  getNextEventDate,
  getSummerHeroEvents,
  getVisibleSummerHubEvents,
  toEventView,
  type EventItem,
  type SummerEventType,
} from "@/lib/events";

export const metadata: Metadata = {
  title: "夏祭り・花火大会2026｜東京・神奈川・千葉・埼玉",
  description:
    "東京・神奈川・千葉・埼玉の2026年夏祭り・花火大会を公式一次情報から掲載。開催日順、都県、今週末、無料、予約不要で探せます。",
  alternates: { canonical: "/events/summer" },
  openGraph: {
    title: "夏祭り・花火大会2026｜メモリップ",
    description:
      "東京・神奈川・千葉・埼玉の花火大会と夏祭りを開催日の近い順から探せます。",
    url: "/events/summer",
  },
};

interface Props {
  searchParams: Promise<{ type?: string; quick?: string }>;
}

const TYPE_LABELS: Record<SummerEventType, string> = {
  fireworks: "花火大会",
  summer_festival: "夏祭り・盆踊り",
  summer_tradition: "縁日・灯籠・風鈴",
  night_outing: "夜のおでかけ",
};

export default async function SummerEventsPage({ searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const today = getBuildDateString(new Date());
  const visibleEvents = getVisibleSummerHubEvents(today);
  const views = visibleEvents.map((event) => toEventView(event, today));
  const heroPool = getSummerHeroEvents(today, 12);
  const heroFireworks = heroPool
    .filter((event) => event.event_type === "fireworks")
    .slice(0, 4);
  const heroFestivals = heroPool
    .filter((event) => event.event_type === "summer_festival")
    .slice(0, 4);
  const initialType = isSummerEventType(query.type) ? query.type : undefined;
  const initialQuickFilter =
    query.quick === "weekend" ||
    query.quick === "free" ||
    query.quick === "noReservation"
      ? query.quick
      : undefined;
  const mainCount = visibleEvents.filter(
    (event) =>
      event.event_type === "fireworks" ||
      event.event_type === "summer_festival",
  ).length;

  const eventListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "東京・神奈川・千葉・埼玉の夏祭り・花火大会2026",
    numberOfItems: visibleEvents.length,
    itemListElement: visibleEvents.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Event",
        name: event.title,
        startDate: event.start_date,
        endDate: event.end_date,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
          "@type": "Place",
          name: event.venue_name ?? "公式会場",
          address: prefectureLabel(event.prefecture),
        },
        url: event.official_url,
      },
    })),
  };

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
            東京・神奈川・千葉・埼玉の夏祭り・花火大会2026
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-indigo-50 sm:text-base">
            花火大会と地域の夏祭りを主役に、開催中・次回開催日の近い順で掲載しています。夜間開園は別の補助枠に分けています。
          </p>
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
              href="#summer-filters"
              className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white"
            >
              条件から探す
            </a>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-indigo-100 sm:text-sm">
            <span>公開中 {visibleEvents.length}件</span>
            <span>花火・夏祭り {mainCount}件</span>
            <span>基準日 {today}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-9 sm:py-12">
        {heroFireworks.length > 0 ? (
          <HeroGroup
            heading="まもなく開催する花火大会"
            events={heroFireworks}
            today={today}
          />
        ) : null}
        {heroFestivals.length > 0 ? (
          <div className="mt-10">
            <HeroGroup
              heading="まもなく開催する夏祭り・盆踊り"
              events={heroFestivals}
              today={today}
            />
          </div>
        ) : null}

        <div className="mt-12">
          <SummerEventExplorer
            views={views}
            initialType={initialType}
            initialQuickFilter={initialQuickFilter}
          />
        </div>

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

function HeroGroup({
  heading,
  events,
  today,
}: {
  heading: string;
  events: EventItem[];
  today: string;
}) {
  return (
    <section aria-labelledby={`${events[0].event_type}-hero-heading`}>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-indigo-600">次回開催日が近い順</p>
          <h2
            id={`${events[0].event_type}-hero-heading`}
            className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl"
          >
            {heading}
          </h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <article
            key={event.id}
            data-summer-hero-event={event.id}
            className="flex min-h-56 flex-col rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {event.event_type ? TYPE_LABELS[event.event_type] : "夏イベント"}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {prefectureLabel(event.prefecture)}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">
              {event.title}
            </h3>
            <p className="mt-2 text-sm font-bold text-indigo-700">
              次回 {formatDate(getNextEventDate(event, today))}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {event.venue_name ?? "公式会場"}
            </p>
            <a
              href={event.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-4 text-sm font-bold text-brand hover:underline"
            >
              公式情報を見る →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function isSummerEventType(value: string | undefined): value is SummerEventType {
  return (
    value === "fireworks" ||
    value === "summer_festival" ||
    value === "summer_tradition" ||
    value === "night_outing"
  );
}

function prefectureLabel(prefecture: EventItem["prefecture"]): string {
  const labels: Partial<Record<EventItem["prefecture"], string>> = {
    tokyo: "東京都",
    kanagawa: "神奈川県",
    chiba: "千葉県",
    saitama: "埼玉県",
  };
  return labels[prefecture] ?? prefecture;
}

function formatDate(value: string | null): string {
  if (!value) return "公式確認中";
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}
