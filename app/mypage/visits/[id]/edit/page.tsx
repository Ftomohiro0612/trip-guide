"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ChildAvatar from "@/components/ChildAvatar";
import { childAgeAtVisit } from "@/lib/child-age";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import {
  encodeInterestOtherNote,
  isInterestOtherSelected,
} from "@/lib/visit-other-note";
import {
  readVisitEdit,
  storeVisitCompletion,
} from "@/lib/visit-flow-session";
import VisitPhotoUploader, {
  type VisitPhotoUploaderHandle,
} from "../../VisitPhotoUploader";
import VisitPhotoGallery, {
  type VisitPhotoGalleryPhoto,
} from "../VisitPhotoGallery";

type FamilyRevisit = "yes" | "conditional" | "once_enough" | "no";
type ParentFatigue = "easy" | "normal" | "tired" | "exhausted";
type Weather = "sunny" | "cloudy" | "rainy" | "snowy";
type Crowding = "empty" | "normal" | "busy" | "very_busy";
type Parking =
  | "car_easy"
  | "car_normal"
  | "car_trouble"
  | "train"
  | "bus"
  | "walk_bike";
type TimeWasEnough = "enough" | "want_more" | "too_long";
type FoodRating =
  | "no_meal"
  | "ate_inside"
  | "brought_food"
  | "ate_outside"
  | "had_trouble";
type Expectation = "exceeded" | "met" | "below";
type VisitStatus = "draft" | "published";
type Satisfaction = "loved" | "enjoyed" | "neutral" | "not_fit";

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number | null;
  avatar_url: string | null;
  avatarUrl?: string | null;
};

type FacilitySuggestion = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

type VisitPhotoRow = {
  id: string;
  storage_path: string;
  thumb_path: string;
  taken_on: string | null;
};

type ReactionTag = {
  id: string;
  label: string;
  category: string;
  sort_order: number;
  tag_type: "interest" | "behavior";
};

type OtherNotes = {
  interest: string;
  behavior: string;
};

const otherNoteMaxLength = 100;

type VisitChildRow = {
  id: string;
  child_id: string;
  satisfaction: string | null;
  interest_other_note: string | null;
  behavior_other_note: string | null;
};

type VisitChildTagRow = {
  visit_child_id: string;
  tag_id: string;
};

type ExistingVisitChild = {
  id: string;
  satisfaction?: Satisfaction;
};

const familyRevisitOptions: { value: FamilyRevisit; label: string }[] = [
  { value: "yes", label: "また行きたい" },
  { value: "conditional", label: "条件次第" },
  { value: "once_enough", label: "一度で十分" },
  { value: "no", label: "もう行かない" },
];

const fatigueOptions: { value: ParentFatigue; label: string }[] = [
  { value: "easy", label: "楽だった" },
  { value: "normal", label: "普通" },
  { value: "tired", label: "少し疲れた" },
  { value: "exhausted", label: "かなり疲れた" },
];

const satisfactionOptions: { value: Satisfaction; label: string }[] = [
  { value: "loved", label: "大満足" },
  { value: "enjoyed", label: "楽しんだ" },
  { value: "neutral", label: "普通" },
  { value: "not_fit", label: "合わなかった" },
];

const expectationOptions: { value: Expectation; label: string }[] = [
  { value: "exceeded", label: "期待以上だった" },
  { value: "met", label: "期待どおり" },
  { value: "below", label: "期待以下" },
];

const weatherOptions: { value: Weather; label: string }[] = [
  { value: "sunny", label: "☀️晴れ" },
  { value: "cloudy", label: "☁️くもり" },
  { value: "rainy", label: "🌧雨" },
  { value: "snowy", label: "❄️雪" },
];

const crowdingOptions: { value: Crowding; label: string }[] = [
  { value: "empty", label: "空いていた" },
  { value: "normal", label: "ふつう" },
  { value: "busy", label: "混んでいた" },
  { value: "very_busy", label: "かなり混んでいた" },
];

const parkingOptions: { value: Parking; label: string }[] = [
  { value: "car_easy", label: "車：駐車場に余裕あり" },
  { value: "car_normal", label: "車：駐車場ふつう" },
  { value: "car_trouble", label: "車：駐車場で困った" },
  { value: "train", label: "電車で行った" },
  { value: "bus", label: "バスで行った" },
  { value: "walk_bike", label: "徒歩・自転車で行った" },
];

