const JST_TIME_ZONE = "Asia/Tokyo";

const jstMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

export type FamilyStats = {
  totalVisitCount: number;
  distinctFacilityCount: number;
  thisMonthRecordedCount: number;
  thisMonthNewlyRecordedFacilityCount: number;
};

export type ChildStats = {
  childId: string;
  visitCount: number;
  stage: "none" | "pre_sprout" | "sprout" | "ranking";
};

export type RecordedVisit = {
  id: string;
  facility_slug: string;
  created_at: string;
};

export type ChildVisitLink = {
  child_id: string;
  visit_id: string;
};

function monthKey(date: Date): string {
  const parts = jstMonthFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new RangeError("JSTの年月を算出できませんでした");
  return `${year}-${month}`;
}

// 実行環境のローカルTZではなく、常にAsia/Tokyoの「今月」を返す。
export function currentMonthKeyJst(now: Date): string {
  if (Number.isNaN(now.getTime())) throw new RangeError("無効な日時です");
  return monthKey(now);
}

export function monthKeyOfJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new RangeError("無効なISO日時です");
  return monthKey(date);
}

export function buildFamilyStats(
  visits: RecordedVisit[],
  now: Date,
): FamilyStats {
  const currentMonth = currentMonthKeyJst(now);
  const firstRecordedAtByFacility = new Map<string, string>();

  for (const visit of visits) {
    const firstRecordedAt = firstRecordedAtByFacility.get(visit.facility_slug);
    if (!firstRecordedAt || new Date(visit.created_at) < new Date(firstRecordedAt)) {
      firstRecordedAtByFacility.set(visit.facility_slug, visit.created_at);
    }
  }

  return {
    totalVisitCount: visits.length,
    distinctFacilityCount: firstRecordedAtByFacility.size,
    thisMonthRecordedCount: visits.filter(
      (visit) => monthKeyOfJst(visit.created_at) === currentMonth,
    ).length,
    thisMonthNewlyRecordedFacilityCount: Array.from(
      firstRecordedAtByFacility.values(),
    ).filter((createdAt) => monthKeyOfJst(createdAt) === currentMonth).length,
  };
}

export function childStage(visitCount: number): ChildStats["stage"] {
  if (visitCount <= 0) return "none";
  if (visitCount <= 2) return "pre_sprout";
  if (visitCount <= 9) return "sprout";
  return "ranking";
}

export function buildChildStats(
  childIds: string[],
  childVisits: ChildVisitLink[],
): ChildStats[] {
  const visitIdsByChild = new Map<string, Set<string>>(
    childIds.map((childId) => [childId, new Set<string>()]),
  );
  for (const childVisit of childVisits) {
    visitIdsByChild.get(childVisit.child_id)?.add(childVisit.visit_id);
  }
  return childIds.map((childId) => {
    const visitCount = visitIdsByChild.get(childId)?.size ?? 0;
    return { childId, visitCount, stage: childStage(visitCount) };
  });
}
