import { getNextEventDate, isThisWeekend } from "./event-dates";
import type { EventItem, EventView } from "@/lib/events";
import type { RecommendedForTag } from "@/types/facility";

export const EVENT_CHILD_PICK_HORIZON_DAYS = 30;

// Owner GO 2026-10-14: reviewed child-appeal tiers. Keep `experience` out of
// the strength signal because it is present on nearly every event.
export const CHILD_EVENT_APPEAL_TIERS = {
  tierA: [
    "animal_contact",
    "animal_feed",
    "water_play",
    "pool",
    "playground",
    "slide",
    "athletic",
    "dinosaur",
    "character",
    "vehicle",
    "craft",
    "space",
  ],
  tierB: ["animal", "science", "food", "running"],
  weak: ["exhibition", "nature", "wide_space"],
} as const satisfies Record<string, readonly RecommendedForTag[]>;

export type ChildEventTier = "A" | "B";

export interface ChildEventCandidate {
  matchedTags: RecommendedForTag[];
  primaryTheme: string;
  reason: string;
  tier: ChildEventTier;
  view: EventView;
}

export interface ChildEventSelection {
  candidatesByTier: Record<ChildEventTier, number>;
  picks: ChildEventCandidate[];
}

export type EventDiscoveryType =
  | "festival_seasonal"
  | "workshop_experience"
  | "animals"
  | "nature_harvest"
  | "exhibition_learning";

export const EVENT_DISCOVERY_TYPE_LABELS: Record<EventDiscoveryType, string> = {
  festival_seasonal: "祭り・季節行事",
  workshop_experience: "体験・ワークショップ",
  animals: "動物・生きもの",
  nature_harvest: "自然・収穫",
  exhibition_learning: "展示・学び",
};

type EventTypeRule = {
  type: EventDiscoveryType;
  keywords: readonly string[];
  titleKeywords?: readonly string[];
  excludeKeywords?: readonly string[];
  recommendedTags?: readonly RecommendedForTag[];
};

// Reviewed deterministic map for MEM-DX-DISCOVERY-UI (Owner GO 2026-10-14).
// Order is intentional: named festivals/seasonal customs beat broad activity
// words, and explicit animal/nature themes beat the ubiquitous `experience`.
export const EVENT_DISCOVERY_TYPE_RULES: readonly EventTypeRule[] = [
  {
    type: "festival_seasonal",
    keywords: [
      "祭",
      "まつり",
      "フェス",
      "花火",
      "盆踊り",
      "縁日",
      "ハロウィン",
      "クリスマス",
      "イルミネーション",
      "節分",
      "七夕",
      "ひな",
      "正月",
      "紅葉ライトアップ",
    ],
    excludeKeywords: ["上映", "映画"],
  },
  {
    type: "animals",
    keywords: [
      "動物",
      "生きもの",
      "生き物",
      "昆虫",
      "虫",
      "魚",
      "鳥",
      "ふれあい",
      "えさやり",
      "餌やり",
      "いきもの",
    ],
    recommendedTags: ["animal", "animal_contact", "animal_feed"],
  },
  {
    type: "workshop_experience",
    keywords: [
      "ワークショップ",
      "体験会",
      "体験教室",
      "教室",
      "工作",
      "手作り",
      "ものづくり",
      "実験",
      "作って",
      "作ろう",
      "つくろう",
      "挑戦",
      "ツアー",
    ],
    titleKeywords: ["体験"],
    recommendedTags: [
      "craft",
      "vehicle",
      "water_play",
      "pool",
      "playground",
      "slide",
      "athletic",
      "running",
    ],
  },
  {
    type: "nature_harvest",
    keywords: [
      "収穫",
      "味覚狩り",
      "果物狩り",
      "いちご狩り",
      "ぶどう狩り",
      "芋掘り",
      "いも掘り",
      "農業",
      "自然観察",
      "星空観察",
      "野外観察",
    ],
    recommendedTags: ["nature", "food"],
  },
  {
    type: "exhibition_learning",
    keywords: [],
  },
] as const;

