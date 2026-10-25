import "server-only";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateCandidateInput, validateConsultationInput } from "@/lib/soudan/validation";
import { buildEventSnapshot, buildFacilitySnapshot } from "@/lib/soudan/snapshot";
import { candidateError, defaultSoudanTitle, openDestinations, profileAgeBands } from "@/lib/soudan-owner";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
export const failed = (error = "保存できませんでした。もう一度お試しください。"): { ok: false; error: string } => ({ ok: false, error });
export const idValid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export async function session() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return { db, user };
}
export function refresh(id: string) {
  revalidatePath("/mypage/soudan");
  revalidatePath(`/mypage/soudan/${id}`);
}
async function ageConditions(db: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await db.from("children").select("birth_year,birth_month").eq("user_id", userId);
  if (error) throw new Error("children_read_failed");
  return { ageBands: profileAgeBands(data ?? []) };
}

export type SoudanCandidateRequest = { kind: "facility" | "event"; reference: string; destination: string | null };
export function isSoudanCandidateRequest(input: unknown): input is SoudanCandidateRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  return (value.kind === "facility" || value.kind === "event") &&
    typeof value.reference === "string" && value.reference.length > 0 && value.reference.length <= 300 &&
    (value.destination === null || idValid(value.destination));
}

export async function listSoudanDestinations(): Promise<Result<{ items: { id: string; title: string; updated_at: string; status: "open" }[] }>> {
  const { db, user } = await session();
  if (!user) return failed("ログインしてください。");
  const { data, error } = await db.from("consultations").select("id,title,updated_at,status").eq("user_id", user.id).eq("status", "open").order("updated_at", { ascending: false });
  if (error) return failed("相談を読み込めませんでした。");
  return { ok: true, items: openDestinations(data ?? []) };
}

export async function addSoudanCandidate(input: { kind: "facility" | "event"; reference: string }, destination: string | null): Promise<Result<{ id: string; title: string; created: boolean }>> {
  if (!isSoudanCandidateRequest({ ...input, destination })) return failed();
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
