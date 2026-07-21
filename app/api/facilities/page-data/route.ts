import {
  getFacilityListResults,
  rawSearchParamsFromUrl,
} from "@/lib/facility-list-results";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  searchParams.delete("page");
  const { results } = getFacilityListResults(
    rawSearchParamsFromUrl(searchParams),
  );

  return Response.json(
    { facilities: results },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    },
  );
}
