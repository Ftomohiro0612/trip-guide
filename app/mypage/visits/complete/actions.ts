"use server";

import facilitiesJson from "@/data/facilities_data.json";
import {
  buildCompletionSummary,
  childProgressCopy,
  type CompletionChild,
  type CompletionVisit,
} from "@/lib/visit-completion";
import { createClient } from "@/lib/supabase/server";
import { familyRevisitLabels, visitLabel } from "@/lib/visit-labels";

type FacilitySource = {
  slug: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
};

type VisitRow = {
  id: string;
  facility_slug: string;
  facility_name: string;
  visited_on: string | null;
  family_revisit: string | null;
  parent_memo: string | null;
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
      .select(
        "id, facility_slug, facility_name, visited_on, family_revisit, parent_memo, visit_children(child_id)",
      )
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

  const visitRows = (visitResult.data ?? []) as VisitRow[];
  const visits: CompletionVisit[] = visitRows.map((visit) => ({
      id: visit.id,
      facilitySlug: visit.facility_slug,
      childIds: (visit.visit_children ?? []).map((link) => link.child_id),
    }));
  const currentVisit = visits.find((visit) => visit.id === visitId);
  const currentVisitRow = visitRows.find((visit) => visit.id === visitId);
  if (!currentVisit || !currentVisitRow) return { status: "not_found" as const };

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
  const { data: photoRows } = await supabase
    .from("visit_photos")
    .select("thumb_path")
    .eq("visit_id", visitId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(3);
  const photoPaths = (photoRows ?? [])
    .map((photo) => photo.thumb_path)
    .filter((path): path is string => Boolean(path));
  const { data: signedPhotos } =
    photoPaths.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(photoPaths, 60 * 60)
      : { data: [] };
  const signedPhotoUrlByPath = new Map(
    (signedPhotos ?? []).map((photo) => [photo.path, photo.signedUrl]),
  );
  const revisit = currentVisitRow.family_revisit
    ? visitLabel(familyRevisitLabels, currentVisitRow.family_revisit)
    : null;

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
    memoryPreview: {
      facilityName: currentVisitRow.facility_name,
      visitedOn: currentVisitRow.visited_on?.replaceAll("-", ".") ?? "日付未設定",
      note: currentVisitRow.parent_memo?.trim() || null,
      revisit: revisit === "未記録" ? null : revisit,
      photoUrls: photoPaths
        .map((path) => signedPhotoUrlByPath.get(path) ?? null)
        .filter((url): url is string => Boolean(url)),
    },
  };
}
