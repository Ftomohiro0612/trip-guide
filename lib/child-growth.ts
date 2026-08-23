export type ChildGrowthRecord = {
  id: string;
  child_id: string;
  recorded_on: string;
  height_cm: number | string;
  created_at: string | null;
};

export function growthRecordHeight(record: ChildGrowthRecord): number | null {
  const height = Number(record.height_cm);
  return Number.isFinite(height) ? height : null;
}

export function formatHeightCm(height: number | string): string {
  return Number(height).toFixed(1);
}

export function findGrowthRecordOnOrBefore(
  records: ChildGrowthRecord[],
  childId: string,
  visitedOn: string | null,
): ChildGrowthRecord | null {
  if (!visitedOn) return null;

  let nearest: ChildGrowthRecord | null = null;
  for (const record of records) {
    if (record.child_id !== childId || record.recorded_on > visitedOn) continue;
    if (!nearest || record.recorded_on > nearest.recorded_on) {
      nearest = record;
    }
  }
  return nearest;
}
