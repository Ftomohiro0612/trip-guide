export interface FeatureHubRuntimeConfig {
  id: string;
  startsAt: string;
  endsAt: string;
}

export function isFeatureHubActive(
  config: FeatureHubRuntimeConfig,
  now = new Date(),
): boolean {
  const timestamp = now.getTime();
  return (
    timestamp >= Date.parse(config.startsAt) &&
    timestamp < Date.parse(config.endsAt)
  );
}

export function getFeatureHubVisibilityScript(
  config: FeatureHubRuntimeConfig,
): string {
  const attribute = `data-${config.id}-active`;
  const startsAt = JSON.stringify(config.startsAt);
  const endsAt = JSON.stringify(config.endsAt);
  const attr = JSON.stringify(attribute);

  return `(function(){var d=document.documentElement,a=${attr},s=Date.parse(${startsAt}),e=Date.parse(${endsAt}),t;function u(){var n=Date.now(),v=n>=s&&n<e;if(v){d.setAttribute(a,"true");var w=e-n+10;t=setTimeout(u,Math.min(Math.max(w,10),2147483647));}else{d.removeAttribute(a);if(t)clearTimeout(t);}}u();})();`;
}
