import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AffiliateExperienceCta from "@/components/AffiliateExperienceCta";
import EventFilterBar from "@/components/EventFilterBar";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import SummerSeasonalCta from "@/components/SummerSeasonalCta";
import {
  eventPrefectures,
  getBuildDateString,
  getEventPrefectureLabel,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";
import {
  getFacilitiesByPrefecture,
  getPrefectureMeta,
} from "@/lib/facilities";
import { prefectureEmoji, prefectureIconImages } from "@/lib/icons";
import type { PrefectureId } from "@/types/facility";

export const metadata: Metadata = {
  title: "東京・神奈川・山梨・静岡・千葉・埼玉・茨城・群馬・大阪・兵庫・京都・愛知・福岡・広島・長野・栃木・新潟の子ども向けイベント",
  description:
    "東京・神奈川・山梨・静岡・千葉・埼玉・茨城・群馬・大阪・兵庫・京都・愛知・福岡・広島・長野・栃木・新潟の子どもと行けるイベントを、公式情報で確認できたものだけ掲載しています。",
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
  const prefectureOptions = eventPrefectures.map((prefectureId) => ({
    id: prefectureId,
    name: getEventPrefectureLabel(prefectureId),
  }));

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
            子どもと行けるイベントを、日付・エリア・“好き”から探す
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            公式サイトで確認できたイベントだけを掲載し、終了したものは自動的に表示されなくなります。日程・料金の最新情報は各公式サイトでご確認ください。
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <SummerSeasonalCta placement="events" />
        <AffiliateExperienceCta placement="events_index" />

        <div className="mt-8 hidden grid-cols-2 gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4">
          {eventPrefectures.map((prefectureId) => {
            const meta = getPrefectureMeta(prefectureId as PrefectureId);
            const prefectureName = getEventPrefectureLabel(prefectureId);
            const iconImage = prefectureIconImages[prefectureId];
            const eventCount = eventCountByPrefecture.get(prefectureId) ?? 0;
            const facilityCount = meta
              ? getFacilitiesByPrefecture(meta.id).length
              : 0;

            return (
              <Link
                key={prefectureId}
                href={`/events/${prefectureId}`}
                className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand hover:bg-sky-50/40"
              >
                <div className="flex items-center gap-3">
                  {iconImage ? (
                    <Image
                      src={iconImage}
                      alt=""
                      width={56}
                      height={56}
                      className="h-12 w-12 shrink-0 object-contain"
                      aria-hidden
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-2xl"
                    >
                      {prefectureEmoji[prefectureId] ?? "📍"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 group-hover:text-brand">
                      {prefectureName}
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
            referenceDate={today}
          />
        </div>
      </div>
    </div>
  );
}
