import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import EventFilterBar from "@/components/EventFilterBar";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import {
  eventPrefectures,
  getBuildDateString,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";
import type { EventPrefecture } from "@/lib/events";
import {
  getFacilitiesByPrefecture,
  getPrefectureMeta,
} from "@/lib/facilities";
import { prefectureIconImages } from "@/lib/icons";

export const metadata: Metadata = {
  title: "東京・神奈川・山梨・千葉・埼玉・茨城の子ども向けイベント",
  description:
    "東京・神奈川・山梨・千葉・埼玉・茨城の子どもと行けるイベントを、公式情報で確認できたものだけ掲載しています。",
  alternates: { canonical: "/events" },
};

export default function EventsIndexPage() {
  const today = getBuildDateString();
  const visibleEvents = getVisibleEvents(today);
  const eventViews = visibleEvents.map((event) => toEventView(event, today));
  const eventCountByPrefecture = new Map(
    eventPrefectures.map((prefecture) => [
      prefecture,
      visibleEvents.filter((event) => event.prefecture === prefecture).length,
    ]),
  );
  const prefectureOptions = eventPrefectures
    .map((prefectureId) => {
      const meta = getPrefectureMeta(prefectureId);
      return meta ? { id: prefectureId, name: meta.name } : null;
    })
    .filter(
      (item): item is { id: EventPrefecture; name: string } => Boolean(item),
    );

  return (
    <div>
      <BreadcrumbJsonLd
        items={[{ name: "ホーム", href: "/" }, { name: "イベント" }]}
      />
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
            <Link href="/" className="hover:text-brand hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <span>イベント</span>
          </nav>
          <p className="text-sm font-bold text-brand">公式確認済みイベント</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            子どもと行けるイベントを、エリアや“好き”から探す
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            日程・料金は変わることがあります。最新は各公式サイトでご確認ください。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {eventPrefectures.map((prefectureId) => {
            const meta = getPrefectureMeta(prefectureId);
            if (!meta) return null;
            const eventCount = eventCountByPrefecture.get(prefectureId) ?? 0;
            const facilityCount = getFacilitiesByPrefecture(prefectureId).length;

            return (
              <Link
                key={prefectureId}
                href={`/events/${prefectureId}`}
                className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand hover:bg-sky-50/40"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={prefectureIconImages[prefectureId]}
                    alt=""
                    width={56}
                    height={56}
                    className="h-12 w-12 shrink-0 object-contain"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 group-hover:text-brand">
                      {meta.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      掲載中 {eventCount}件 / 登録施設 {facilityCount}件
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-brand">
                  イベントを見る →
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-10">
          <EventFilterBar
            views={eventViews}
            prefectureOptions={prefectureOptions}
          />
        </div>
      </div>
    </div>
  );
}
