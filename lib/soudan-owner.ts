import { dateValueJst } from "./date-jst";
import { childAgeAtVisit } from "./child-age";
import { isShareActive } from "./soudan/expiry";
import type { Consultation, ConsultationResponse } from "./soudan/types";
import { AGE_BANDS } from "./soudan/types";

export const defaultSoudanTitle = (now = new Date()) => `${Number(dateValueJst(now).slice(5, 7))}月の週末おでかけ`;

export function profileAgeBands(children: { birth_year: number; birth_month: number | null }[], now = new Date()) {
  const bands = children.flatMap((child) => {
    const age = childAgeAtVisit(dateValueJst(now), child.birth_year, child.birth_month);
    return age === null ? [] : [AGE_BANDS[age < 3 ? 0 : age < 6 ? 1 : age < 12 ? 2 : 3]];
  });
  return AGE_BANDS.filter((band) => bands.includes(band));
}

export function openDestinations<T extends Pick<Consultation, "id" | "status" | "updated_at">>(items: T[]): T[] {
  return items.filter((item) => item.status === "open").sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
}

export function candidateError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "すでに入っています";
  if (error.code === "23514" && error.message?.includes("candidate limit reached")) return "1つの相談に入れられる候補は30件までです";
  return "候補を保存できませんでした。もう一度お試しください。";
}

export function plannedDateRule(kind: string, existing: string | null, decided: string | null): "keep" | "set" | "confirm" {
  if (kind !== "facility" || !decided || existing === decided) return "keep";
  return existing ? "confirm" : "set";
}

export function shareState(c: Pick<Consultation, "status" | "share_enabled" | "share_expires_at" | "share_token_hash">, now: Date): "未発行" | "停止中" | "失効" | "共有中" {
  if (!c.share_token_hash) return "未発行";
  if (c.share_expires_at && !(Date.parse(c.share_expires_at) > now.getTime())) return "失効";
  return isShareActive(c, now) ? "共有中" : "停止中";
}

export function responseCounts(responses: ConsultationResponse[]) {
  return {
    unverified: responses.filter((r) => r.kind === "unverified" && r.status === "open").length,
    correction: responses.filter((r) => r.kind === "correction" && r.status === "open").length,
  };
}

export type OwnerConsultation = Omit<Consultation, "user_id" | "share_token_hash"> & { share_state: ReturnType<typeof shareState> };
export function ownerView(c: Consultation): OwnerConsultation {
  const { user_id: _user, share_token_hash: _hash, ...view } = c;
  void _user; void _hash;
  return { ...view, share_state: shareState(c, new Date()) };
}
