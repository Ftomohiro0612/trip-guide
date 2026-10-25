import { buildEventSnapshot, buildFacilitySnapshot } from "./soudan/snapshot";
import type { CandidateSnapshot, ConsultationCandidate } from "./soudan/types";

export type SharedFacts = { snapshot: Partial<CandidateSnapshot>; address: string | null; mapUrl: string | null; fromSnapshot: boolean };

/** Only resolve the requested record. Canon remains server-only and externalized. */
export async function getSharedFacts(candidate: ConsultationCandidate): Promise<SharedFacts> {
  let snapshot: Partial<CandidateSnapshot> = candidate.snapshot;
  let address: string | null = null;
  let fromSnapshot = true;
  if (candidate.kind === "facility" && candidate.facility_slug) {
    const { getFacilityBySlug, isFacilityVisible } = await import("./facilities");
    const facility = getFacilityBySlug(candidate.facility_slug);
    if (isFacilityVisible(facility)) { snapshot = buildFacilitySnapshot(facility); address = facility.address || null; fromSnapshot = false; }
  } else if (candidate.kind === "event" && candidate.event_id) {
    const { getEventById, toEventView, getFacilityForEvent } = await import("./events");
    const event = getEventById(candidate.event_id);
    if (event && event.status !== "draft") {
      snapshot = buildEventSnapshot(toEventView(event));
      address = getFacilityForEvent(event)?.address || null;
      fromSnapshot = false;
    }
  }
  return { snapshot, address, mapUrl: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null, fromSnapshot };
}
