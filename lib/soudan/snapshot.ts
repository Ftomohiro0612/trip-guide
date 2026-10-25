import type { Facility } from "../../types/facility";
import type { EventView } from "../events";
import type { CandidateSnapshot } from "./types";

const known = (value: string | null | undefined): string | null => value?.trim() && value.trim() !== "unknown" ? value : null;

/** Facility canon has no structured hours/reservation field: do not infer either. */
export function buildFacilitySnapshot(facility: Facility): CandidateSnapshot {
  return {
    title: facility.name,
    venue_name: facility.name,
    prefecture_label: facility.prefecture,
    date_label: null,
    hours: null,
    price: facility.is_free ? "無料" : [known(facility.adult_fee) && `大人: ${facility.adult_fee}`, known(facility.child_fee) && `子供: ${facility.child_fee}`].filter(Boolean).join(" / ") || null,
    reservation: null,
    rain: known(facility.rain_friendly),
    age: known(facility.target_age),
    official_url: facility.url,
    source_checked_at: known(facility.source_checked_at),
  };
}

/** Same durable title/date/venue/prefecture facts as visit-event, plus card labels. */
export function buildEventSnapshot(view: EventView): CandidateSnapshot {
  const event = view.event;
  return {
    title: event.title,
    venue_name: view.venueName,
    prefecture_label: view.prefectureLabel,
    date_label: event.date_label,
    hours: known(event.time_label),
    price: known(event.price_label),
    reservation: known(event.reservation_label),
    rain: null,
    age: known(event.age_label),
    official_url: event.official_url,
    source_checked_at: known(event.source_checked_at),
  };
}
