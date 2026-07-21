import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventFilterBar from "@/components/EventFilterBar";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import {
  eventPrefectures,
  getBuildDateString,
  getVisibleEventsByPrefecture,
  isEventPrefecture,
  toEventView,
} from "@/lib/events";
import { getPrefectureMeta } from "@/lib/facilities";

interface Props {
  params: Promise<{ prefecture: string }>;
}

export function generateStaticParams() {
  return eventPrefectures.map((prefecture) => ({ prefecture }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefecture } = await params;
  if (!isEventPrefecture(prefecture)) {
    return { title: "見つかりませんでした" };
  }
  const meta = getPrefectureMeta(prefecture);
  const count = getVisibleEventsByPrefecture(prefecture).length;

  return {
    title: `${meta?.name ?? "対象エリア"}の子ども向けイベント ${count}件`,
    description: `${meta?.name ?? "対象エリア"}で子どもと行けるイベントを、公式情報で確認できたものだけ掲載しています。日程・料金は各公式サイトでご確認ください。`,
    alternates: { canonical: `/events/${prefecture}` },
  };
}

export default async function PrefectureEventsPage({ params }: Props) {
  const { prefecture } = await params;
  if (!isEventPrefecture(prefecture)) notFound();

  const meta = getPrefectureMeta(prefecture);
  if (!meta) notFound();

  const today = getBuildDateString();
  const visibleEvents = getVisibleEventsByPrefecture(prefecture, today);
  const eventViews = visibleEvents.map((event) => toEventView(event, today));

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: "イベント", href: "/events" },
          { name: `${meta.name}のイベント` },
        ]}
      />
      <ItemListJsonLd
        name={`${meta.name}の子ども向けイベント`}
        items={visibleEvents.map((event) => ({
          name: event.title,
          href: `/events/${prefecture}`,
        }))}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
            <Link href="/" className="hover:text-brand hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <Link href="/events" className="hover:text-brand hover:underline">
              イベント
            </Link>
            <span className="mx-1.5">/</span>
            <span>{meta.name}</span>
          </nav>
          <p className="text-sm font-bold text-brand">公式確認済みイベント</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {meta.name}の子ども向けイベント
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            公式サイトで確認できたイベントだけを掲載し、終了したものは自動的に表示されなくなります。日程・料金の最新情報は各公式サイトでご確認ください。
          </p>
          <p className="mt-3 text-xs font-medium text-slate-500">
            掲載中 {visibleEvents.length}件
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {eventViews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            現在掲載中のイベントはありません。
          </div>
        ) : (
          <EventFilterBar
            views={eventViews}
            showPrefectureFilter={false}
            showPrefectureOnCard={false}
            referenceDate={today}
          />
        )}

        <div className="mt-8">
          <Link
            href="/events"
            className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
          >
            他のエリアを見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
