type Candidate = { slug: string; recommended_for_tags?: string[] };
type Visit = { facilitySlug: string; childIds: string[] };

export function nextVisitCandidate<T extends Candidate>(
  facilities: T[], currentSlug: string, childId: string | null, visits: Visit[],
): T | null {
  if (!childId) return null;
  const current = facilities.find((facility) => facility.slug === currentSlug);
  if (!current?.recommended_for_tags?.length) return null;
  const visited = new Set(visits.filter((visit) => visit.childIds.includes(childId)).map((visit) => visit.facilitySlug));
  return facilities.find((facility) => facility.slug !== currentSlug && !visited.has(facility.slug)
    && facility.recommended_for_tags?.some((tag) => current.recommended_for_tags!.includes(tag))) ?? null;
}
