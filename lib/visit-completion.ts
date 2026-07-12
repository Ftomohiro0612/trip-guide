import { buildChildStats, type ChildVisitLink } from "@/lib/mypage-stats";
import {
  hasMeaningfulChildLikes,
  normalizeChildLikeCategory,
} from "@/lib/child-likes";

export type CompletionChild = {
  id: string;
  nickname: string;
  sortOrder: number;
};

export type CompletionVisit = {
  id: string;
  facilitySlug: string;
  childIds: string[];
};

export type CompletionChildProgress = CompletionChild & {
  visitCount: number;
  meaningfulLikes: boolean;
};

export type CompletionSummary = {
  familyTotal: number;
  children: CompletionChildProgress[];
  primaryChild: CompletionChildProgress | null;
};

export function buildCompletionSummary({
  currentVisitId,
  children,
  visits,
  categoryForSlug,
}: {
  currentVisitId: string;
  children: CompletionChild[];
  visits: CompletionVisit[];
  categoryForSlug: (slug: string) => string;
}): CompletionSummary {
  const currentVisit = visits.find((visit) => visit.id === currentVisitId);
  const currentChildIds = new Set(currentVisit?.childIds ?? []);
  const links: ChildVisitLink[] = visits.flatMap((visit) =>
    visit.childIds.map((childId) => ({ child_id: childId, visit_id: visit.id })),
  );
  const statsByChild = new Map(
    buildChildStats(children.map((child) => child.id), links).map((stats) => [
      stats.childId,
      stats,
    ]),
  );

  const progress = children
    .filter((child) => currentChildIds.has(child.id))
    .map((child) => {
      const categories = new Map<string, number>();
      for (const visit of visits) {
        if (!visit.childIds.includes(child.id)) continue;
        const category = normalizeChildLikeCategory(
          categoryForSlug(visit.facilitySlug),
        );
        categories.set(category, (categories.get(category) ?? 0) + 1);
      }
      const meaningfulLikes = hasMeaningfulChildLikes(
        Array.from(categories, ([category, count]) => ({ category, count })),
      );
      return {
        ...child,
        visitCount: statsByChild.get(child.id)?.visitCount ?? 0,
        meaningfulLikes,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.nickname.localeCompare(b.nickname, "ja"));

  const rankingReached = progress.find(
    (child) => child.visitCount === 10 && child.meaningfulLikes,
  );
  const reached = progress.find((child) => child.visitCount === 3);
  const approaching = progress
    .filter((child) => child.visitCount > 0 && child.visitCount < 3)
    .sort(
      (a, b) =>
        b.visitCount - a.visitCount ||
        a.sortOrder - b.sortOrder ||
        a.nickname.localeCompare(b.nickname, "ja"),
    )[0];
  const rankingApproaching = progress
    .filter(
      (child) =>
        child.visitCount >= 4 &&
        child.visitCount <= 9 &&
        child.meaningfulLikes,
    )
    .sort(
      (a, b) =>
        b.visitCount - a.visitCount ||
        a.sortOrder - b.sortOrder ||
        a.nickname.localeCompare(b.nickname, "ja"),
    )[0];

  return {
    familyTotal: visits.length,
    children: progress,
    primaryChild:
      rankingReached ?? reached ?? approaching ?? rankingApproaching ?? progress[0] ?? null,
  };
}

export function childProgressCopy(child: CompletionChildProgress): {
  progress: string;
  hint: string | null;
  showLikesLink: boolean;
} {
  if (child.visitCount === 1 || child.visitCount === 2) {
    const remaining = 3 - child.visitCount;
    return {
      progress: `${child.nickname}の記録が${child.visitCount}件たまりました`,
      hint: `あと${remaining}件で${child.nickname}の「好き」のヒントが見えはじめます`,
      showLikesLink: false,
    };
  }
  if (child.visitCount === 3) {
    return child.meaningfulLikes
      ? {
          progress: `${child.nickname}の「好き」のヒントが見えはじめました`,
          hint: null,
          showLikesLink: true,
        }
      : {
          progress: `${child.nickname}の記録が3件たまりました`,
          hint: null,
          showLikesLink: false,
        };
  }
  if (!child.meaningfulLikes) {
    return {
      progress: `${child.nickname}の記録が${child.visitCount}件になりました`,
      hint: null,
      showLikesLink: false,
    };
  }
  if (child.visitCount >= 4 && child.visitCount <= 9) {
    return {
      progress: `${child.nickname}の記録が${child.visitCount}件になりました`,
      hint: `あと${10 - child.visitCount}件で${child.nickname}の「好き」ランキング`,
      showLikesLink: true,
    };
  }
  if (child.visitCount === 10) {
    return {
      progress: `${child.nickname}の記録が10件たまりました。ランキングが出せます`,
      hint: null,
      showLikesLink: true,
    };
  }
  return {
    progress: `${child.nickname}の記録が${child.visitCount}件になりました`,
    hint: null,
    showLikesLink: child.visitCount >= 4,
  };
}