const durationOptions = [
  { value: "60", label: "〜1時間" },
  { value: "150", label: "2〜3時間" },
  { value: "270", label: "4〜5時間" },
  { value: "360", label: "6時間以上" },
];

const timeWasEnoughOptions: { value: TimeWasEnough; label: string }[] = [
  { value: "enough", label: "十分だった" },
  { value: "want_more", label: "足りなかった" },
  { value: "too_long", label: "長かった" },
];

const foodRatingOptions: { value: FoodRating; label: string }[] = [
  { value: "no_meal", label: "食事なし" },
  { value: "ate_inside", label: "施設内で食べた" },
  { value: "brought_food", label: "持参した" },
  { value: "ate_outside", label: "外で食べた" },
  { value: "had_trouble", label: "食事で困った" },
];

const familyRevisitValues = new Set<FamilyRevisit>(
  familyRevisitOptions.map((option) => option.value),
);
const fatigueValues = new Set<ParentFatigue>(
  fatigueOptions.map((option) => option.value),
);
const satisfactionValues = new Set<Satisfaction>(
  satisfactionOptions.map((option) => option.value),
);
const expectationValues = new Set<Expectation>(
  expectationOptions.map((option) => option.value),
);
const weatherValues = new Set<Weather>(weatherOptions.map((option) => option.value));
const crowdingValues = new Set<Crowding>(
  crowdingOptions.map((option) => option.value),
);
const parkingValues = new Set<Parking>(parkingOptions.map((option) => option.value));
const durationValues = new Set(durationOptions.map((option) => option.value));
const timeWasEnoughValues = new Set<TimeWasEnough>(
  timeWasEnoughOptions.map((option) => option.value),
);
const foodRatingValues = new Set<FoodRating>(
  foodRatingOptions.map((option) => option.value),
);

function makeFacilitySlug(name: string): string {
  const encoded = Array.from(name.trim())
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
  return `manual-${encoded.slice(0, 120) || Date.now().toString(36)}`;
}

function coerceOption<T extends string>(
  value: string | null | undefined,
  values: Set<T>,
): T | "" {
  return value && values.has(value as T) ? (value as T) : "";
}

