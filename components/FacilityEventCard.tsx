import EventRecordButton from "@/components/EventRecordButton";
import TrackedOutboundLink from "@/components/TrackedOutboundLink";
import { isPdfOfficialUrl } from "@/lib/event-urls";
import type { EventView } from "@/lib/events";

export default function FacilityEventCard({ view }: { view: EventView }) {
  const { event } = view;
  const officialLinkLabel =
    event.reservation === "required"
      ? "予約方法を公式で確認"
      : isPdfOfficialUrl(event.official_url)
        ? "公式PDFを見る"
        : "公式で詳細を見る";
  const labels = [
    event.price_label && {
      key: "price",
      label: event.price_label,
      color: "bg-emerald-50 text-emerald-800",
    },
    (event.reservation_label || event.reservation === "required") && {
      key: "reservation",
      label: event.reservation_label || "要予約",
      color: "bg-sky-50 text-sky-800",
    },
    event.age_label && {
      key: "age",
      label: event.age_label,
      color: "bg-amber-50 text-amber-800",
    },
  ].filter((label): label is { key: string; label: string; color: string } =>
    Boolean(label),
  );

  return (
    <article
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5"
      data-event-card
      data-event-id={event.id}
      data-event-variant="facility-compact"
      data-event-type={event.event_type ?? "unclassified"}
      data-recommended-for={event.recommended_for_tags.join(",")}
    >
      <h3 className="break-words text-lg font-black leading-snug text-slate-950 sm:text-xl">
        {event.title}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm font-bold leading-relaxed text-slate-700">
          {event.date_label}
          {event.time_label ? ` / ${event.time_label}` : ""}
        </p>
        {view.isThisWeekend ? (
          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
            🗓️ 今週末
          </span>
        ) : null}
      </div>

      {labels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {labels.map((item) => (
            <span
              key={item.key}
              className={`rounded-md px-2 py-1 text-xs font-bold leading-relaxed ${item.color}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <p
        className="mt-3 text-sm leading-relaxed text-slate-600"
        data-event-summary
      >
        {event.summary}
      </p>

      <div className="mt-4 flex flex-col items-start gap-2">
        <TrackedOutboundLink
          href={event.official_url}
          contentType="event"
          contentId={event.id}
          intentType={
            event.reservation === "required"
              ? "reservation"
              : isPdfOfficialUrl(event.official_url)
                ? "event_pdf"
                : "event_detail"
          }
          linkLocation="event_card"
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          {officialLinkLabel}
        </TrackedOutboundLink>
        <EventRecordButton eventId={event.id} appearance="quiet" />
      </div>
    </article>
  );
}
