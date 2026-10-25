"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCandidateInput, validateConsultationInput, validateResponseInput } from "@/lib/soudan/validation";
import { computeShareExpiry, isCalendarDate } from "@/lib/soudan/expiry";
import { generateShareToken, hashShareToken } from "@/lib/soudan/token";
import { buildShareUrl } from "@/lib/soudan/share-link";
import { buildEventSnapshot, buildFacilitySnapshot } from "@/lib/soudan/snapshot";
import { candidateError, defaultSoudanTitle, openDestinations, plannedDateRule, profileAgeBands, shareState } from "@/lib/soudan-owner";
import type { Consultation, ConsultationCandidate } from "@/lib/soudan/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const failed = (error = "保存できませんでした。もう一度お試しください。"): { ok: false; error: string } => ({ ok: false, error });
const idValid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
async function session() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return { db, user };
}
async function owned(id: string) {
  const { db, user } = await session();
  if (!user || !idValid(id)) return null;
  const { data, error } = await db.from("consultations").select("*").eq("id", id).eq("user_id", user.id).single();
  return error || !data ? null : { db, user, consultation: data as Consultation };
}
function refresh(id: string) {
  revalidatePath("/mypage/soudan");
  revalidatePath(`/mypage/soudan/${id}`);
}
async function ageConditions(db: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await db.from("children").select("birth_year,birth_month").eq("user_id", userId);
  if (error) throw new Error("children_read_failed");
  return { ageBands: profileAgeBands(data ?? []) };
}

export async function createSoudan(input: unknown): Promise<Result<{ id: string }>> {
  const valid = validateConsultationInput(input);
  if (!valid.ok) return failed("タイトルと希望条件を確認してください。");
  const { db, user } = await session();
  if (!user) return failed("ログインしてください。");
  const { data, error } = await db.from("consultations").insert({ ...valid.value, user_id: user.id }).select("id").single();
  if (error) return failed();
  refresh(data.id);
  return { ok: true, id: data.id };
}

export async function saveSoudan(id: string, input: unknown): Promise<Result> {
  const valid = validateConsultationInput(input);
  if (!valid.ok) return failed("タイトルと希望条件を確認してください。");
  const ctx = await owned(id);
  if (!ctx) return failed();
  const { error } = await ctx.db.from("consultations").update(valid.value).eq("id", id).select("id").single();
  if (error) return failed();
  refresh(id);
  return { ok: true };
}

export async function listSoudanDestinations(): Promise<Result<{ items: { id: string; title: string; updated_at: string; status: "open" }[] }>> {
  const { db, user } = await session();
  if (!user) return failed("ログインしてください。");
  const { data, error } = await db.from("consultations").select("id,title,updated_at,status").eq("user_id", user.id).eq("status", "open").order("updated_at", { ascending: false });
  if (error) return failed("相談を読み込めませんでした。");
  return { ok: true, items: openDestinations(data ?? []) };
}

export async function addSoudanCandidate(input: { kind: "facility" | "event"; reference: string }, destination: string | null): Promise<Result<{ id: string; title: string; created: boolean }>> {
  if (!input || !["facility", "event"].includes(input.kind) || typeof input.reference !== "string" || input.reference.length > 300 || (destination !== null && !idValid(destination))) return failed();
  const { db, user } = await session();
  if (!user) return failed("ログインしてください。");
  // Resolve canon only on a click, never during facility static generation or in a client bundle.
  let candidate;
  let snapshot;
  if (input.kind === "facility") {
    const { getFacilityBySlug, isFacilityVisible } = await import("@/lib/facilities");
    const facility = getFacilityBySlug(input.reference);
    if (!isFacilityVisible(facility)) return failed("この施設は候補に入れられません。");
    snapshot = buildFacilitySnapshot(facility);
    candidate = validateCandidateInput({ kind: "facility", facility_slug: facility.slug, title: facility.name });
  } else {
    const { getEventById, toEventView } = await import("@/lib/events");
    const event = getEventById(input.reference);
    if (!event || !["scheduled", "ongoing", "ended"].includes(event.status)) return failed("このイベントは候補に入れられません。");
    snapshot = buildEventSnapshot(toEventView(event));
    candidate = validateCandidateInput({ kind: "event", event_id: event.id, title: event.title });
  }
  if (!candidate.ok) return failed("この候補は追加できません。");
  let parent;
  let created = false;
  if (destination) {
    const { data, error } = await db.from("consultations").select("id,title,status").eq("id", destination).eq("user_id", user.id).single();
    if (error || data?.status !== "open") return failed("進行中の相談を選んでください。");
    parent = data;
  } else {
    let conditions;
    try { conditions = await ageConditions(db, user.id); } catch { return failed(); }
    const valid = validateConsultationInput({ title: defaultSoudanTitle(), conditions });
    if (!valid.ok) return failed();
    const { data, error } = await db.from("consultations").insert({ ...valid.value, user_id: user.id }).select("id,title").single();
    if (error) return failed();
    parent = data; created = true;
  }
  const { data: last, error: orderError } = await db.from("consultation_candidates").select("sort_order").eq("consultation_id", parent.id).order("sort_order", { ascending: false }).limit(1);
  if (orderError) {
    if (created) await db.from("consultations").delete().eq("id", parent.id);
    return failed();
  }
  const { error } = await db.from("consultation_candidates").insert({ ...candidate.value, sort_order: (last?.[0]?.sort_order ?? -1) + 1, consultation_id: parent.id, snapshot });
  if (error) {
    if (created) await db.from("consultations").delete().eq("id", parent.id);
    return failed(candidateError(error));
  }
  await db.from("consultations").update({ updated_at: new Date().toISOString() }).eq("id", parent.id);
  refresh(parent.id);
  return { ok: true, id: parent.id, title: parent.title, created };
}

