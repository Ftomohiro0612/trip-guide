import rakutenFacilityActionsJson from "@/data/rakuten_facility_actions.json";
import type { Facility } from "@/types/facility";

export type RakutenFacilityActionType =
  | "coupon"
  | "ticket"
  | "reservation"
  | "experience";

export interface RakutenFacilityAction {
  facility_id: number;
  facility_slug: string;
  facility_name: string;
  action_type: RakutenFacilityActionType;
  label: string;
  url: string;
  verified_at: string;
  display_through?: string;
}

interface RakutenFacilityActionRegistry {
  schema_version: number;
  offers: RakutenFacilityAction[];
}

const registry =
  rakutenFacilityActionsJson as unknown as RakutenFacilityActionRegistry;

const actionsBySlug = new Map(
  registry.offers.map((action) => [action.facility_slug, action]),
);

/**
 * Returns only manually reviewed, exact facility matches.
 * Matching all three canon fields makes an accidental slug/id reassignment fail closed.
 */
export function getRakutenFacilityAction(
  facility: Pick<Facility, "id" | "slug" | "name">,
  today: string,
): RakutenFacilityAction | undefined {
  const action = actionsBySlug.get(facility.slug);

  if (
    !action ||
    action.facility_id !== facility.id ||
    action.facility_name !== facility.name ||
    (action.display_through && action.display_through < today)
  ) {
    return undefined;
  }

  return action;
}
