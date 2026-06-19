import Link from "next/link";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { EventView } from "@/lib/events";

interface EventCardProps {
  view: EventView;
  showPrefecture?: boolean;
}

function isPdfOfficialUrl(url: string) {
  const path = url.split(/[?#]/, 1)[0];
  return path.toLowerCase().endsWith(".pdf");
}

export default function EventCard({
  view,
  showPrefecture = true,
}: EventCardProps) {
  const { event, facilityName, facilitySlug, prefectureLabel } = view;
  const officialLinkLabel = isPdfOfficialUrl(event.official_url)
    ? "公式PDFを見る"
    : "公式で詳細を見る";
  const labels = [
    event.price_label && {
      key: "price",
      label: event.price_label,
      color: "bg-emerald-50 text-emerald-700",
    },
    event.reservation_label && {
      key: "reservation",
      label: event.reservation_label,
      color: "bg-sky-50 text-sky-700",
    },
    event.age_label && {
      key: "age",
      label: event.age_label,
      color: "bg-amber-50 text-amber-700",
    },
  ].filter((label): label is { key: string; label: string; color: string } =>
    Boolean(label),
  );

  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:p-5"
      data-event-card
      data-event-id={event.id}
      data-recommended-for={event.recommended_for_tags.join(",")}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {showPrefecture ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {prefectureLabel}
              </span>
            ) : null}
            {facilitySlug && facilityName ? (
              <Link
                href={`/facilities/${facilitySlug}`}
                className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
              >
                {facilityName}
              </Link>
            ) : (
              <span className="text-sm font-bold text-slate-500">
                施設情報確認中
              </span>
            )}
          </div>
          <h2 className="mt-2 break-words text-xl font-bold leading-snug text-slate-900">
            {event.title}
          </h2>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {event.date_label}
            {event.time_label ? ` / ${event.time_label}` : ""}
          </p>
        </div>
        <a
          href={event.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          {officialLinkLabel}
        </a>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        {event.summary}
      </p>

      <section className="mt-4 rounded-lg border border-sky-100 bg-sky-50/60 p-3">
        <p className="text-sm font-bold text-slate-900">
          {event.recommended_for_label ?? "こんな子に合いそう"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {event.recommended_for_note ??
            "公式情報をもとに、興味に合いそうなポイントを整理しています。"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.recommended_for_tags.map((tag) => {
            const meta = RECOMMENDED_FOR_TAG_META[tag];
            return (
              <span
                key={`${event.id}-recommended-${tag}`}
                className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-sky-100"
              >
                {meta.icon} {meta.label}
              </span>
            );
          })}
        </div>
      </section>

      {labels.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {labels.map((item) => (
            <span
              key={item.key}
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${item.color}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {event.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <span
              key={`${event.id}-${tag}`}
              className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {facilitySlug ? (
          <Link
            href={`/facilities/${facilitySlug}`}
            className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
          >
            施設ページを見る →
          </Link>
        ) : (
          <span className="text-sm font-bold text-slate-400">
            施設ページ確認中
          </span>
        )}
        <p className="text-[11px] leading-relaxed text-slate-400">
          公式確認日: {event.source_checked_at}
        </p>
      </div>
    </article>
  );
}
