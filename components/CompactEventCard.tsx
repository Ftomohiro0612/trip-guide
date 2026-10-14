import Link from "next/link";
import { getEventAnchorId } from "@/lib/event-discovery";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { EventView } from "@/lib/events";
import type { RecommendedForTag } from "@/types/facility";

export default function CompactEventCard({
  appealTags,
  horizontal = false,
  view,
}: {
  appealTags: readonly RecommendedForTag[];
  horizontal?: boolean;
  view: EventView;
}) {
  const { event } = view;
  const href = `/events?event=${encodeURIComponent(event.id)}#${getEventAnchorId(event.id)}`;

  return (
    <Link
      href={href}
      data-compact-event-card
      data-event-id={event.id}
      className={`group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 ${
        horizontal ? "min-w-[17rem] snap-start sm:min-w-0" : ""
      }`}
    >
      <article className={horizontal ? "sm:flex sm:items-start sm:gap-4" : ""}>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-500">
            {[view.venueName, view.prefectureLabel].filter(Boolean).join("・")}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-slate-900 group-hover:text-brand">
            {event.title}
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {event.date_label}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-0 sm:max-w-48 sm:justify-end">
          {appealTags.slice(0, 2).map((tag) => {
            const meta = RECOMMENDED_FOR_TAG_META[tag];
            return (
              <span
                key={`${event.id}-${tag}`}
                className="rounded-full bg-sky-50 px-2 py-1 text-xs font-bold text-sky-800"
              >
                {meta.icon} {meta.label}
              </span>
            );
          })}
          {event.reservation === "required" ? (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
              要予約
            </span>
          ) : null}
          {event.is_free !== null ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
              {event.is_free ? "無料" : "有料"}
            </span>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
