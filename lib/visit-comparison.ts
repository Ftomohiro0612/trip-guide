export type VisitChronologyItem = {
  id: string;
  visited_on: string | null;
  created_at: string | null;
};

export function compareVisitChronology(
  left: VisitChronologyItem,
  right: VisitChronologyItem,
): number {
  if (left.visited_on !== right.visited_on) {
    if (left.visited_on === null) return 1;
    if (right.visited_on === null) return -1;

    const visitedOnOrder = left.visited_on.localeCompare(right.visited_on);
    if (visitedOnOrder !== 0) return visitedOnOrder;
  }

  const createdAtOrder = (left.created_at ?? "").localeCompare(
    right.created_at ?? "",
  );
  if (createdAtOrder !== 0) return createdAtOrder;

  return left.id.localeCompare(right.id);
}

export function findPreviousVisit<T extends VisitChronologyItem>(
  currentVisit: T,
  publishedOtherVisits: T[],
): T | null {
  const chronology = [...publishedOtherVisits, currentVisit].sort(
    compareVisitChronology,
  );
  const currentIndex = chronology.findIndex(
    (visit) => visit.id === currentVisit.id,
  );

  return currentIndex > 0 ? chronology[currentIndex - 1] : null;
}

function dateOnlyToUtcMilliseconds(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function visitGapInDays(
  previousVisitedOn: string | null,
  currentVisitedOn: string | null,
): number | null {
  if (!previousVisitedOn || !currentVisitedOn) return null;

  const previous = dateOnlyToUtcMilliseconds(previousVisitedOn);
  const current = dateOnlyToUtcMilliseconds(currentVisitedOn);
  if (previous === null || current === null || current < previous) return null;

  return Math.round((current - previous) / (24 * 60 * 60 * 1000));
}

export function formatVisitDuration(minutes: number | null): string {
  if (!minutes) return "未記録";
  const durationLabels: Record<number, string> = {
    60: "〜1時間",
    150: "2〜3時間",
    270: "4〜5時間",
    360: "6時間以上",
  };
  return durationLabels[minutes] ?? `${minutes}分`;
}
