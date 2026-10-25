const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const DEFAULT_ANALYTICS_BASE = "https://memorips.com";

export function maskAnalyticsText(value: string): string {
  const tokens: string[] = [];
  let masked = value
    .replace(/(\/soudan\/)([^/?#&\s"'<>]+)/g, (_match, prefix: string, token: string) => {
      tokens.push(token);
      return `${prefix}:token`;
    })
    .replace(/(%(?:25)?2fsoudan%(?:25)?2f)([^%&\s"'<>]+)/gi, (_match, prefix: string, token: string) => {
      tokens.push(token);
      return `${prefix}:token`;
    });
  // Real tokens are at least 32 characters. Also redact copies in query/hash/payload.
  for (const token of tokens) {
    if (token.length >= 32) masked = masked.split(token).join(":token");
  }
  return masked.replace(UUID_PATTERN, ":id");
}

export function maskAnalyticsUrl(
  value: string | null | undefined,
  base = DEFAULT_ANALYTICS_BASE,
): string {
  if (!value) return "";

  try {
    const url = new URL(value, base);
    const tokens = [...url.pathname.matchAll(/\/soudan\/([^/]+)/g)].map((match) => match[1]);
    for (const token of tokens) {
      // Even a short, invalid token must not survive in a copy of the route's query/hash.
      url.search = url.search.replace(/=([^&]*)/g, (_match, value: string) => `=${value.split(token).join(":token")}`);
      url.hash = url.hash.split(token).join(":token");
    }
    url.pathname = maskAnalyticsText(url.pathname);
    url.search = maskAnalyticsText(url.search);
    url.hash = maskAnalyticsText(url.hash);
    return maskAnalyticsText(url.toString());
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
