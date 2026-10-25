import type { SoudanAnalyticsEvent } from "./soudan/analytics";
import { CANDIDATE_KINDS } from "./soudan/types";

type OwnerEvent = Extract<SoudanAnalyticsEvent, { name: "soudan_create" | "soudan_candidate_add" | "soudan_share" | "soudan_decide" }>;

// Enumerate at runtime as well: never forward form values or action results to GA.
export function trackSoudan(event: OwnerEvent) {
  if (event.name === "soudan_candidate_add") {
    if (!CANDIDATE_KINDS.includes(event.properties.kind)) return;
    window.gtag?.("event", event.name, { kind: event.properties.kind });
  } else if (["soudan_create", "soudan_share", "soudan_decide"].includes(event.name)) {
    window.gtag?.("event", event.name, {});
  }
}
