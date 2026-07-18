"use server";

import facilitiesJson from "@/data/facilities_data.json";
import {
  buildCompletionSummary,
  childProgressCopy,
  type CompletionChild,
  type CompletionVisit,
} from "@/lib/visit-completion";
import { createClient } from "@/lib/supabase/server";

type FacilitySource = {
  slug: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
};

type VisitRow = {
  id: string;
  facility_slug: string;
  visit_children: { child_id: string }[] | null;
};

const facilities = (facilitiesJson as { facilities?: FacilitySource[] }).facilities ?? [];
const facilityBySlug = new Map(facilities.map((facility) => [facility.slug, facility]));

export async function loadVisitCompletion(visitId: string, batchIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "unauthenticated" as const };

  const safeBatchIds = Array.from(new Set(batchIds))
    .filter((id) => id !== visitId && /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 10);
  const [visitResult, childrenResult, siblingResult] = await Promise.all([
    supabase
      .from("visits")
      .select("id, facility_slug, visit_children(child_id)")
      .eq("user_id", user.id)
      .eq("status", "published"),
    supabase
      .from("children")
      .select("id, nickname, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    safeBatchIds.length > 0
      ? supabase
          .from("visits")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "draft")
          .in("id", safeBatchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (visitResult.error || childrenResult.error || siblingResult.error) {
    return { status: "error" as const };
  }

  const visits: CompletionVisit[] = ((visitResult.data ?? []) as VisitRow[]).map(
    (visit) => ({
      id: visit.id,
      facilitySlug: visit.facility_slug,
      childIds: (visit.visit_children ?? []).map((link) => link.child_id),
    }),
  );
  const currentVisit = visits.find((visit) => visit.id === visitId);
  if (!currentVisit) return { status: "not_found" as const };

  const children: CompletionChild[] = (childrenResult.data ?? []).map((child) => ({
    id: child.id,
    nickname: child.nickname,
    sortOrder: child.sort_order ?? 0,
  }));
  const summary = buildCompletionSummary({
    currentVisitId: visitId,
    children,
    visits,
    categoryForSlug: (slug) =>
      slug.startsWith("manual-") ? "その他" : facilityBySlug.get(slug)?.category ?? "その他",
  });
  const displayChild =
    summary.primaryChild ?? (summary.children.length === 1 ? summary.children[0] : null);
  const facility = facilityBySlug.get(currentVisit.facilitySlug);
  const remainingDraftIds = safeBatchIds.filter((id) =>
    (siblingResult.data ?? []).some((visit) => visit.id === id),
  );

  return {
    status: "ok" as const,
    familyTotal: summary.familyTotal,
    children: summary.children.map(({ id, nickname, visitCount }) => ({
      id,
      nickname,
      visitCount,
    })),
    displayChildSlot: displayChild
      ? children.findIndex((child) => child.id === displayChild.id) + 1
      : null,
    primaryCopy: displayChild ? childProgressCopy(displayChild) : null,
    hasCoordinates: Boolean(facility?.latitude && facility?.longitude),
    remainingDraftIds,
  };
}