function coerceDuration(value: number | null | undefined): string {
  if (!value) return "";
  const duration = String(value);
  return durationValues.has(duration) ? duration : "";
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function normalizeOtherNote(value: string, selected: boolean): string | null {
  if (!selected) return null;
  const note = value.trim();
  return note ? note : null;
}

function isBehaviorOtherTag(tag: ReactionTag): boolean {
  return tag.tag_type !== "interest" && (tag.id === "other" || tag.label === "その他");
}

export default function EditVisitPage() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionEdit, setSessionEdit] = useState<ReturnType<typeof readVisitEdit>>(null);
  const visitId = params.id ?? sessionEdit?.visitId ?? "";
  const photoBatchIds = sessionEdit?.batchIds ??
    (searchParams.get("photo_batch") ?? "").split(",").filter(Boolean);
  const photoUploaderRef = useRef<VisitPhotoUploaderHandle>(null);
  const saveLockedRef = useRef(false);

  useEffect(() => {
    if (!params.id) queueMicrotask(() => setSessionEdit(readVisitEdit()));
  }, [params.id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [facilitySlug, setFacilitySlug] = useState("");
  const [suggestions, setSuggestions] = useState<FacilitySuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [visitedOn, setVisitedOn] = useState("");
  const [familyRevisit, setFamilyRevisit] = useState<FamilyRevisit | "">("");
  const [parentFatigue, setParentFatigue] = useState<ParentFatigue | "">("");
  const [expectation, setExpectation] = useState<Expectation | "">("");
  const [weather, setWeather] = useState<Weather | "">("");
  const [crowding, setCrowding] = useState<Crowding | "">("");
  const [parking, setParking] = useState<Parking | "">("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [timeWasEnough, setTimeWasEnough] = useState<TimeWasEnough | "">("");
  const [foodRating, setFoodRating] = useState<FoodRating | "">("");
  const [parentMemo, setParentMemo] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);
  const [existingPhotos, setExistingPhotos] = useState<VisitPhotoGalleryPhoto[]>([]);
  const [visitStatus, setVisitStatus] = useState<VisitStatus>("published");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [satisfactions, setSatisfactions] = useState<Record<string, Satisfaction>>({});
  const [reactionTagMaster, setReactionTagMaster] = useState<ReactionTag[]>([]);
  const [childTags, setChildTags] = useState<Record<string, string[]>>({});
  const [interestOtherSelected, setInterestOtherSelected] = useState<
    Record<string, boolean>
  >({});
  const [childOtherNotes, setChildOtherNotes] = useState<Record<string, OtherNotes>>(
    {},
  );
  const [existingVisitChildren, setExistingVisitChildren] = useState<
    Record<string, ExistingVisitChild>
  >({});
  const [existingChildTags, setExistingChildTags] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    if (!visitId) return;
    let active = true;
    async function load() {
      const supabase = createClient();
      const visitResult = await supabase
        .from("visits")
        .select(
          "facility_slug, facility_name, status, visited_on, family_revisit, parent_fatigue, expectation_vs_reality, weather, crowding, parking, stay_duration_min, time_was_enough, food_rating, parent_memo",
        )
        .eq("id", visitId)
        .single();
      let childrenResult = await supabase
        .from("children")
        .select("id, nickname, birth_year, birth_month, avatar_url")
        .order("sort_order", { ascending: true });
      if (childrenResult.error?.message.includes("sort_order")) {
        childrenResult = await supabase
          .from("children")
          .select("id, nickname, birth_year, birth_month, avatar_url")
          .order("created_at", { ascending: true });
      }
      const visitChildrenResult = await supabase
        .from("visit_children")
        .select(
          "id, child_id, satisfaction, interest_other_note, behavior_other_note",
        )
        .eq("visit_id", visitId);
      const tagMasterResult = await supabase
        .from("reaction_tags")
        .select("id, label, category, sort_order, tag_type")
        .eq("is_active", true)
        .order("sort_order");
      const photoResult = PHOTO_UPLOAD_ENABLED
        ? await supabase
          .from("visit_photos")
          .select("id, storage_path, thumb_path, taken_on")
          .eq("visit_id", visitId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
        : null;
      if (!active) return;
      const { data, error: fetchError } = visitResult;
      if (fetchError || !data) {
        setError("記録の読み込みに失敗しました");
        setLoading(false);
        return;
      }
      if (childrenResult.error) {
        setError("子ども情報の読み込みに失敗しました");
        setLoading(false);
        return;
      }
      if (visitChildrenResult.error) {
        setError("子ども別記録の読み込みに失敗しました");
        setLoading(false);
        return;
      }
      if (tagMasterResult.error) {
        setError("反応タグの読み込みに失敗しました");
        setLoading(false);
        return;
      }

      const childRows = (childrenResult.data ?? []) as Child[];
      const avatarPaths = childRows
        .map((child) => child.avatar_url)
        .filter((path): path is string => Boolean(path));
      const { data: signedAvatars } =
        avatarPaths.length > 0
          ? await supabase.storage
              .from("child-avatars")
              .createSignedUrls(avatarPaths, 60 * 60)
          : { data: [] };
      const avatarUrlByPath = new Map(
        (signedAvatars ?? []).map((row) => [row.path, row.signedUrl]),
      );
      if (!active) return;
      setChildren(
        childRows.map((child) => ({
          ...child,
          avatarUrl: child.avatar_url
            ? avatarUrlByPath.get(child.avatar_url) ?? null
            : null,
        })),
      );
      setReactionTagMaster((tagMasterResult.data ?? []) as ReactionTag[]);

      const visitChildRows = (visitChildrenResult.data ?? []) as VisitChildRow[];
      const visitChildIds = visitChildRows.map((row) => row.id);
      const { data: childTagRows, error: childTagError } =
        visitChildIds.length > 0
          ? await supabase
              .from("visit_child_tags")
              .select("visit_child_id, tag_id")
              .in("visit_child_id", visitChildIds)
          : { data: [], error: null };
      if (childTagError) {
        setError("子ども別タグの読み込みに失敗しました");
        setLoading(false);
        return;
      }
      if (!active) return;
      const nextExistingVisitChildren: Record<string, ExistingVisitChild> = {};
      const nextSelectedChildIds: string[] = [];
      const nextSatisfactions: Record<string, Satisfaction> = {};
      for (const row of visitChildRows) {
        const satisfaction = coerceOption(row.satisfaction, satisfactionValues);
        nextExistingVisitChildren[row.child_id] = {
          id: row.id,
          ...(satisfaction ? { satisfaction } : {}),
        };
        nextSelectedChildIds.push(row.child_id);
        if (satisfaction) {
          nextSatisfactions[row.child_id] = satisfaction;
        }
      }
      const nextExistingChildTags: Record<string, string[]> = {};
      const nextChildTags: Record<string, string[]> = {};
      const nextInterestOtherSelected: Record<string, boolean> = {};
      const nextChildOtherNotes: Record<string, OtherNotes> = {};
      const behaviorOtherTagId = ((tagMasterResult.data ?? []) as ReactionTag[]).find(
        isBehaviorOtherTag,
      )?.id;
      const childIdByVisitChildId = new Map(
        visitChildRows.map((row) => [row.id, row.child_id]),
      );
      for (const row of (childTagRows ?? []) as VisitChildTagRow[]) {
        nextExistingChildTags[row.visit_child_id] = sortedUnique([
          ...(nextExistingChildTags[row.visit_child_id] ?? []),
          row.tag_id,
        ]);
        const childId = childIdByVisitChildId.get(row.visit_child_id);
        if (childId) {
          nextChildTags[childId] = sortedUnique([
            ...(nextChildTags[childId] ?? []),
            row.tag_id,
          ]);
        }
      }
      for (const row of visitChildRows) {
        const interestNote = row.interest_other_note ?? "";
        const behaviorNote = row.behavior_other_note ?? "";
        if (interestNote || behaviorNote) {
          nextChildOtherNotes[row.child_id] = {
            interest: interestNote,
            behavior: behaviorNote,
          };
        }
        if (isInterestOtherSelected(row.interest_other_note)) {
          nextInterestOtherSelected[row.child_id] = true;
        }
        if (behaviorNote && behaviorOtherTagId) {
          nextChildTags[row.child_id] = sortedUnique([
            ...(nextChildTags[row.child_id] ?? []),
            behaviorOtherTagId,
          ]);
        }
      }
      setExistingVisitChildren(nextExistingVisitChildren);
      setExistingChildTags(nextExistingChildTags);
      setSelectedChildIds(nextSelectedChildIds);
      setSatisfactions(nextSatisfactions);
      setChildTags(nextChildTags);
      setInterestOtherSelected(nextInterestOtherSelected);
      setChildOtherNotes(nextChildOtherNotes);
      if (photoResult) {
        if (photoResult.error) {
          setError("写真枚数の読み込みに失敗しました");
        } else {
          const visitPhotos = (photoResult.data ?? []) as VisitPhotoRow[];
          const photoPaths = Array.from(
            new Set(
              visitPhotos.flatMap((photo) => [photo.thumb_path, photo.storage_path]),
            ),
          );
          const { data: signedPhotoUrls } =
            photoPaths.length > 0
              ? await supabase.storage
                  .from("visit-photos")
                  .createSignedUrls(photoPaths, 60 * 60)
              : { data: [] };
          const signedPhotoUrlByPath = new Map(
            (signedPhotoUrls ?? []).map((row) => [row.path, row.signedUrl]),
          );
          setExistingPhotoCount(visitPhotos.length);
          setExistingPhotos(
            visitPhotos.map((photo) => ({
              id: photo.id,
              storagePath: photo.storage_path,
              thumbPath: photo.thumb_path,
              thumbUrl: signedPhotoUrlByPath.get(photo.thumb_path) ?? null,
              fullUrl: signedPhotoUrlByPath.get(photo.storage_path) ?? null,
              takenOn: photo.taken_on,
            })),
          );
        }
      }
      setFacilityName(data.facility_name ?? "");
      setFacilitySlug(data.facility_slug ?? "");
      setVisitStatus(data.status === "draft" ? "draft" : "published");
      setVisitedOn(data.visited_on ?? "");
      setFamilyRevisit(coerceOption(data.family_revisit, familyRevisitValues));
      setParentFatigue(coerceOption(data.parent_fatigue, fatigueValues));
      setExpectation(coerceOption(data.expectation_vs_reality, expectationValues));
      setWeather(coerceOption(data.weather, weatherValues));
      setCrowding(coerceOption(data.crowding, crowdingValues));
      setParking(coerceOption(data.parking, parkingValues));
      setDurationMinutes(coerceDuration(data.stay_duration_min));
      setTimeWasEnough(coerceOption(data.time_was_enough, timeWasEnoughValues));
      setFoodRating(coerceOption(data.food_rating, foodRatingValues));
      setParentMemo(data.parent_memo ?? "");
      if (
        data.expectation_vs_reality ||
        data.weather ||
        data.crowding ||
        data.parking ||
        data.stay_duration_min ||
        data.time_was_enough ||
        data.food_rating ||
        data.parent_memo
      ) {
        setDetailsOpen(true);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [visitId]);

  useEffect(() => {
    if (!saving) saveLockedRef.current = false;
  }, [saving]);

  useEffect(() => {
    const query = facilityName.trim();
    if (facilitySlug || query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/facilities/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as { results?: FacilitySuggestion[] };
        setSuggestions(data.results ?? []);
        setSuggestionsOpen(true);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [facilityName, facilitySlug]);

  const canSubmit =
    facilityName.trim().length > 0 &&
    Boolean(familyRevisit) &&
    Boolean(parentFatigue) &&
    selectedChildIds.every((childId) => Boolean(satisfactions[childId])) &&
    !saving &&
    !loading &&
    (!PHOTO_UPLOAD_ENABLED || !photoBusy);

  const selectedChildren = children.filter((child) =>
    selectedChildIds.includes(child.id),
  );
  const interestTags = reactionTagMaster.filter(
    (tag) => tag.tag_type === "interest" && tag.id !== "other" && tag.label !== "その他",
  );
  const behaviorTags = reactionTagMaster.filter(
    (tag) => tag.tag_type !== "interest",
  );

  function toggleChild(childId: string) {
    setSelectedChildIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  }

  function updateOtherNote(
    childId: string,
    field: keyof OtherNotes,
    value: string,
  ) {
    setChildOtherNotes((current) => ({
      ...current,
      [childId]: {
        interest: current[childId]?.interest ?? "",
        behavior: current[childId]?.behavior ?? "",
        [field]: value,
      },
    }));
  }

  async function saveVisit(nextStatus?: VisitStatus) {
    if (saveLockedRef.current || !canSubmit) return;
    saveLockedRef.current = true;
    const publishingDraft = visitStatus === "draft" && nextStatus === "published";
    setSaving(true);
    setError(null);
    const updatePayload: {
      facility_name: string;
      facility_slug: string;
      visited_on: string | null;
      family_revisit: FamilyRevisit | "";
      parent_fatigue: ParentFatigue | "";
      expectation_vs_reality: Expectation | null;
      weather: Weather | null;
      crowding: Crowding | null;
      parking: Parking | null;
      stay_duration_min: number | null;
      time_was_enough: TimeWasEnough | null;
      food_rating: FoodRating | null;
      parent_memo: string | null;
      updated_at: string;
      status?: VisitStatus;
    } = {
      facility_name: facilityName.trim(),
      facility_slug: facilitySlug || makeFacilitySlug(facilityName),
      visited_on: visitedOn || null,
      family_revisit: familyRevisit,
      parent_fatigue: parentFatigue,
      expectation_vs_reality: expectation || null,
      weather: weather || null,
      crowding: crowding || null,
      parking: parking || null,
      stay_duration_min: durationMinutes ? parseInt(durationMinutes, 10) : null,
      time_was_enough: timeWasEnough || null,
      food_rating: foodRating || null,
      parent_memo: parentMemo.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus) updatePayload.status = nextStatus;

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("visits")
      .update(updatePayload)
      .eq("id", visitId);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const selectedChildIdSet = new Set(selectedChildIds);
    const nextExistingVisitChildren = { ...existingVisitChildren };
    const nextExistingChildTags = { ...existingChildTags };

    for (const [childId, existing] of Object.entries(existingVisitChildren)) {
      if (selectedChildIdSet.has(childId)) continue;

      const { error: deleteTagsError } = await supabase
        .from("visit_child_tags")
        .delete()
        .eq("visit_child_id", existing.id);
      if (deleteTagsError) {
        setError(deleteTagsError.message);
        setSaving(false);
        return;
      }

      const { error: deleteChildError } = await supabase
        .from("visit_children")
        .delete()
        .eq("id", existing.id);
      if (deleteChildError) {
        setError(deleteChildError.message);
        setSaving(false);
        return;
      }
      delete nextExistingVisitChildren[childId];
      delete nextExistingChildTags[existing.id];
    }

    for (const child of selectedChildren) {
      const satisfaction = satisfactions[child.id];
      if (!satisfaction) {
        setError("選択した子どもの満足度を入力してください");
        setSaving(false);
        return;
      }

      let visitChildId = nextExistingVisitChildren[child.id]?.id;
      if (visitChildId) {
        const behaviorOtherSelected = (childTags[child.id] ?? []).some((tagId) => {
          const tag = reactionTagMaster.find((item) => item.id === tagId);
          return tag ? isBehaviorOtherTag(tag) : false;
        });
        const updateVisitChildPayload: {
          satisfaction: Satisfaction;
          child_age_at_visit?: number;
          interest_other_note: string | null;
          behavior_other_note: string | null;
        } = {
          satisfaction,
          interest_other_note: encodeInterestOtherNote(
            childOtherNotes[child.id]?.interest ?? "",
            Boolean(interestOtherSelected[child.id]),
          ),
          behavior_other_note: normalizeOtherNote(
            childOtherNotes[child.id]?.behavior ?? "",
            behaviorOtherSelected,
          ),
        };
        const ageAtVisit = childAgeAtVisit(
          visitedOn,
          child.birth_year,
          child.birth_month,
        );
        if (ageAtVisit !== null) {
          updateVisitChildPayload.child_age_at_visit = ageAtVisit;
        }
        const { error: childUpdateError } = await supabase
          .from("visit_children")
          .update(updateVisitChildPayload)
          .eq("id", visitChildId);
        if (childUpdateError) {
          setError(childUpdateError.message);
          setSaving(false);
          return;
        }
      } else {
        const behaviorOtherSelected = (childTags[child.id] ?? []).some((tagId) => {
          const tag = reactionTagMaster.find((item) => item.id === tagId);
          return tag ? isBehaviorOtherTag(tag) : false;
        });
        const { data: insertedChild, error: childInsertError } = await supabase
          .from("visit_children")
          .insert({
            visit_id: visitId,
            child_id: child.id,
            satisfaction,
            child_age_at_visit: childAgeAtVisit(
              visitedOn,
              child.birth_year,
              child.birth_month,
            ),
            interest_other_note: encodeInterestOtherNote(
              childOtherNotes[child.id]?.interest ?? "",
              Boolean(interestOtherSelected[child.id]),
            ),
            behavior_other_note: normalizeOtherNote(
              childOtherNotes[child.id]?.behavior ?? "",
              behaviorOtherSelected,
            ),
          })
          .select("id")
          .single();
        if (childInsertError || !insertedChild) {
          setError(childInsertError?.message ?? "子ども別記録の保存に失敗しました");
          setSaving(false);
          return;
        }
        visitChildId = insertedChild.id;
        nextExistingVisitChildren[child.id] = {
          id: visitChildId,
          satisfaction,
        };
        nextExistingChildTags[visitChildId] = [];
      }

      const selectedTags = sortedUnique(childTags[child.id] ?? []);
      const currentTags = sortedUnique(nextExistingChildTags[visitChildId] ?? []);
      const currentTagSet = new Set(currentTags);
      const selectedTagSet = new Set(selectedTags);
      const tagsToInsert = selectedTags.filter((tagId) => !currentTagSet.has(tagId));
      const tagsToDelete = currentTags.filter((tagId) => !selectedTagSet.has(tagId));

      if (tagsToDelete.length > 0) {
        const { error: tagDeleteError } = await supabase
          .from("visit_child_tags")
          .delete()
          .eq("visit_child_id", visitChildId)
          .in("tag_id", tagsToDelete);
        if (tagDeleteError) {
          setError(tagDeleteError.message);
          setSaving(false);
          return;
        }
      }

      if (tagsToInsert.length > 0) {
        const { error: tagInsertError } = await supabase
          .from("visit_child_tags")
          .insert(
            tagsToInsert.map((tagId) => ({
              visit_child_id: visitChildId,
              tag_id: tagId,
            })),
          );
        if (tagInsertError) {
          setError(tagInsertError.message);
          setSaving(false);
          return;
        }
      }
      nextExistingChildTags[visitChildId] = selectedTags;
      nextExistingVisitChildren[child.id] = {
        id: visitChildId,
        satisfaction,
      };
    }

    setExistingVisitChildren(nextExistingVisitChildren);
    setExistingChildTags(nextExistingChildTags);

    if (PHOTO_UPLOAD_ENABLED) {
      const photoResult = await photoUploaderRef.current?.upload(visitId);
      if (photoResult && !photoResult.ok) {
        setError(`変更は保存済みです。写真だけ再試行できます。${photoResult.error}`);
        setSaving(false);
        return;
      }
    }

    if (publishingDraft) {
      storeVisitCompletion({
        visitId,
        entryMethod: "photo_publish",
        batchIds: photoBatchIds,
      });
      router.replace("/mypage/visits/complete");
      return;
    }
    router.push("/mypage/visits");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveVisit();
  }

  const isDraft = visitStatus === "draft";

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="h-6 bg-slate-100 rounded animate-pulse w-24" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link
        href="/mypage/visits"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← 履歴に戻る
      </Link>

      {isDraft && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <p className="font-bold">あと少しで記録が完成します</p>
          <p className="mt-1">内容を確認し、子どもの紐付けは必要なときだけ選んで公開してください。</p>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">記録を編集</h1>
          {isDraft && (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
              下書き
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {isDraft
            ? "公開すると施設ページや共有に表示されます。"
            : "施設名・日付・評価を変更できます。"}
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            施設名
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => {
              setFacilityName(e.target.value);
              setFacilitySlug("");
              setSuggestions([]);
              setSuggestionsOpen(false);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setSuggestionsOpen(true);
              }
            }}
            placeholder="施設名を入力、例: 富士山こどもの国"
            className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          {suggestionsOpen && suggestions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg py-2 shadow-sm">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.slug}
                  type="button"
                  onClick={() => {
                    setFacilityName(suggestion.name);
                    setFacilitySlug(suggestion.slug);
                    setSuggestions([]);
                    setSuggestionsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="block text-sm font-medium text-slate-800">
                    {suggestion.name}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {suggestion.prefecture} / {suggestion.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            訪問日
          </label>
          <input
            type="date"
            value={visitedOn}
            onChange={(e) => setVisitedOn(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </section>

        {children.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-bold text-slate-800">今回行った子ども</p>
            <p className="text-xs text-slate-500">
              子どもを選ぶと、満足度と「何を楽しんでいた？」を記録できます
            </p>
            <div className="space-y-2">
              {children.map((child) => (
                <label
                  key={child.id}
                  className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedChildIds.includes(child.id)}
                    onChange={() => toggleChild(child.id)}
                    className="h-4 w-4 accent-brand"
                  />
                  <ChildAvatar
                    childId={child.id}
                    nickname={child.nickname}
                    avatarUrl={child.avatarUrl ?? null}
                    size="sm"
                  />
                  <span className="font-medium text-slate-800">
                    {child.nickname}
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {selectedChildren.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-bold text-slate-800">子どもごとの満足度</p>
            {selectedChildren.map((child) => (
              <div
                key={child.id}
                className="bg-white border border-slate-200 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <ChildAvatar
                    childId={child.id}
                    nickname={child.nickname}
                    avatarUrl={child.avatarUrl ?? null}
                    size="sm"
                  />
                  <p className="text-sm font-semibold text-slate-800">
                    {child.nickname}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {satisfactionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSatisfactions((current) => ({
                          ...current,
                          [child.id]: option.value,
                        }));
                      }}
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                        satisfactions[child.id] === option.value
                          ? "bg-brand border-brand text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {reactionTagMaster.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {[
                      {
                        kind: "interest" as const,
                        title: `${child.nickname}は何を楽しんでいた？`,
                        tags: interestTags,
                      },
                      {
                        kind: "behavior" as const,
                        title: `${child.nickname}はどんな様子だった？`,
                        tags: behaviorTags,
                      },
                    ].map(({ kind, title, tags }) => {
                      const behaviorOtherTag = tags.find(isBehaviorOtherTag);
                      const otherSelected =
                        kind === "interest"
                          ? Boolean(interestOtherSelected[child.id])
                          : Boolean(
                              behaviorOtherTag &&
                                (childTags[child.id] ?? []).includes(
                                  behaviorOtherTag.id,
                                ),
                            );
                      const otherNote =
                        childOtherNotes[child.id]?.[kind] ?? "";
                      const showBlock = tags.length > 0 || kind === "interest";
                      return showBlock ? (
                        <div key={title} className="space-y-1.5">
                          <p className="text-xs font-bold text-slate-600">
                            {title}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kind === "interest" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInterestOtherSelected((prev) => ({
                                    ...prev,
                                    [child.id]: !prev[child.id],
                                  }))
                                }
                                className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                                  otherSelected
                                    ? "bg-brand border-brand text-white"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                その他
                              </button>
                            )}
                            {tags.map((tag) => {
                              const selected = (childTags[child.id] ?? []).includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() =>
                                    setChildTags((prev) => {
                                      const current = prev[child.id] ?? [];
                                      return {
                                        ...prev,
                                        [child.id]: selected
                                          ? current.filter((tagId) => tagId !== tag.id)
                                          : [...current, tag.id],
                                      };
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${
                                    selected
                                      ? "bg-brand border-brand text-white"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {tag.label}
                                </button>
                              );
                            })}
                          </div>
                          {otherSelected && (
                            <input
                              type="text"
                              value={otherNote}
                              onChange={(event) =>
                                updateOtherNote(child.id, kind, event.target.value)
                              }
                              maxLength={otherNoteMaxLength}
                              placeholder={
                                kind === "interest"
                                  ? "例: 迷路にハマっていた、シャボン玉ばかりしていた"
                                  : "例: 帰りたがらなかった、お友達に譲れた"
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                            />
                          )}
                        </div>
                      ) : null;
                    })}
                    {(childTags[child.id]?.length ?? 0) === 0 &&
                      !interestOtherSelected[child.id] && (
                      <p className="text-xs text-slate-400">スキップしてもOKです</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <OptionButtons
          title="また行きたいか"
          options={familyRevisitOptions}
          value={familyRevisit}
          onChange={setFamilyRevisit}
        />

        <OptionButtons
          title="親の疲れ度"
          options={fatigueOptions}
          value={parentFatigue}
          onChange={setParentFatigue}
        />

        <section className="border border-slate-200 rounded-xl bg-white">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="w-full px-4 py-3 text-left text-sm font-bold text-slate-800"
          >
            もっと詳しく記録する {detailsOpen ? "▲" : "▼"}
          </button>
          <div className={`px-4 pb-4 space-y-4 ${detailsOpen ? "" : "hidden"}`}>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400">おでかけ環境</p>
              <OptionButtons
                title="天気"
                options={weatherOptions}
                value={weather}
                onChange={setWeather}
                allowClear
                small
              />
              <OptionButtons
                title="混雑度"
                options={crowdingOptions}
                value={crowding}
                onChange={setCrowding}
                allowClear
                small
              />
              <OptionButtons
                title="アクセス・移動"
                options={parkingOptions}
                value={parking}
                onChange={setParking}
                allowClear
                small
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400">過ごし方</p>
              <OptionButtons
                title="滞在時間"
                options={durationOptions}
                value={durationMinutes}
                onChange={setDurationMinutes}
                allowClear
                small
              />
              <OptionButtons
                title="時間は足りたか"
                options={timeWasEnoughOptions}
                value={timeWasEnough}
                onChange={setTimeWasEnough}
                allowClear
                small
              />
              <OptionButtons
                title="ごはん・食事"
                options={foodRatingOptions}
                value={foodRating}
                onChange={setFoodRating}
                allowClear
                small
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400">振り返り</p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600">期待との比較</p>
                <div className="grid grid-cols-3 gap-2">
                  {expectationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setExpectation(
                          expectation === option.value ? "" : option.value,
                        )
                      }
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                        expectation === option.value
                          ? "bg-brand border-brand text-white"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">
                親メモ
              </label>
              <textarea
                value={parentMemo}
                onChange={(e) => setParentMemo(e.target.value)}
                placeholder="気づいたこと、次回メモなど"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {PHOTO_UPLOAD_ENABLED && (
              <div className="space-y-4">
                {existingPhotos.length > 0 && (
                  <VisitPhotoGallery
                    visitId={visitId}
                    initialPhotos={existingPhotos}
                    title="保存済みの写真"
                    onPhotosChange={setExistingPhotoCount}
                    deletable
                    variant="grid"
                  />
                )}
                <VisitPhotoUploader
                  ref={photoUploaderRef}
                  initialExistingCount={existingPhotoCount}
                  disabled={saving}
                  onBusyChange={setPhotoBusy}
                />
              </div>
            )}
          </div>
        </section>

        {isDraft ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => saveVisit("published")}
              disabled={!canSubmit}
              className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
            >
              {saving ? "保存中..." : "公開する"}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              {saving ? "保存中..." : "下書きのまま保存"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
          >
            {saving ? "保存中..." : "変更を保存"}
          </button>
        )}
      </form>
    </div>
  );
}

function OptionButtons<T extends string>({
  title,
  options,
  value,
  onChange,
  allowClear = false,
  small = false,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T | "") => void;
  allowClear?: boolean;
  small?: boolean;
}) {
  return (
    <section className="space-y-2">
      <p className={small ? "text-xs font-bold text-slate-600" : "text-sm font-bold text-slate-800"}>
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onChange(allowClear && value === option.value ? "" : option.value)
            }
            className={`py-2 px-2 rounded-lg border font-medium transition-colors ${
              value === option.value
                ? "bg-brand border-brand text-white"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
            } ${small ? "text-xs" : "text-sm"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
