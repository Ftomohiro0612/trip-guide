type VisitYearMonth = {
  year: number;
  month: number;
};

function visitYearMonth(visitedOn: string | null): VisitYearMonth | null {
  if (!visitedOn) return null;
  const match = /^(\d{4})-(\d{2})(?:-|$)/.exec(visitedOn);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function childAgeAtVisitInMonths(
  visitedOn: string | null,
  birthYear: number,
  birthMonth: number | null,
): number | null {
  const visit = visitYearMonth(visitedOn);
  if (
    !visit ||
    !Number.isInteger(birthYear) ||
    birthMonth === null ||
    !Number.isInteger(birthMonth) ||
    birthMonth < 1 ||
    birthMonth > 12
  ) {
    return null;
  }

  return Math.max(0, (visit.year - birthYear) * 12 + visit.month - birthMonth);
}

export function childAgeAtVisit(
  visitedOn: string | null,
  birthYear: number,
  birthMonth: number | null,
): number | null {
  const months = childAgeAtVisitInMonths(visitedOn, birthYear, birthMonth);
  if (months !== null) return Math.floor(months / 12);

  const visit = visitYearMonth(visitedOn);
  if (!visit || !Number.isInteger(birthYear)) return null;
  return Math.max(0, visit.year - birthYear);
}