export function selectSeasonalEventViews(
  views: readonly EventView[],
  today: string,
  limit = 3,
): EventView[] {
  const eventPrefectures = new Set<string>();

  return views
    .flatMap((view) => {
      const nextDate = getNextEventDate(view.event, today);
      if (nextDate === null) return [];
      const occurrenceCount = view.event.occurrence_dates?.length ?? 0;
      const startDate = view.event.start_date ?? nextDate;
      const duration =
        occurrenceCount ||
        (Date.parse(view.event.end_date ?? startDate) - Date.parse(startDate)) /
          86_400_000 +
          1;
      if (occurrenceCount === 0 && duration > 92) return [];
      return [{ view, nextDate, duration }];
    })
    .sort((a, b) => {
      const weekendOrder =
        Number(isThisWeekend(b.view.event, today)) -
        Number(isThisWeekend(a.view.event, today));
      return (
        weekendOrder ||
        a.nextDate.localeCompare(b.nextDate) ||
        a.duration - b.duration ||
        a.view.event.id.localeCompare(b.view.event.id)
      );
    })
    .filter(({ view }) => {
      if (eventPrefectures.has(view.event.prefecture)) return false;
      eventPrefectures.add(view.event.prefecture);
      return true;
    })
    .slice(0, limit)
    .map(({ view }) => view);
}

export function selectChildEventViews(
  views: readonly EventView[],
  today: string,
  excludedEventIds: ReadonlySet<string> = new Set(),
  limit = 3,
): ChildEventSelection {
  const horizon = addDays(today, EVENT_CHILD_PICK_HORIZON_DAYS);
  const candidates = views.flatMap((view) => {
    const nextDate = getNextEventDate(view.event, today);
    if (nextDate === null || nextDate > horizon) return [];
    const scored = scoreChildEvent(view, today, nextDate);
    return scored ? [scored] : [];
  });
  const candidatesByTier = {
    A: candidates.filter((candidate) => candidate.tier === "A").length,
    B: candidates.filter((candidate) => candidate.tier === "B").length,
  };
  const excludedFacilityKeys = new Set(
    views
      .filter(({ event }) => excludedEventIds.has(event.id))
      .map(getEventFacilityKey),
  );
  const ranked = candidates
    .filter(
      ({ view }) =>
        !excludedEventIds.has(view.event.id) &&
        !excludedFacilityKeys.has(getEventFacilityKey(view)),
    )
    .sort(compareChildCandidates);
  const picks: ChildEventCandidate[] = [];
  const facilities = new Set<string>();
  const themes = new Set<string>();

  for (const candidate of ranked) {
    if (picks.length >= limit) break;
    const facilityKey = getEventFacilityKey(candidate.view);
    if (facilities.has(facilityKey) || themes.has(candidate.primaryTheme)) {
      continue;
    }
    picks.push(candidate);
    facilities.add(facilityKey);
    themes.add(candidate.primaryTheme);
  }

  // If unique themes cannot fill the row, retain facility diversity and use
  // the best remaining candidate. A different theme is always preferred by
  // the first pass above.
  for (const candidate of ranked) {
    if (picks.length >= limit) break;
    if (picks.some((pick) => pick.view.event.id === candidate.view.event.id)) {
      continue;
    }
    const facilityKey = getEventFacilityKey(candidate.view);
    if (facilities.has(facilityKey)) continue;
    picks.push(candidate);
    facilities.add(facilityKey);
  }

  return { candidatesByTier, picks };
}

export function getStrongAppealTags(
  event: Pick<EventItem, "recommended_for_tags">,
  limit = 2,
): RecommendedForTag[] {
  const strong = [
    ...CHILD_EVENT_APPEAL_TIERS.tierA,
    ...CHILD_EVENT_APPEAL_TIERS.tierB,
  ] as readonly RecommendedForTag[];
  return strong
    .filter((tag) => event.recommended_for_tags.includes(tag))
    .slice(0, limit);
}

export function getCompactEventAppealTags(
  event: Pick<EventItem, "recommended_for_tags">,
  limit = 2,
): RecommendedForTag[] {
  return getStrongAppealTags(event, limit);
}

export function deriveEventDiscoveryType(event: {
  title: string;
  summary: string;
  tags: readonly string[];
  recommended_for_tags: readonly string[];
}): EventDiscoveryType {
  return classifyEventDiscoveryType(event).type;
}

export function classifyEventDiscoveryType(event: {
  title: string;
  summary: string;
  tags: readonly string[];
  recommended_for_tags: readonly string[];
}): { type: EventDiscoveryType; reason: string } {
  const haystack = normalizeEventSearchText(
    [event.title, event.summary, ...event.tags].join(" "),
  );
  const normalizedTitle = normalizeEventSearchText(event.title);
  for (const rule of EVENT_DISCOVERY_TYPE_RULES) {
    if (
      rule.excludeKeywords?.some((keyword) =>
        haystack.includes(normalizeEventSearchText(keyword)),
      )
    ) {
      continue;
    }
    const keyword = rule.keywords.find((candidate) =>
      haystack.includes(normalizeEventSearchText(candidate)),
    );
    if (keyword) return { type: rule.type, reason: `keyword: ${keyword}` };
    const titleKeyword = rule.titleKeywords?.find((candidate) =>
      normalizedTitle.includes(normalizeEventSearchText(candidate)),
    );
    if (titleKeyword) {
      return { type: rule.type, reason: `title keyword: ${titleKeyword}` };
    }
    const recommendedTag = rule.recommendedTags?.find((tag) =>
      event.recommended_for_tags.includes(tag),
    );
    if (recommendedTag) {
      return { type: rule.type, reason: `recommended tag: ${recommendedTag}` };
    }
  }
  return { type: "exhibition_learning", reason: "fallback: 展示・学び" };
}

