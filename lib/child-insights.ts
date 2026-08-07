export type ChildInsightReactionTag = {
  id: string;
  label: string;
  tag_type: string;
  sort_order: number;
};

export type ChildInsightTagLink = {
  tag_id: string;
  reaction_tags:
    | ChildInsightReactionTag
    | ChildInsightReactionTag[]
    | null;
};

export type ChildInsightVisit = {
  child_id: string;
  visit_id: string;
  satisfaction: string | null;
  visit_child_tags: ChildInsightTagLink[] | null;
};

export type FrequentInterestTag = {
  id: string;
  label: string;
  count: number;
  sortOrder: number;
};

export type VisitCategoryCount = {
  category: string;
  count: number;
};

function reactionTagOf(
  relation: ChildInsightTagLink["reaction_tags"],
): ChildInsightReactionTag | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

function hasInterestTag(
  visit: Pick<ChildInsightVisit, "visit_child_tags">,
): boolean {
  return (visit.visit_child_tags ?? []).some(
    (link) => reactionTagOf(link.reaction_tags)?.tag_type === "interest",
  );
}

export function isChildLikeEligibleVisit(
  visit: Pick<ChildInsightVisit, "satisfaction" | "visit_child_tags">,
): boolean {
  return (
    (visit.satisfaction === "loved" || visit.satisfaction === "enjoyed") &&
    hasInterestTag(visit)
  );
}

export function filterChildLikeVisits<
  T extends Pick<ChildInsightVisit, "satisfaction" | "visit_child_tags">,
>(
  visits: readonly T[],
): T[] {
  return visits.filter(isChildLikeEligibleVisit);
}

export function buildVisitCategoryCountsByChild(
  visits: readonly Pick<ChildInsightVisit, "child_id" | "visit_id">[],
  categoryByVisitId: ReadonlyMap<string, string>,
): Map<string, VisitCategoryCount[]> {
  const countsByChild = new Map<string, Map<string, number>>();
  const seenChildVisits = new Set<string>();

  for (const visit of visits) {
    const category = categoryByVisitId.get(visit.visit_id);
    if (!category) continue;

    const childVisitKey = `${visit.child_id}\u0000${visit.visit_id}`;
    if (seenChildVisits.has(childVisitKey)) continue;
    seenChildVisits.add(childVisitKey);

    const childCounts = countsByChild.get(visit.child_id) ?? new Map();
    childCounts.set(category, (childCounts.get(category) ?? 0) + 1);
    countsByChild.set(visit.child_id, childCounts);
  }

  return new Map(
    Array.from(countsByChild.entries()).map(([childId, counts]) => [
      childId,
      Array.from(counts, ([category, count]) => ({ category, count })),
    ]),
  );
}

export function buildFrequentInterestTagsByChild(
  visits: readonly ChildInsightVisit[],
): Map<string, FrequentInterestTag[]> {
  const countsByChild = new Map<
    string,
    Map<string, Omit<FrequentInterestTag, "count"> & { count: number }>
  >();
  const seenVisitTags = new Set<string>();

  for (const visit of visits) {
    if (!isChildLikeEligibleVisit(visit)) continue;
    for (const link of visit.visit_child_tags ?? []) {
      const tag = reactionTagOf(link.reaction_tags);
      if (!tag || tag.tag_type !== "interest") continue;

      const visitTagKey = `${visit.child_id}\u0000${visit.visit_id}\u0000${tag.id}`;
      if (seenVisitTags.has(visitTagKey)) continue;
      seenVisitTags.add(visitTagKey);

      const childCounts = countsByChild.get(visit.child_id) ?? new Map();
      const current = childCounts.get(tag.id);
      childCounts.set(tag.id, {
        id: tag.id,
        label: tag.label,
        sortOrder: tag.sort_order,
        count: (current?.count ?? 0) + 1,
      });
      countsByChild.set(visit.child_id, childCounts);
    }
  }

  return new Map(
    Array.from(countsByChild.entries()).map(([childId, counts]) => [
      childId,
      Array.from(counts.values())
        .filter(({ count }) => count >= 2)
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.sortOrder - b.sortOrder ||
            a.id.localeCompare(b.id),
        )
        .slice(0, 5),
    ]),
  );
}
