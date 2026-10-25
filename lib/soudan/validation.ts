import {
  AGE_BANDS, CANDIDATE_KINDS, CANDIDATE_STATUSES, CORRECTION_FIELDS, LIMITS, REACTIONS, RESPONSE_KINDS,
} from "./types";
import type { Conditions, ConsultationCandidate, ResponseError, ResponseInput } from "./types";
import { isCalendarDate } from "./expiry";

export type ValidationResult<T, E extends string = string> = { ok: true; value: T } | { ok: false; error: E };
const fail = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const member = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === "string" && values.includes(value as T);
/** PostgreSQL char_length counts Unicode code points, not UTF-16 code units. */
export const characterCount = (value: string): number => [...value].length;
const text = (value: unknown, min: number, max: number): value is string => typeof value === "string" && !value.includes("\0") && characterCount(value) >= min && characterCount(value) <= max;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function isHttpUrl(value: unknown, maxLength?: number): value is string {
  if (typeof value !== "string" || (maxLength !== undefined && characterCount(value) > maxLength) || !/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/u.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export const normalizeAuthorLabel = (value: string): string => value.trim();

/** Unknown keys are discarded; invalid known fields are reported, never coerced. */
export function validateConditions(input: unknown): ValidationResult<Conditions> {
  if (!object(input)) return fail("invalid_conditions");
  const value: Conditions = {};
  for (const key of ["dates", "areas"] as const) {
    if (input[key] === undefined) continue;
    const list = input[key];
    if (!Array.isArray(list) || list.length > LIMITS.conditionList || !list.every((item) => text(item, 1, LIMITS.conditionLabel) && (key !== "dates" || isCalendarDate(item)))) return fail(`invalid_${key}`);
    value[key] = [...list];
  }
  for (const key of ["budget", "travelTime", "note"] as const) {
    if (input[key] === undefined) continue;
    if (!text(input[key], 0, key === "note" ? LIMITS.note : LIMITS.conditionLabel)) return fail(`invalid_${key}`);
    value[key] = input[key];
  }
  if (input.ageBands !== undefined) {
    if (!Array.isArray(input.ageBands) || input.ageBands.length > AGE_BANDS.length || !input.ageBands.every((band) => member(AGE_BANDS, band))) return fail("invalid_ageBands");
    value.ageBands = [...input.ageBands];
  }
  if (input.rainOk !== undefined) {
    if (typeof input.rainOk !== "boolean") return fail("invalid_rainOk");
    value.rainOk = input.rainOk;
  }
  return { ok: true, value };
}

export function validateConsultationInput(input: unknown): ValidationResult<{ title: string; conditions: Conditions }> {
  if (!object(input) || !text(input.title, 1, LIMITS.consultationTitle)) return fail("invalid_title");
  const conditions = validateConditions(input.conditions ?? {});
  return conditions.ok ? { ok: true, value: { title: input.title, conditions: conditions.value } } : conditions;
}

type CandidateInput = Pick<ConsultationCandidate, "kind" | "title" | "facility_slug" | "event_id" | "external_url" | "status" | "reason" | "research_note" | "concern" | "reject_reason" | "sort_order">;
export function validateCandidateInput(input: unknown): ValidationResult<CandidateInput> {
  if (!object(input) || !member(CANDIDATE_KINDS, input.kind)) return fail("invalid_kind");
  if (!text(input.title, 1, LIMITS.candidateTitle)) return fail("invalid_title");
  const status = input.status ?? "candidate";
  if (!member(CANDIDATE_STATUSES, status)) return fail("invalid_status");
  const sortOrder = input.sort_order ?? 0;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < -2147483648 || sortOrder > 2147483647) return fail("invalid_sort_order");
  const value: CandidateInput = { kind: input.kind, title: input.title, status, sort_order: sortOrder, facility_slug: null, event_id: null, external_url: null, reason: null, research_note: null, concern: null, reject_reason: null };
  for (const key of ["facility_slug", "event_id", "external_url"] as const) {
    if (input[key] == null) continue;
    if (!text(input[key], 1, Number.MAX_SAFE_INTEGER) || (key === "external_url" && !isHttpUrl(input[key]))) return fail(`invalid_${key}`);
    value[key] = input[key];
  }
  const required = { facility: "facility_slug", event: "event_id", external: "external_url" } as const;
  if (!value[required[value.kind]]) return fail(`invalid_${required[value.kind]}`);
  for (const key of ["reason", "research_note", "concern", "reject_reason"] as const) {
    if (input[key] == null) continue;
    if (!text(input[key], 0, LIMITS.note)) return fail(`invalid_${key}`);
    value[key] = input[key];
  }
  return { ok: true, value };
}

/** Ownership/membership and reply target kind must additionally be checked by the DB. */
export function validateResponseInput(input: unknown): ValidationResult<ResponseInput, ResponseError> {
  if (!object(input) || !member(RESPONSE_KINDS, input.kind)) return fail("invalid_kind");
  const body = input.body ?? "";
  const reaction = input.reaction ?? null;
  if (!text(body, 0, LIMITS.body) || (reaction === null && !body.trim())) return fail("invalid_body");
  if (typeof input.author_label !== "string") return fail("invalid_author_label");
  const author = normalizeAuthorLabel(input.author_label);
  if (!text(author, 1, LIMITS.authorLabel)) return fail("invalid_author_label");
  const sourceUrl = input.source_url ?? null;
  if (sourceUrl !== null && !isHttpUrl(sourceUrl, LIMITS.sourceUrl)) return fail("invalid_source_url");
  const field = input.correction_field ?? null;
  if (field !== null && (input.kind !== "correction" || !member(CORRECTION_FIELDS, field))) return fail("invalid_correction_field");
  if (reaction !== null && !member(REACTIONS, reaction)) return fail("invalid_reaction");
  const candidate = input.candidate_id ?? null;
  if (candidate !== null && !uuid(candidate)) return fail("invalid_candidate");
  const reply = input.reply_to_id ?? null;
  if (reply !== null && (!uuid(reply) || input.kind !== "finding")) return fail("invalid_reply");
  return { ok: true, value: { candidate_id: candidate, kind: input.kind, body, author_label: author, correction_field: field, reaction, source_url: sourceUrl, reply_to_id: reply } };
}
