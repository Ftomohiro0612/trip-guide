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

export type FamilyMapPlace = {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: "visited" | "wishlist" | "both";
  visited?: {
    visitCount: number;
    lastVisited: string | null;
    latestRevisit: string | null;
    latestFatigue: string | null;
  };
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

export function buildFamilyOutingMapData(
  visits: VisitForVisitedPlacesMap[],
  wishlistSlugs: string[],
): FamilyMapPlace[] {
  const visitedPlaces = buildVisitedPlacesMapData(visits);
  const bySlug = new Map<string, FamilyMapPlace>();

  for (const place of visitedPlaces) {
    bySlug.set(place.slug, {
      slug: place.slug,
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
      kind: "visited",
      visited: {
        visitCount: place.visitCount,
        lastVisited: place.lastVisited,
        latestRevisit: place.latestRevisit,
        latestFatigue: place.latestFatigue,
      },
    });
  }

  for (const slug of Array.from(new Set(wishlistSlugs.map((s) => s.trim())))) {
    if (!slug) continue;

    const facility = getFacilityBySlug(slug);
    if (
      !facility ||
      !isFiniteCoordinate(facility.latitude) ||
      !isFiniteCoordinate(facility.longitude)
    ) {
      continue;
    }

    const existing = bySlug.get(slug);
    if (existing) {
      bySlug.set(slug, {
        ...existing,
        kind: "both",
      });
      continue;
    }

    bySlug.set(slug, {
      slug,
      name: facility.name,
      latitude: facility.latitude,
      longitude: facility.longitude,
      kind: "wishlist",
    });
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    const aLastVisited = a.visited?.lastVisited ?? "";
    const bLastVisited = b.visited?.lastVisited ?? "";
    const byLastVisited = bLastVisited.localeCompare(aLastVisited);
    return byLastVisited || a.name.localeCompare(b.name, "ja");
  });
}
