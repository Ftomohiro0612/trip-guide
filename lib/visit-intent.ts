export function tokyoDate(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function plannedDateChoices(today = tokyoDate()) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return [
    { label: "今日", date: today },
    { label: "明日", date: shiftDate(today, 1) },
    { label: "今週末", date: shiftDate(today, (6 - weekday + 7) % 7) },
  ];
}

export type VisitIntent = {
  id: string;
  facility_slug: string;
  facility_name: string;
  planned_date: string | null;
  visit_prompt_shown_at: string | null;
  visit_prompt_dismissed_at: string | null;
};

export function selectVisitIntent(
  intents: VisitIntent[],
  visits: { facility_slug: string; visited_on: string | null }[],
  today = tokyoDate(),
): VisitIntent | null {
  return intents.filter((intent) => {
    const date = intent.planned_date;
    return date && date >= shiftDate(today, -7) && date <= shiftDate(today, -1)
      && !intent.visit_prompt_dismissed_at
      && (!intent.visit_prompt_shown_at || tokyoDate(new Date(intent.visit_prompt_shown_at)) !== today)
      && !visits.some((visit) => visit.facility_slug === intent.facility_slug
        && visit.visited_on && visit.visited_on >= shiftDate(date, -1));
  }).sort((a, b) => a.planned_date!.localeCompare(b.planned_date!) || a.id.localeCompare(b.id))[0] ?? null;
}
