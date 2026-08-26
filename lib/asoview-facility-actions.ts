import asoviewFacilityActionsJson from "@/data/asoview_facility_actions.json";
import type { Facility } from "@/types/facility";

export type AsoviewFacilityActionType =
  | "ticket"
  | "reservation"
  | "experience";

export interface AsoviewFacilityAction {
  facility_id: number;
  facility_slug: string;
  facility_name: string;
  action_type: AsoviewFacilityActionType;
  label: string;
  url: string;
  verified_at: string;
  display_through: string;
}

interface AsoviewFacilityActionRegistry {
  schema_version: number;
  offers: AsoviewFacilityAction[];
}

const registry =
  asoviewFacilityActionsJson as unknown as AsoviewFacilityActionRegistry;

const actionsBySlug = new Map(
  registry.offers.map((action) => [action.facility_slug, action]),
);

/**
 * Returns only reviewed, direct and currently valid Asoview actions.
 * Matching the immutable canon identity makes later slug/id/name drift fail closed.
 */
export function getAsoviewFacilityAction(
  facility: Pick<Facility, "id" | "slug" | "name">,
  today: string,
): AsoviewFacilityAction | undefined {
  const action = actionsBySlug.get(facility.slug);

  if (
    !action ||
    action.facility_id !== facility.id ||
    action.facility_name !== facility.name ||
    !action.display_through ||
    action.display_through < today
  ) {
    return undefined;
  }

  return action;
}
