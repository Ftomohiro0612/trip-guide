import type { Metadata } from "next";
import Link from "next/link";
import AffiliateExperienceCta from "@/components/AffiliateExperienceCta";
import EventFilterBar from "@/components/EventFilterBar";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import ResponsiveResultsMap from "@/components/ResponsiveResultsMap";
import SummerSeasonalCta from "@/components/SummerSeasonalCta";
import {
  eventPrefectures,
  getBuildDateString,
  getFacilityForEvent,
  getEventPrefectureLabel,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";

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
  const eventFacilities = Array.from(
    new Map(
      visibleEvents.flatMap((event) => {
        const facility = getFacilityForEvent(event);
        return facility ? [[facility.id, facility] as const] : [];
      }),
    ).values(),
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

        <ResponsiveResultsMap
          facilities={eventFacilities}
          heading="地図で探す"
        />

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
