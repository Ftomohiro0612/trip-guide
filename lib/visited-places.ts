import { getFacilityBySlug } from "@/lib/facilities";

export type VisitForVisitedPlacesMap = {
  facility_slug: string | null;
  visited_on: string | null;
};

export type VisitedPlaceFacility = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  visitCount: number;
  lastVisited: string | null;
};

type VisitAggregate = {
  visitCount: number;
  lastVisited: string | null;
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
    };

    bySlug.set(slug, {
      visitCount: current.visitCount + 1,
      lastVisited:
        visit.visited_on &&
        (!current.lastVisited || visit.visited_on > current.lastVisited)
          ? visit.visited_on
          : current.lastVisited,
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
