const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const DEFAULT_ANALYTICS_BASE = "https://trip-guide.net";

export function maskAnalyticsText(value: string): string {
  return value.replace(UUID_PATTERN, ":id");
}

export function maskAnalyticsUrl(
  value: string | null | undefined,
  base = DEFAULT_ANALYTICS_BASE,
): string {
  if (!value) return "";

  try {
    const url = new URL(value, base);
    url.pathname = maskAnalyticsText(url.pathname);
    url.search = maskAnalyticsText(url.search);
    url.hash = maskAnalyticsText(url.hash);
    return url.toString();
  } catch {
    return "";
  }
}

export function maskAnalyticsPath(
  value: string | null | undefined,
  base = DEFAULT_ANALYTICS_BASE,
): string {
  const maskedUrl = maskAnalyticsUrl(value, base);
  if (!maskedUrl) return "";

  try {
    const url = new URL(maskedUrl);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}
