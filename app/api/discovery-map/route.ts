import { getFacilitiesForCategoryPage } from "@/lib/category-page-facilities";
import {
  getFacilityListResults,
  rawSearchParamsFromUrl,
} from "@/lib/facility-list-results";
import {
  discoverableFacilities,
  getFacilitiesByPrefecture,
  prefectures,
} from "@/lib/facilities";
import { toMapFacilities } from "@/lib/map-facilities";
import type { PrefectureId } from "@/types/facility";

function resolvePrefectureId(value: string | null): PrefectureId | null {
  return (
    prefectures.find((prefecture) => prefecture.id === value)?.id ?? null
  );
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const scope = searchParams.get("scope");
  let facilities;

  if (scope === "all") {
    facilities = discoverableFacilities;
  } else if (scope === "facilities") {
    searchParams.delete("scope");
    searchParams.delete("page");
    searchParams.delete("sort");
    facilities = getFacilityListResults(
      rawSearchParamsFromUrl(searchParams),
    ).results;
  } else if (scope === "category") {
    const categoryId = searchParams.get("category");
    if (!categoryId) {
      return Response.json({ error: "category is required" }, { status: 400 });
    }
    facilities = getFacilitiesForCategoryPage({
      categoryId,
      prefectureId: searchParams.get("prefecture"),
      craftTypeId: searchParams.get("craft_type"),
    }).filteredFacilities;
  } else if (scope === "prefecture") {
    const prefectureId = resolvePrefectureId(searchParams.get("prefecture"));
    if (!prefectureId) {
      return Response.json(
        { error: "valid prefecture is required" },
        { status: 400 },
      );
    }
    facilities = getFacilitiesByPrefecture(prefectureId);
  } else {
    return Response.json({ error: "valid scope is required" }, { status: 400 });
  }

  const points = toMapFacilities(facilities);
  return Response.json(
    { points, total: facilities.length },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
