import { getFacilityBySlug } from "@/lib/facilities";

export type VisitForVisitedPlacesMap = {
  facility_slug: string | null;
  visited_on: string | null;
  family_revisit: string | null;
  parent_fatigue: string | null;
};

export type VisitedPlaceFacility = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  lastVisited: string | null;
  latestRevisit: string | null;
  latestFatigue: string | null;
};

type VisitAggregate = {
  visitCount: number;
  lastVisited: string | null;
  latestRevisit: string | null;
  latestFatigue: string | null;
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function buildVisitedPlacesMapData(
  visits: VisitForVisitedPlacesMap[],
): VisitedPlaceFacility[] {
  const bySlug = new Map<string, VisitAggregate>();

  for (const visit of visits) {
    const slug = visit.facility_slug?.trim();
    if (!slug) continue;

    const current = bySlug.get(slug) ?? {
      visitCount: 0,
      lastVisited: null,
      latestRevisit: null,
      latestFatigue: null,
    };
    const isNewer = Boolean(
      visit.visited_on &&
        (!current.lastVisited || visit.visited_on > current.lastVisited),
    );
    const isFirst = current.visitCount === 0;

    bySlug.set(slug, {
      visitCount: current.visitCount + 1,
      lastVisited: isNewer ? visit.visited_on : current.lastVisited,
      latestRevisit:
        isNewer || isFirst
          ? (visit.family_revisit ?? null)
          : current.latestRevisit,
      latestFatigue:
        isNewer || isFirst
          ? (visit.parent_fatigue ?? null)
          : current.latestFatigue,
    });
  }

  return Array.from(bySlug.entries())
    .flatMap(([slug, aggregate]) => {
      const facility = getFacilityBySlug(slug);
      if (
        !facility ||
        !isFiniteCoordinate(facility.latitude) ||
        !isFiniteCoordinate(facility.longitude)
      ) {
        return [];
      }

      return [
        {
          slug,
          name: facility.name,
          latitude: facility.latitude,
          longitude: facility.longitude,
          visitCount: aggregate.visitCount,
          lastVisited: aggregate.lastVisited,
          latestRevisit: aggregate.latestRevisit,
          latestFatigue: aggregate.latestFatigue,
        },
      ];
    })
    .sort((a, b) => {
      const byLastVisited = (b.lastVisited ?? "").localeCompare(
        a.lastVisited ?? "",
      );
      return byLastVisited || a.name.localeCompare(b.name, "ja");
    });
}
