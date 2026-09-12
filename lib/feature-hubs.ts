import { summerEventsData as summerEventsJson } from "@memorip/runtime-canon";
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

const summerEvents = summerEventsJson as {
  metadata: { starts_at: string; ends_at: string };
};

export const SUMMER_2026_HUB_CONFIG: FeatureHubConfig = {
  id: "summer-2026",
  path: "/events/summer",
  startsAt: summerEvents.metadata.starts_at,
  endsAt: summerEvents.metadata.ends_at,
  navLabel: "🎆 夏祭り・花火",
  ctaTitle: "夏祭り・花火大会2026",
};
