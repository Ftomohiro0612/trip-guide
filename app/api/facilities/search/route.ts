import facilitiesJson from "@/data/facilities_data.json";

type FacilitySearchSource = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
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

const facilities = isRecord(facilitiesJson) && Array.isArray(facilitiesJson.facilities)
  ? facilitiesJson.facilities.filter(isFacilitySearchSource)
  : [];

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const normalizedQuery = q.toLocaleLowerCase();
  const results = facilities
    .filter((facility) =>
      facility.name.toLocaleLowerCase().includes(normalizedQuery),
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
