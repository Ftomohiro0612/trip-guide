import type { Facility } from "@/types/facility";

type ChildUseMetadata = Pick<Facility, "child_use_status">;

export function isChildRecommendationEligible(
  facility: ChildUseMetadata,
): boolean {
  return !["restricted", "not_allowed"].includes(
    facility.child_use_status ?? "unknown",
  );
}
