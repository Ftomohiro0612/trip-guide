import facilitiesJson from "@/data/facilities_data.json";
import { normalizeChildLikeCategory } from "@/lib/child-likes";
import {
  buildFrequentInterestTagsByChild,
  buildVisitCategoryCountsByChild,
  filterChildLikeVisits,
  type ChildInsightVisit,
  type FrequentInterestTag,
  type VisitCategoryCount,
} from "@/lib/child-insights";
import { buildChildStats, type ChildStats } from "@/lib/mypage-stats";

export type ChildInsightSummaryChild = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  avatar_url: string | null;
};

export type ChildInsightSummaryVisit = {
  id: string;
  facility_slug: string;
};

export type ChildInsightSummary<
  TChild extends ChildInsightSummaryChild = ChildInsightSummaryChild,
> = {
  child: TChild;
  anchorId: string;
  visitCount: number;
  stage: ChildStats["stage"];
  visitCategories: VisitCategoryCount[];
  frequentInterests: FrequentInterestTag[];
};

type FacilityCategorySource = { slug: string; category: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFacilityCategorySource(
  value: unknown,
): value is FacilityCategorySource {
  return (
    isRecord(value) &&
    typeof value.slug === "string" &&
    typeof value.category === "string"
  );
}

function getFacilityCategorySources(value: unknown): FacilityCategorySource[] {
  if (!isRecord(value) || !Array.isArray(value.facilities)) return [];
  return value.facilities.filter(isFacilityCategorySource);
}

const slugToCategory = new Map(
  getFacilityCategorySources(facilitiesJson).map((facility) => [
    facility.slug,
    facility.category,
  ]),
);

export function childInsightCategoryForSlug(slug: string): string {
  if (slug.startsWith("manual-")) return "その他";
  return slugToCategory.get(slug) ?? "その他";
}

export function compareChildInsightCategoryEntries(
  a: { category: string; count: number },
  b: { category: string; count: number },
): number {
  const aOther = a.category === "その他";
  const bOther = b.category === "その他";
  if (aOther !== bOther) return aOther ? 1 : -1;
  return b.count - a.count || a.category.localeCompare(b.category, "ja");
}

export function buildChildInsightSummaries<
  TChild extends ChildInsightSummaryChild,
>(
  children: TChild[],
  visits: ChildInsightSummaryVisit[],
  childVisits: ChildInsightVisit[],
): ChildInsightSummary<TChild>[] {
  const eligibleChildVisits = filterChildLikeVisits(childVisits);
  const categoryByVisitId = new Map(
    visits.map((visit) => [
      visit.id,
      normalizeChildLikeCategory(
        childInsightCategoryForSlug(visit.facility_slug),
      ),
    ]),
  );
  const visitCategoriesByChild = buildVisitCategoryCountsByChild(
    childVisits,
    categoryByVisitId,
  );

  const statsByChild = new Map(
    buildChildStats(
      children.map((child) => child.id),
      eligibleChildVisits,
    ).map((stats) => [stats.childId, stats]),
  );
  const frequentInterestsByChild =
    buildFrequentInterestTagsByChild(eligibleChildVisits);

  return children.map((child, index) => {
    const stats = statsByChild.get(child.id) ?? {
      childId: child.id,
      visitCount: 0,
      stage: "none" as const,
    };
    return {
      child,
      anchorId: `child-likes-${index + 1}`,
      visitCount: stats.visitCount,
      stage: stats.stage,
      visitCategories: (visitCategoriesByChild.get(child.id) ?? []).sort(
        compareChildInsightCategoryEntries,
      ),
      frequentInterests: frequentInterestsByChild.get(child.id) ?? [],
    };
  });
}
