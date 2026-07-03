import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getVisibleEvents,
  type EventItem,
} from "@/lib/events";
import { getFacilityBySlug } from "@/lib/facilities";

export type MyPlacesEventOrigin = "wishlist" | "visited";

export type MyPlacesEvent = {
  event: Pick<
    EventItem,
    "id" | "title" | "date_label" | "official_url" | "end_date"
  >;
  facility: {
    id: number;
    name: string;
    slug: string;
  };
  origin: MyPlacesEventOrigin;
};

type FacilitySourceSets = {
  wishlistFacilityIds: Set<number>;
  visitedFacilityIds: Set<number>;
  facilityById: Map<number, { id: number; name: string; slug: string }>;
};

export function getMyPlacesEvents({
  visitedSlugs,
  wishlistSlugs,
}: {
  visitedSlugs: readonly string[];
  wishlistSlugs: readonly string[];
}): MyPlacesEvent[] {
  const { wishlistFacilityIds, visitedFacilityIds, facilityById } =
    buildFacilitySourceSets(visitedSlugs, wishlistSlugs);
  const targetFacilityIds = new Set([
    ...wishlistFacilityIds,
    ...visitedFacilityIds,
  ]);

  if (targetFacilityIds.size === 0) return [];

  const seenEventIds = new Set<string>();
  const visibleEvents = getVisibleEvents(
    getBuildDateString(),
    EVENT_PAGE_MAX_AGE_DAYS,
  );

  const candidates: MyPlacesEvent[] = visibleEvents.flatMap((event) => {
    if (seenEventIds.has(event.id) || !targetFacilityIds.has(event.facility_id)) {
      return [];
    }
    const facility = facilityById.get(event.facility_id);
    if (!facility) return [];

    seenEventIds.add(event.id);
    const origin: MyPlacesEventOrigin = wishlistFacilityIds.has(
      event.facility_id,
    )
      ? "wishlist"
      : "visited";

    return [
      {
        event: {
          id: event.id,
          title: event.title,
          date_label: event.date_label,
          official_url: event.official_url,
          end_date: event.end_date,
        },
        facility,
        origin,
      },
    ];
  });

  const perFacilityCounts = new Map<number, number>();
  return candidates
    .sort(compareMyPlacesEvents)
    .filter((item) => {
      const count = perFacilityCounts.get(item.facility.id) ?? 0;
      if (count >= 2) return false;
      perFacilityCounts.set(item.facility.id, count + 1);
      return true;
    })
    .slice(0, 4);
}

function buildFacilitySourceSets(
  visitedSlugs: readonly string[],
  wishlistSlugs: readonly string[],
): FacilitySourceSets {
  const wishlistFacilityIds = new Set<number>();
  const visitedFacilityIds = new Set<number>();
  const facilityById = new Map<
    number,
    { id: number; name: string; slug: string }
  >();

  for (const slug of new Set(wishlistSlugs)) {
    const facility = getFacilityBySlug(slug);
    if (!facility) continue;
    wishlistFacilityIds.add(facility.id);
    facilityById.set(facility.id, {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
    });
  }

  for (const slug of new Set(visitedSlugs)) {
    const facility = getFacilityBySlug(slug);
    if (!facility) continue;
    visitedFacilityIds.add(facility.id);
    facilityById.set(facility.id, {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
    });
  }

  return { wishlistFacilityIds, visitedFacilityIds, facilityById };
}

function compareMyPlacesEvents(
  a: MyPlacesEvent,
  b: MyPlacesEvent,
): number {
  const byOrigin = originRank(a.origin) - originRank(b.origin);
  if (byOrigin !== 0) return byOrigin;

  const byEndDate = compareNullableEndDate(a.event.end_date, b.event.end_date);
  if (byEndDate !== 0) return byEndDate;

  return a.event.id.localeCompare(b.event.id);
}

function originRank(origin: MyPlacesEventOrigin): number {
  return origin === "wishlist" ? 0 : 1;
}

function compareNullableEndDate(
  a: string | null,
  b: string | null,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}
