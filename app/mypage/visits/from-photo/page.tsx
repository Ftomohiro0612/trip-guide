import type { Metadata } from "next";
import { visibleFacilities } from "@/lib/facilities";
import FromPhotoVisitDraftsClient, {
  type CandidateFacility,
} from "./FromPhotoVisitDraftsClient";

export const metadata: Metadata = {
  title: "写真からおでかけ記録を作る",
};

function isCandidateFacility(
  facility: (typeof visibleFacilities)[number],
): facility is (typeof visibleFacilities)[number] & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof facility.latitude === "number" &&
    Number.isFinite(facility.latitude) &&
    typeof facility.longitude === "number" &&
    Number.isFinite(facility.longitude)
  );
}

export default function FromPhotoVisitsPage() {
  const candidateFacilities: CandidateFacility[] = visibleFacilities
    .filter(isCandidateFacility)
    .map((facility) => ({
      slug: facility.slug,
      name: facility.name,
      category: facility.category,
      prefecture: facility.prefecture,
      latitude: facility.latitude,
      longitude: facility.longitude,
    }));

  return <FromPhotoVisitDraftsClient facilities={candidateFacilities} />;
}
