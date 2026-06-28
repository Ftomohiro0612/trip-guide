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
    <section className="mt-8" aria-labelledby="facility-events-heading">
      <h2 id="facility-events-heading" className="text-xl font-bold mb-3">
        🎪 この施設の今後のイベント
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
