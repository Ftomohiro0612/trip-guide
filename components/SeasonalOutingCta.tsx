import Link from "next/link";
import FacilityCard from "@/components/FacilityCard";
import SeasonalEventsPanel from "@/components/SeasonalEventsPanel";
import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";
import { visibleFacilities } from "@/lib/facilities";
import { getTagFacilities, getTagMetaBySlug } from "@/lib/tags";

const panelClass =
  "overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 px-5 py-7 shadow-xl shadow-red-100/50 sm:px-8 sm:py-9 lg:px-10";
const linkClass =
  "inline-flex min-h-11 items-center rounded-full bg-red-800 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700";

export default function SeasonalOutingCta({
  placement = "home",
}: {
  placement?: "home" | "events";
}) {
  const today = getBuildDateString();
  const eventViews = getVisibleEvents(today).map((event) =>
    toEventView(event, today),
  );
  const facilityPrefectures = new Set<string>();
  const facilityCategories = new Set<string>();
  const selectedFacilities = getTagFacilities(
    getTagMetaBySlug("seasonal")!,
    visibleFacilities,
  )
    .sort((a, b) => a.id - b.id)
    .filter((facility) => {
      if (
        facilityPrefectures.has(facility.prefecture_id) ||
        facilityCategories.has(facility.category_id)
      ) {
        return false;
      }
      facilityPrefectures.add(facility.prefecture_id);
      facilityCategories.add(facility.category_id);
      return true;
    })
    .slice(0, 3);

  if (eventViews.length === 0 && selectedFacilities.length === 0) {
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
      <SeasonalEventsPanel
        views={eventViews}
        referenceDate={today}
        maxAgeDays={EVENT_PAGE_MAX_AGE_DAYS}
        placement={placement}
      />

      {selectedFacilities.length > 0 && (
        <section
          data-seasonal-panel="facilities"
          aria-labelledby={`seasonal-facilities-heading-${placement}`}
          className={panelClass}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2
              id={`seasonal-facilities-heading-${placement}`}
              className="text-2xl font-bold tracking-tight text-red-950 sm:text-3xl"
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
