import Link from "next/link";
import EventCard from "@/components/EventCard";
import {
  getVisibleEventsByFacility,
  isEventPrefecture,
  toEventView,
} from "@/lib/events";
import { getPrefectureMeta } from "@/lib/facilities";
import type { PrefectureId } from "@/types/facility";

interface FacilityEventsProps {
  facilityId: number;
  prefectureId: PrefectureId;
}

export default function FacilityEvents({
  facilityId,
  prefectureId,
}: FacilityEventsProps) {
  const events = getVisibleEventsByFacility(facilityId);
  if (events.length === 0) return null;

  const prefecture = isEventPrefecture(prefectureId)
    ? getPrefectureMeta(prefectureId)
    : undefined;

  return (
    <section
      className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-8"
      aria-labelledby="facility-events-heading"
    >
      <p className="text-xs font-black tracking-[0.18em] text-amber-600">UPCOMING EVENTS</p>
      <h2 id="facility-events-heading" className="mt-1 mb-4 text-2xl font-black text-slate-950">
        この施設の今後のイベント
      </h2>
      <div className="grid gap-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            view={toEventView(event)}
            showPrefecture={false}
            showFacilityLink={false}
          />
        ))}
      </div>
      {prefecture ? (
        <Link
          href={`/events/${prefecture.id}`}
          className="mt-3 inline-flex text-sm font-bold text-brand hover:text-brand-dark hover:underline"
        >
          {prefecture.name}のイベントをもっと見る →
        </Link>
      ) : null}
    </section>
  );
}
