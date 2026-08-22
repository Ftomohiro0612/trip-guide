import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getFacilityForEvent,
  getNextEventDate,
  getVisibleEvents,
  toEventView,
  type EventItem,
} from "@/lib/events";
import { visibleFacilities } from "@/lib/facilities";
import {
  currentChildAge,
  getAgeCompatibility,
} from "@/lib/recommendation-age";
import type { Facility, PrefectureId } from "@/types/facility";

export type RecommendationInterest = {
  id: string;
  label: string;
  count: number;
};

export type RecommendationChild = {
  id: string;
  nickname: string;
  birthYear: number;
  birthMonth: number;
  interests: readonly RecommendationInterest[];
};

export type RecommendationReason = {
  childId: string;
  childNickname: string;
  age: number;
  matchingTags: { id: string; label: string }[];
  ageCompatibility: "matched" | "unknown";
};

export type MypageFacilityRecommendation = {
  facility: Pick<
    Facility,
    | "id"
    | "slug"
    | "name"
    | "prefecture"
    | "category"
    | "target_age"
    | "image"
  >;
  reasons: RecommendationReason[];
};

export type MypageEventRecommendation = {
  event: Pick<
    EventItem,
    | "id"
    | "title"
    | "date_label"
    | "age_label"
    | "official_url"
    | "prefecture"
  >;
  facilityName: string | null;
  facilitySlug: string | null;
  venueName: string | null;
  prefectureLabel: string;
  reasons: RecommendationReason[];
};

export type MypageRecommendations = {
  facilities: MypageFacilityRecommendation[];
  events: MypageEventRecommendation[];
  hasInterestProfile: boolean;
};

type BuildRecommendationsInput = {
  children: readonly RecommendationChild[];
  selectedPrefectureIds: readonly PrefectureId[];
  visitedSlugs: readonly string[];
  today?: string;
  facilitySource?: readonly Facility[];
  eventSource?: readonly EventItem[];
  facilityLimit?: number;
  eventLimit?: number;
};

type ScoredReason = RecommendationReason & { score: number };

const UPCOMING_EVENT_WINDOW_DAYS = 60;

function daysBetweenDateOnly(from: string, to: string): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(to)
  ) {
    return null;
  }
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return null;
  return Math.floor((toMs - fromMs) / 86_400_000);
}

function scoredReasons(
  candidateTagIds: readonly string[],
  ageLabel: string | null,
  children: readonly RecommendationChild[],
  today: string,
): ScoredReason[] {
  const candidateTags = new Set(candidateTagIds);

  return children.flatMap((child) => {
    const matchingInterests = child.interests.filter((interest) =>
      candidateTags.has(interest.id),
    );
    if (matchingInterests.length === 0) return [];

    const age = currentChildAge(
      child.birthYear,
      child.birthMonth,
      today,
    );
    const compatibility = getAgeCompatibility(ageLabel, age);
    if (compatibility === false) return [];

    return [
      {
        childId: child.id,
        childNickname: child.nickname,
        age,
        matchingTags: matchingInterests.map(({ id, label }) => ({ id, label })),
        ageCompatibility: compatibility === true ? "matched" : "unknown",
        score:
          matchingInterests.reduce((sum, interest) => sum + interest.count, 0) *
            10 +
          matchingInterests.length * 2 +
          (compatibility === true ? 1 : 0),
      },
    ];
  });
}

function reasonScore(reasons: readonly ScoredReason[]): number {
  return reasons[0]?.score ?? 0;
}

function publicReasons(reasons: readonly ScoredReason[]): RecommendationReason[] {
  return reasons.slice(0, 2).map((reason) => ({
    childId: reason.childId,
    childNickname: reason.childNickname,
    age: reason.age,
    matchingTags: reason.matchingTags,
    ageCompatibility: reason.ageCompatibility,
  }));
}

export function buildMypageRecommendations({
  children,
  selectedPrefectureIds,
  visitedSlugs,
  today = getBuildDateString(),
  facilitySource = visibleFacilities,
  eventSource,
  facilityLimit = 4,
  eventLimit = 4,
}: BuildRecommendationsInput): MypageRecommendations {
  const selectedPrefectures = new Set<string>(selectedPrefectureIds);
  const visited = new Set(visitedSlugs);
  const hasInterestProfile = children.some((child) => child.interests.length > 0);

  if (selectedPrefectures.size === 0 || !hasInterestProfile) {
    return { facilities: [], events: [], hasInterestProfile };
  }

  const facilityCandidates = facilitySource.flatMap((facility) => {
    if (
      !selectedPrefectures.has(facility.prefecture_id) ||
      visited.has(facility.slug)
    ) {
      return [];
    }
    const reasons = scoredReasons(
      facility.recommended_for_tags ?? [],
      facility.target_age,
      children,
      today,
    ).sort(
      (a, b) =>
        b.score - a.score || a.childNickname.localeCompare(b.childNickname, "ja"),
    );
    if (reasons.length === 0) return [];
    return [{ facility, reasons }];
  });

  const facilities = facilityCandidates
    .sort(
      (a, b) =>
        reasonScore(b.reasons) - reasonScore(a.reasons) ||
        a.facility.name.localeCompare(b.facility.name, "ja"),
    )
    .slice(0, Math.max(0, facilityLimit))
    .map(({ facility, reasons }) => ({
      facility: {
        id: facility.id,
        slug: facility.slug,
        name: facility.name,
        prefecture: facility.prefecture,
        category: facility.category,
        target_age: facility.target_age,
        image: facility.image,
      },
      reasons: publicReasons(reasons),
    }));

  const visibleEventSource =
    eventSource ?? getVisibleEvents(today, EVENT_PAGE_MAX_AGE_DAYS);
  const eventCandidates = visibleEventSource.flatMap((event) => {
    if (!selectedPrefectures.has(event.prefecture)) return [];
    const nextDate = getNextEventDate(event, today);
    const daysUntilNextDate = nextDate
      ? daysBetweenDateOnly(today, nextDate)
      : null;
    if (
      daysUntilNextDate === null ||
      daysUntilNextDate < 0 ||
      daysUntilNextDate > UPCOMING_EVENT_WINDOW_DAYS
    ) {
      return [];
    }
    const reasons = scoredReasons(
      event.recommended_for_tags,
      event.age_label,
      children,
      today,
    ).sort(
      (a, b) =>
        b.score - a.score || a.childNickname.localeCompare(b.childNickname, "ja"),
    );
    if (reasons.length === 0) return [];
    return [{ event, reasons }];
  });

  const events = eventCandidates
    .sort((a, b) => {
      const byScore = reasonScore(b.reasons) - reasonScore(a.reasons);
      if (byScore !== 0) return byScore;
      const byNextDate = (getNextEventDate(a.event, today) ?? "9999-12-31").localeCompare(
        getNextEventDate(b.event, today) ?? "9999-12-31",
      );
      return byNextDate || a.event.id.localeCompare(b.event.id);
    })
    .slice(0, Math.max(0, eventLimit))
    .map(({ event, reasons }) => {
      const view = toEventView(event, today);
      const facility = getFacilityForEvent(event);
      return {
        event: {
          id: event.id,
          title: event.title,
          date_label: event.date_label,
          age_label: event.age_label,
          official_url: event.official_url,
          prefecture: event.prefecture,
        },
        facilityName: facility?.name ?? view.facilityName,
        facilitySlug: facility?.slug ?? view.facilitySlug,
        venueName: view.venueName,
        prefectureLabel: view.prefectureLabel,
        reasons: publicReasons(reasons),
      };
    });

  return { facilities, events, hasInterestProfile };
}
