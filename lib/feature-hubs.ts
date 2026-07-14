import summerEventsJson from "@/data/summer_events_2026.json";
import type { FeatureHubId } from "@/lib/events";
export {
  getFeatureHubVisibilityScript,
  isFeatureHubActive,
} from "@/lib/feature-hub-runtime";

export interface FeatureHubConfig {
  id: FeatureHubId;
  path: "/events/summer";
  startsAt: string;
  endsAt: string;
  navLabel: string;
  ctaTitle: string;
}

export const SUMMER_2026_HUB_CONFIG: FeatureHubConfig = {
  id: "summer-2026",
  path: "/events/summer",
  startsAt: summerEventsJson.metadata.starts_at,
  endsAt: summerEventsJson.metadata.ends_at,
  navLabel: "🎆 夏祭り・花火",
  ctaTitle: "夏祭り・花火大会2026",
};