export async function saveCandidate(id: string, candidateId: string | null, input: unknown): Promise<Result> {
  const valid = validateCandidateInput(input);
  if (!valid.ok) return failed("候補の入力を確認してください。");
  const ctx = await owned(id);
  if (!ctx || (candidateId !== null && !idValid(candidateId))) return failed();
  if (candidateId) {
    const { data: existing, error } = await ctx.db.from("consultation_candidates").select("*").eq("id", candidateId).eq("consultation_id", id).single();
    if (error || !existing) return failed();
    // Only editorial fields can change; identity/snapshot are preserved.
    const { reason, research_note, concern, reject_reason, status } = valid.value;
    const result = await ctx.db.from("consultation_candidates").update({ reason, research_note, concern, reject_reason: status === "rejected" ? reject_reason : null, status }).eq("id", candidateId).eq("consultation_id", id).select("id").single();
    if (result.error) return failed(candidateError(result.error));
  } else {
    if (valid.value.kind !== "external" || ctx.consultation.status !== "open") return failed("進行中の相談に追加してください。");
    const { data: last, error: orderError } = await ctx.db.from("consultation_candidates").select("sort_order").eq("consultation_id", id).order("sort_order", { ascending: false }).limit(1);
    if (orderError) return failed();
    const { error } = await ctx.db.from("consultation_candidates").insert({ ...valid.value, sort_order: (last?.[0]?.sort_order ?? -1) + 1, consultation_id: id, snapshot: {} });
    if (error) return failed(candidateError(error));
  }
  await ctx.db.from("consultations").update({ updated_at: new Date().toISOString() }).eq("id", id);
  refresh(id);
  return { ok: true };
}

export async function moveCandidate(id: string, candidateId: string, direction: -1 | 1): Promise<Result> {
  const ctx = await owned(id);
  if (!ctx || !idValid(candidateId) || ![-1, 1].includes(direction)) return failed();
  const { data, error } = await ctx.db.from("consultation_candidates").select("id,sort_order,created_at").eq("consultation_id", id).order("sort_order").order("created_at").order("id");
  if (error || !data) return failed();
  const index = data.findIndex((c) => c.id === candidateId);
  if (index < 0 || !data[index + direction]) return failed();
  [data[index], data[index + direction]] = [data[index + direction], data[index]];
  // The bounded list (30 max) is normalized so ties never make a button a no-op.
  for (const [sort_order, candidate] of data.entries()) {
    if (candidate.sort_order === sort_order) continue;
    const result = await ctx.db.from("consultation_candidates").update({ sort_order }).eq("id", candidate.id).eq("consultation_id", id).select("id").single();
    if (result.error) { refresh(id); return failed(); }
  }
  await ctx.db.from("consultations").update({ updated_at: new Date().toISOString() }).eq("id", id);
  refresh(id);
  return { ok: true };
}

export async function addOwnerResponse(id: string, input: unknown): Promise<Result> {
  const valid = validateResponseInput(input);
  if (!valid.ok || !["finding", "unverified"].includes(valid.value.kind)) return failed("書き込みの入力を確認してください。");
  const ctx = await owned(id);
  if (!ctx) return failed();
  if (valid.value.reply_to_id) {
    const { data } = await ctx.db.from("consultation_responses").select("candidate_id,kind").eq("id", valid.value.reply_to_id).eq("consultation_id", id).single();
    if (!data || data.kind !== "unverified" || data.candidate_id !== valid.value.candidate_id) return failed();
  }
  const { error } = await ctx.db.from("consultation_responses").insert({ ...valid.value, source: "owner", consultation_id: id });
  if (error) return failed();
  refresh(id); return { ok: true };
}

