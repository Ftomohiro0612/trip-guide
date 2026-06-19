import Link from "next/link";
import {
  getVisibleEventsByFacility,
  isEventPrefecture,
  isPdfOfficialUrl,
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
        {events.map((event) => {
          const officialLinkLabel = isPdfOfficialUrl(event.official_url)
            ? "公式PDFを見る ↗"
            : "公式で詳細を見る ↗";

          return (
            <article
              key={event.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100"
            >
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {event.date_label}
              </span>
              <h3 className="mt-2 break-words text-base font-bold leading-snug text-slate-900">
                {event.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700">
                {event.summary}
              </p>
              {event.recommended_for_label ? (
                <p className="mt-2 line-clamp-1 text-sm font-bold text-slate-700">
                  🎯 {event.recommended_for_label}
                </p>
              ) : null}
              <a
                href={event.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-bold text-brand hover:text-brand-dark hover:underline"
              >
                {officialLinkLabel}
              </a>
            </article>
          );
        })}
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
