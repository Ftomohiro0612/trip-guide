import type { RecommendedForTag } from "@/types/facility";

export type GuestInterestTag = Exclude<RecommendedForTag, "space">;

export type GuestRecordDraft = {
  version: 1;
  facilitySlug: string;
  facilityName: string;
  visitedOn: string;
  note: string;
  interestTagIds: GuestInterestTag[];
  familyRevisit: "yes" | "conditional" | "once_enough" | "no";
  parentFatigue: "easy" | "normal" | "tired" | "exhausted";
};

export type GuestRecordRecommendation = {
  slug: string;
  name: string;
  prefecture: string;
  category: string;
  matchingTags: GuestInterestTag[];
  relevanceRank: number;
};

export const GUEST_RECORD_DRAFT_SESSION_KEY = "memorip:guest-record-draft";

const GUEST_INTEREST_TAG_IDS = new Set<GuestInterestTag>([
  "animal",
  "animal_contact",
  "animal_feed",
  "water_play",
  "pool",
  "playground",
  "athletic",
  "slide",
  "running",
  "wide_space",
  "vehicle",
  "craft",
  "experience",
  "exhibition",
  "science",
  "dinosaur",
  "character",
  "nature",
  "food",
]);

const FAMILY_REVISIT_VALUES = new Set<GuestRecordDraft["familyRevisit"]>([
  "yes",
  "conditional",
  "once_enough",
  "no",
]);

const PARENT_FATIGUE_VALUES = new Set<GuestRecordDraft["parentFatigue"]>([
  "easy",
  "normal",
  "tired",
  "exhausted",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGuestInterestTag(value: unknown): value is GuestInterestTag {
  return typeof value === "string" && GUEST_INTEREST_TAG_IDS.has(value as GuestInterestTag);
}

export function getGuestInterestTags(
  tags: readonly RecommendedForTag[] | null | undefined,
): GuestInterestTag[] {
  return [...new Set((tags ?? []).filter(isGuestInterestTag))];
}

function isGuestRecordDraft(value: unknown): value is GuestRecordDraft {
  if (!isRecord(value)) return false;

  return (
    value.version === 1 &&
    typeof value.facilitySlug === "string" &&
    value.facilitySlug.length > 0 &&
    value.facilitySlug.length <= 160 &&
    typeof value.facilityName === "string" &&
    value.facilityName.length > 0 &&
    value.facilityName.length <= 100 &&
    typeof value.visitedOn === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.visitedOn) &&
    typeof value.note === "string" &&
    value.note.length > 0 &&
    value.note.length <= 240 &&
    Array.isArray(value.interestTagIds) &&
    value.interestTagIds.length > 0 &&
    value.interestTagIds.every(isGuestInterestTag) &&
    FAMILY_REVISIT_VALUES.has(value.familyRevisit as GuestRecordDraft["familyRevisit"]) &&
    PARENT_FATIGUE_VALUES.has(value.parentFatigue as GuestRecordDraft["parentFatigue"])
  );
}

export function storeGuestRecordDraft(draft: GuestRecordDraft): void {
  try {
    window.sessionStorage.setItem(
      GUEST_RECORD_DRAFT_SESSION_KEY,
      JSON.stringify(draft),
    );
  } catch {
    // The URL remains the navigation source of truth; storage is best effort.
  }
}

export function readGuestRecordDraft(): GuestRecordDraft | null {
  try {
    const raw = window.sessionStorage.getItem(GUEST_RECORD_DRAFT_SESSION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isGuestRecordDraft(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearGuestRecordDraft(): void {
  try {
    window.sessionStorage.removeItem(GUEST_RECORD_DRAFT_SESSION_KEY);
  } catch {
    // Ignore unavailable storage after a successful server save.
  }
}

export function selectGuestRecordRecommendations(
  candidates: readonly GuestRecordRecommendation[],
  selectedTags: readonly GuestInterestTag[],
  limit = 3,
): GuestRecordRecommendation[] {
  const selected = new Set(selectedTags);
  const normalizedLimit = Math.max(0, Math.floor(limit));

  return candidates
    .filter((candidate) =>
      candidate.matchingTags.some((tag) => selected.has(tag)),
    )
    .map((candidate) => ({
      candidate,
      overlap: candidate.matchingTags.filter((tag) => selected.has(tag)).length,
    }))
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        a.candidate.relevanceRank - b.candidate.relevanceRank ||
        a.candidate.name.localeCompare(b.candidate.name, "ja"),
    )
    .slice(0, normalizedLimit)
    .map(({ candidate }) => candidate);
}