export async function changeResponse(id: string, responseId: string, operation: "resolve" | "reopen" | "delete"): Promise<Result> {
  const ctx = await owned(id);
  if (!ctx || !idValid(responseId) || !["resolve", "reopen", "delete"].includes(operation)) return failed();
  const { data: row } = await ctx.db.from("consultation_responses").select("kind").eq("id", responseId).eq("consultation_id", id).single();
  if (!row || (operation !== "delete" && !["unverified", "correction"].includes(row.kind))) return failed();
  const query = operation === "delete" ? ctx.db.from("consultation_responses").delete() : ctx.db.from("consultation_responses").update({ status: operation === "resolve" ? "resolved" : "open", resolved_at: operation === "resolve" ? new Date().toISOString() : null });
  const { error } = await query.eq("id", responseId).eq("consultation_id", id).select("id").single();
  if (error) return failed();
  refresh(id); return { ok: true };
}

export async function changeShare(id: string, operation: "issue" | "stop" | "resume"): Promise<Result<{ url?: string }>> {
  const ctx = await owned(id);
  if (!ctx || !["issue", "stop", "resume"].includes(operation)) return failed();
  const c = ctx.consultation;
  if (operation !== "stop" && c.status === "archived") return failed("アーカイブ中は共有できません。");
  if (operation === "resume" && ["失効", "未発行"].includes(shareState(c, new Date()))) return failed("リンクを再発行してください。");
  let url;
  let patch;
  if (operation === "issue") {
    const token = generateShareToken();
    patch = { share_token_hash: await hashShareToken(token), share_enabled: true, share_expires_at: c.status === "decided" ? computeShareExpiry({ decidedDate: c.decided_date, now: new Date() }) : null };
    url = buildShareUrl(token);
  } else patch = { share_enabled: operation === "resume" };
  const { error } = await ctx.db.from("consultations").update(patch).eq("id", id).select("id").single();
  if (error) return failed();
  refresh(id); return { ok: true, ...(url ? { url } : {}) };
}

export async function changeConsultationState(id: string, operation: "archive" | "restore" | "undo"): Promise<Result> {
  const ctx = await owned(id);
  if (!ctx || !["archive", "restore", "undo"].includes(operation)) return failed();
  if ((operation === "undo" && ctx.consultation.status !== "decided") || (operation === "restore" && ctx.consultation.status !== "archived")) return failed("相談の状態が更新されました。読み込み直してください。");
  const patch = operation === "archive" ? { status: "archived", share_enabled: false } : operation === "undo" ? { status: "open", decided_candidate_id: null, decided_date: null, share_expires_at: null } : { status: ctx.consultation.decided_candidate_id ? "decided" : "open" };
  const { error } = await ctx.db.from("consultations").update(patch).eq("id", id).select("id").single();
  if (error) return failed();
  refresh(id); return { ok: true };
}

export async function decideSoudan(id: string, candidateId: string, date: string | null, confirmedExistingDate?: string): Promise<Result<{ conflict?: string }>> {
  if (!idValid(candidateId) || (date !== null && !isCalendarDate(date)) || (confirmedExistingDate !== undefined && !isCalendarDate(confirmedExistingDate))) return failed("日付を確認してください。");
  const ctx = await owned(id);
  if (!ctx || ctx.consultation.status === "archived") return failed();
  const { data, error } = await ctx.db.from("consultation_candidates").select("*").eq("id", candidateId).eq("consultation_id", id).single();
  if (error || !data) return failed();
  const candidate = data as ConsultationCandidate;
  if (candidate.kind === "facility" && candidate.facility_slug) {
    const db = ctx.db;
    const { data: wish, error: wishError } = await db.from("wishlists").select("id,planned_date").eq("user_id", ctx.user.id).eq("facility_slug", candidate.facility_slug).maybeSingle();
    if (wishError) return failed();
    const rule = plannedDateRule(candidate.kind, wish?.planned_date ?? null, date);
    if (rule === "confirm" && confirmedExistingDate !== wish?.planned_date) return { ok: true, conflict: wish!.planned_date };
    if (!wish) {
      const result = await db.from("wishlists").insert({ user_id: ctx.user.id, facility_slug: candidate.facility_slug, facility_name: candidate.title, ...(date ? { planned_date: date } : {}) });
      if (result.error) return failed("行きたいリストが更新されました。もう一度決定してください。");
    } else if (rule !== "keep") {
      let query = db.from("wishlists").update({ planned_date: date }).eq("id", wish.id).eq("user_id", ctx.user.id);
      query = wish.planned_date ? query.eq("planned_date", wish.planned_date) : query.is("planned_date", null);
      const result = await query.select("id").single();
      if (result.error) return failed("予定日が更新されました。もう一度決定してください。");
    }
  }
  const result = await ctx.db.from("consultations").update({ status: "decided", decided_candidate_id: candidateId, decided_date: date, share_expires_at: computeShareExpiry({ decidedDate: date, now: new Date() }) }).eq("id", id).select("id").single();
  if (result.error) return failed(candidate.kind === "facility" ? "行きたいリストは保存済みです。相談の決定をもう一度お試しください。" : "相談の決定を保存できませんでした。もう一度お試しください。");
  refresh(id); revalidatePath("/mypage/wishlist"); revalidatePath("/mypage");
  return { ok: true };
}
