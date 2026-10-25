"use server";

import { revalidatePath } from "next/cache";
import { validateCandidateInput, validateConsultationInput, validateResponseInput } from "@/lib/soudan/validation";
import { computeShareExpiry, isCalendarDate } from "@/lib/soudan/expiry";
import { generateShareToken, hashShareToken } from "@/lib/soudan/token";
import { buildShareUrl } from "@/lib/soudan/share-link";
import { candidateError, plannedDateRule, shareState } from "@/lib/soudan-owner";
import type { Consultation, ConsultationCandidate } from "@/lib/soudan/types";

import { addSoudanCandidate as addCandidate, listSoudanDestinations as listDestinations, failed, idValid, session, refresh } from "@/lib/soudan-owner-server";
import type { Result } from "@/lib/soudan-owner-server";

async function owned(id: string) {
  const { db, user } = await session();
  if (!user || !idValid(id)) return null;
  const { data, error } = await db.from("consultations").select("*").eq("id", id).eq("user_id", user.id).single();
  return error || !data ? null : { db, user, consultation: data as Consultation };
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

export async function listSoudanDestinations() {
  return listDestinations();
}

export async function addSoudanCandidate(input: { kind: "facility" | "event"; reference: string }, destination: string | null) {
  return addCandidate(input, destination);
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
