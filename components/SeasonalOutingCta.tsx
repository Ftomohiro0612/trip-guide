import Link from "next/link";
import EventCard from "@/components/EventCard";
import FacilityCard from "@/components/FacilityCard";
import {
  getBuildDateString,
  getNextEventDate,
  getVisibleEvents,
  isThisWeekend,
  toEventView,
} from "@/lib/events";
import { visibleFacilities } from "@/lib/facilities";
import { getTagFacilities, getTagMetaBySlug } from "@/lib/tags";

const panelClass =
  "overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-7 shadow-xl shadow-amber-100/50 sm:px-8 sm:py-9 lg:px-10";
const linkClass =
  "inline-flex min-h-11 items-center rounded-full bg-amber-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-800";

export default function SeasonalOutingCta({
  placement = "home",
}: {
  placement?: "home" | "events";
}) {
  const today = getBuildDateString();
  const selectedEvents = getVisibleEvents(today)
    .sort((a, b) => {
      const weekendOrder =
        Number(isThisWeekend(b, today)) - Number(isThisWeekend(a, today));
      // Undated events follow dated events within each weekend group.
      const nextA = getNextEventDate(a, today) ?? "9999-12-31";
      const nextB = getNextEventDate(b, today) ?? "9999-12-31";
      return (
        weekendOrder || nextA.localeCompare(nextB) || a.id.localeCompare(b.id)
      );
    })
    .slice(0, 3);
  const selectedFacilities = getTagFacilities(
    getTagMetaBySlug("seasonal")!,
    visibleFacilities,
  )
    .sort((a, b) => a.id - b.id)
    .slice(0, 3);

  if (selectedEvents.length === 0 && selectedFacilities.length === 0) {
    return null;
  }

  return (
    <div
      data-seasonal-slot="autumn"
      data-seasonal-cta={placement}
      className={
        placement === "events"
          ? "mb-8 grid gap-6"
          : "order-0 mt-6 grid gap-6 sm:mt-8"
      }
    >
      {selectedEvents.length > 0 && (
        <section
          data-seasonal-panel="events"
          aria-labelledby={`seasonal-events-heading-${placement}`}
          className={panelClass}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`seasonal-events-heading-${placement}`}
              className="text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl"
            >
              季節・週末のイベント
            </h2>
            <Link href="/events" className={linkClass}>
              イベントをもっと見る →
            </Link>
          </div>
          <div className="grid gap-4">
            {selectedEvents.map((event) => (
              <EventCard key={event.id} view={toEventView(event, today)} />
            ))}
          </div>
        </section>
      )}

      {selectedFacilities.length > 0 && (
        <section
          data-seasonal-panel="facilities"
          aria-labelledby={`seasonal-facilities-heading-${placement}`}
          className={panelClass}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`seasonal-facilities-heading-${placement}`}
              className="text-2xl font-bold tracking-tight text-amber-950 sm:text-3xl"
            >
              季節を楽しむ施設
            </h2>
            <Link href="/tag/seasonal" className={linkClass}>
              季節の施設をもっと見る →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedFacilities.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