export function eventMatchesKeyword(
  view: {
    event: {
      title: string;
      summary: string;
      tags: readonly string[];
      recommended_for_tags: readonly string[];
    };
    facilityName: string | null;
    venueName: string | null;
    prefectureLabel: string;
  },
  keyword: string,
): boolean {
  const needle = normalizeEventSearchText(keyword.trim());
  if (!needle) return true;
  const { event } = view;
  const haystack = normalizeEventSearchText(
    [
      event.title,
      event.summary,
      ...event.tags,
      ...event.recommended_for_tags,
      view.venueName ?? "",
      view.facilityName ?? "",
      view.prefectureLabel,
    ].join(" "),
  );
  return haystack.includes(needle);
}

export function normalizeEventSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[ァ-ヶ]/gu, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    )
    .replace(/\s+/gu, " ")
    .trim();
}

export function getEventAnchorId(eventId: string): string {
  return `event-${eventId.replace(/[^a-zA-Z0-9_-]/gu, "-")}`;
}

function scoreChildEvent(
  view: EventView,
  today: string,
  nextDate: string,
): (ChildEventCandidate & {
  childTargetBonus: number;
  experienceBonus: number;
  nextDate: string;
  ongoingBonus: number;
  strengthCount: number;
}) | null {
  const tierATags = CHILD_EVENT_APPEAL_TIERS.tierA.filter((tag) =>
    view.event.recommended_for_tags.includes(tag),
  );
  const tierBTags = CHILD_EVENT_APPEAL_TIERS.tierB.filter((tag) =>
    view.event.recommended_for_tags.includes(tag),
  );
  const tier: ChildEventTier | null =
    tierATags.length > 0 ? "A" : tierBTags.length > 0 ? "B" : null;
  if (!tier) return null;
  const matchedTags = [...tierATags, ...tierBTags];
  const childTargetBonus = /子ども|子供|親子|小学生|幼児|キッズ/u.test(
    `${view.event.age_label ?? ""} ${view.event.recommended_for_label ?? ""}`,
  )
    ? 1
    : 0;
  const experienceBonus = view.event.recommended_for_tags.includes("experience")
    ? 1
    : 0;
  const ongoingBonus = view.event.start_date !== null && view.event.start_date <= today ? 1 : 0;
  return {
    childTargetBonus,
    experienceBonus,
    matchedTags,
    nextDate,
    ongoingBonus,
    primaryTheme: getPrimaryChildTheme(matchedTags[0]),
    reason: `${tier === "A" ? "Tier A" : "Tier B"}: ${matchedTags.join(", ")}${
      childTargetBonus ? " + 子ども対象表記" : ""
    }`,
    strengthCount: matchedTags.length,
    tier,
    view,
  };
}

function compareChildCandidates(
  a: ReturnType<typeof scoreChildEvent> & ChildEventCandidate,
  b: ReturnType<typeof scoreChildEvent> & ChildEventCandidate,
): number {
  if (!a || !b) return 0;
  return (
    Number(b.tier === "A") - Number(a.tier === "A") ||
    b.strengthCount - a.strengthCount ||
    b.childTargetBonus - a.childTargetBonus ||
    b.ongoingBonus - a.ongoingBonus ||
    a.nextDate.localeCompare(b.nextDate) ||
    b.experienceBonus - a.experienceBonus ||
    a.view.event.id.localeCompare(b.view.event.id)
  );
}

function getEventFacilityKey(view: EventView): string {
  return view.event.facility_id !== null
    ? `facility:${view.event.facility_id}`
    : `venue:${view.event.prefecture}:${view.venueName ?? view.event.id}`;
}

function getPrimaryChildTheme(tag: RecommendedForTag): string {
  if (["animal", "animal_contact", "animal_feed"].includes(tag)) return "animal";
  if (["water_play", "pool"].includes(tag)) return "water";
  if (["playground", "slide", "athletic", "running"].includes(tag)) return "active_play";
  if (["dinosaur", "science", "space"].includes(tag)) return "science_discovery";
  return tag;
}

function addDays(date: string, days: number): string {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}
