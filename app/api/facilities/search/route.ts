import { facilitiesData as facilitiesJson } from "@memorip/runtime-canon";
import { normalizeForSearchMatch } from "@/lib/facility-name-match";

type FacilitySearchSource = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
  search_aliases?: string[];
  latitude?: unknown;
  longitude?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFacilitySearchSource(value: unknown): value is FacilitySearchSource {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.prefecture === "string"
  );
}

function isVisibleFacilitySearchSource(
  value: unknown,
): value is FacilitySearchSource {
  if (!isFacilitySearchSource(value)) return false;
  const source = value as Record<string, unknown>;
  return source.data_quality_status !== "exclude_candidate" &&
    source.closure_status !== "permanently_closed";
}

const facilities = isRecord(facilitiesJson) && Array.isArray(facilitiesJson.facilities)
  ? facilitiesJson.facilities.filter(isVisibleFacilitySearchSource)
  : [];

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const slug = searchParams.get("slug")?.trim();
  if (slug !== undefined) {
    const facility = facilities.find((item) => item.slug === slug);
    return Response.json({
      hasCoordinates: Boolean(
        facility &&
          isFiniteCoordinate(facility.latitude) &&
          isFiniteCoordinate(facility.longitude),
      ),
    });
  }

  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const normalizedQuery = normalizeForSearchMatch(q);
  const results = facilities
    .filter((facility) =>
      [facility.name, ...(facility.search_aliases ?? [])].some((variant) =>
        normalizeForSearchMatch(variant).includes(normalizedQuery),
      ),
    )
    .slice(0, 15)
    .map(({ slug, name, category, prefecture }) => ({
      slug,
      name,
      category,
      prefecture,
    }));

  return Response.json({ results });
}
