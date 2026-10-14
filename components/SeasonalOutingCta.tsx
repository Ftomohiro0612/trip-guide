import SeasonalEventsPanel from "@/components/SeasonalEventsPanel";
import SeasonalFacilitiesPanel from "@/components/SeasonalFacilitiesPanel";
import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";
import { visibleFacilities } from "@/lib/facilities";
import { getTagFacilities, getTagMetaBySlug } from "@/lib/tags";

export default function SeasonalOutingCta({
  placement = "home",
}: {
  placement?: "home" | "events";
}) {
  const today = getBuildDateString();
  const eventViews = getVisibleEvents(today).map((event) =>
    toEventView(event, today),
  );
  const seasonalFacilities =
    placement === "home"
      ? getTagFacilities(getTagMetaBySlug("seasonal")!, visibleFacilities)
      : [];

  return (
    <div
      data-seasonal-slot="discovery"
      data-seasonal-cta={placement}
      className={placement === "events" ? "" : "order-0 mt-8 grid gap-9"}
    >
      <SeasonalEventsPanel
        views={eventViews}
        referenceDate={today}
        maxAgeDays={EVENT_PAGE_MAX_AGE_DAYS}
        placement={placement}
      />
      {placement === "home" ? (
        <SeasonalFacilitiesPanel
          facilities={seasonalFacilities}
          referenceDate={today}
        />
      ) : null}
    </div>
  );
}
