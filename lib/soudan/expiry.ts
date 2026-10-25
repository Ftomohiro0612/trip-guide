import type { Consultation } from "./types";

const DAY_MS = 86_400_000;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Called when deciding. A supplied calendar date is interpreted in JST. */
export function computeShareExpiry({ decidedDate, now }: { decidedDate?: string | null; now: Date }): string {
  if (!Number.isFinite(now.getTime())) throw new RangeError("Invalid reference time");
  if (!decidedDate) return new Date(now.getTime() + 90 * DAY_MS).toISOString();
  if (!isCalendarDate(decidedDate)) throw new RangeError("Invalid decided date");
  // Next day's 00:00 JST, then 90 complete days. JST has no daylight saving.
  return new Date(Date.parse(`${decidedDate}T00:00:00+09:00`) + 91 * DAY_MS).toISOString();
}

export function isShareActive(
  consultation: Pick<Consultation, "status" | "share_enabled" | "share_expires_at" | "share_token_hash">,
  now: Date,
): boolean {
  return Number.isFinite(now.getTime()) && consultation.share_enabled && !!consultation.share_token_hash && consultation.status !== "archived" &&
    (consultation.share_expires_at === null || Date.parse(consultation.share_expires_at) > now.getTime());
}
