export type AuthIntentType = "record" | "record_event" | "wishlist";

export const FALLBACK_AUTH_DEST = "/mypage";
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export function isSafeRelativePath(path: string | null | undefined): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !CONTROL_CHAR_PATTERN.test(path)
  );
}

export function sanitizeAuthRedirect(
  path: string | null | undefined,
  fallback = FALLBACK_AUTH_DEST,
): string {
  return isSafeRelativePath(path) ? path : fallback;
}

export function buildAuthDest(
  intentType: AuthIntentType,
  slug: string,
  name: string,
): string {
  const encodedSlug = encodeURIComponent(slug);
  const encodedName = encodeURIComponent(name);

  if (intentType === "record") {
    return `/mypage/visits/new?facility=${encodedSlug}&name=${encodedName}`;
  }

  if (intentType === "record_event") {
    return buildEventAuthDest(slug);
  }

  return `/mypage/wishlist?add=${encodedSlug}&name=${encodedName}`;
}

export function buildEventAuthDest(eventId: string): string {
  return `/mypage/visits/new?event=${encodeURIComponent(eventId)}`;
}

export function buildLoginRedirect(dest: string): string {
  return `/auth/login?redirectTo=${encodeURIComponent(sanitizeAuthRedirect(dest))}`;
}

export function buildRegisterRedirect(dest: string): string {
  return `/auth/register?redirectTo=${encodeURIComponent(sanitizeAuthRedirect(dest))}`;
}
