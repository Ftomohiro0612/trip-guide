import summerEventsJson from "@/data/summer_events_2026.json";
import type { FeatureHubId } from "@/lib/events";

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

export function isFeatureHubActive(
  config: FeatureHubConfig,
  now = new Date(),
): boolean {
  const timestamp = now.getTime();
  return (
    timestamp >= Date.parse(config.startsAt) &&
    timestamp < Date.parse(config.endsAt)
  );
}

export function getFeatureHubVisibilityScript(
  config: FeatureHubConfig,
): string {
  const attribute = `data-${config.id}-active`;
  const startsAt = JSON.stringify(config.startsAt);
  const endsAt = JSON.stringify(config.endsAt);
  const attr = JSON.stringify(attribute);

  return `(function(){var d=document.documentElement,a=${attr},s=Date.parse(${startsAt}),e=Date.parse(${endsAt}),t;function u(){var n=Date.now(),v=n>=s&&n<e;if(v){d.setAttribute(a,"true");var w=e-n+10;t=setTimeout(u,Math.min(Math.max(w,10),2147483647));}else{d.removeAttribute(a);if(t)clearTimeout(t);}}u();})();`;
}
