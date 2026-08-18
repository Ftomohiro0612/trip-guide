"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ChildAvatar from "@/components/ChildAvatar";
import ChildRegistrationNudge from "@/components/ChildRegistrationNudge";
import { childAgeAtVisit } from "@/lib/child-age";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import {
  clearGuestRecordDraft,
  readGuestRecordDraft,
  type GuestRecordDraft,
} from "@/lib/guest-record";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";
import { createClient } from "@/lib/supabase/client";
import { encodeInterestOtherNote } from "@/lib/visit-other-note";
import {
  storeVisitCompletion,
  takeVisitPresetChildren,
} from "@/lib/visit-flow-session";
import VisitPhotoUploader, {
  type VisitPhotoUploaderHandle,
} from "../VisitPhotoUploader";

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  avatar_url: string | null;
  avatarUrl?: string | null;
};

type DateChoice = "today" | "yesterday" | "custom";
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
type Satisfaction =
  | "loved"
  | "enjoyed"
  | "neutral"
  | "not_fit";

type FacilitySuggestion = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

type VisitCompletionContext = {
  facilitySlug: string;
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

function formatDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dateForChoice(choice: DateChoice, customDate: string): string {
  if (choice === "custom") return customDate;
  const date = new Date();
  if (choice === "yesterday") {
    date.setDate(date.getDate() - 1);
  }
  return formatDate(date);
}

function makeFacilitySlug(name: string): string {
  const encoded = Array.from(name.trim())
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
  return `manual-${encoded.slice(0, 120) || Date.now().toString(36)}`;
}

function normalizeOtherNote(value: string, selected: boolean): string | null {
  if (!selected) return null;
  const note = value.trim();
  return note ? note : null;
}

function isBehaviorOtherTag(tag: ReactionTag): boolean {
  return tag.tag_type !== "interest" && (tag.id === "other" || tag.label === "その他");
}

export default function NewVisitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const facilitySlugFromUrl = searchParams.get("facility") ?? "";
  const nameFromUrl = searchParams.get("name") ?? "";
  const restoreGuestDraft = searchParams.get("guestDraft") === "1";
  const photoUploaderRef = useRef<VisitPhotoUploaderHandle>(null);
  const submissionLockedRef = useRef(false);

  const [facilityName, setFacilityName] = useState(nameFromUrl);
  const [facilitySlug, setFacilitySlug] = useState(facilitySlugFromUrl);
  const [suggestions, setSuggestions] = useState<FacilitySuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [dateChoice, setDateChoice] = useState<DateChoice>("today");
  const [customDate, setCustomDate] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [satisfactions, setSatisfactions] = useState<Record<string, Satisfaction>>({});
  const [familyRevisit, setFamilyRevisit] = useState<FamilyRevisit | "">("");
  const [parentFatigue, setParentFatigue] = useState<ParentFatigue | "">("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [weather, setWeather] = useState<Weather | "">("");
  const [crowding, setCrowding] = useState<Crowding | "">("");
  const [parking, setParking] = useState<Parking | "">("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [timeWasEnough, setTimeWasEnough] = useState<TimeWasEnough | "">("");
  const [foodRating, setFoodRating] = useState<FoodRating | "">("");
  const [expectation, setExpectation] = useState<Expectation | "">("");
  const [reactionTagMaster, setReactionTagMaster] = useState<ReactionTag[]>([]);
  const [childTags, setChildTags] = useState<Record<string, string[]>>({});
  const [interestOtherSelected, setInterestOtherSelected] = useState<
    Record<string, boolean>
  >({});
  const [childOtherNotes, setChildOtherNotes] = useState<Record<string, OtherNotes>>(
    {},
  );
  const [parentMemo, setParentMemo] = useState("");
  const [restoredGuestDraft, setRestoredGuestDraft] =
    useState<GuestRecordDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdVisitId, setCreatedVisitId] = useState<string | null>(null);
  const [createdVisitContext, setCreatedVisitContext] =
    useState<VisitCompletionContext | null>(null);

  useEffect(() => {
    if (!restoreGuestDraft) return;
    const restoreId = window.setTimeout(() => {
      const guestDraft = readGuestRecordDraft();
      if (
        !guestDraft ||
        guestDraft.facilitySlug !== facilitySlugFromUrl ||
        guestDraft.facilityName !== nameFromUrl
      ) {
        return;
      }

      setRestoredGuestDraft(guestDraft);
      setDateChoice("custom");
      setCustomDate(guestDraft.visitedOn);
      setFamilyRevisit(guestDraft.familyRevisit);
      setParentFatigue(guestDraft.parentFatigue);
      setDetailsOpen(true);
      setParentMemo(guestDraft.note);
    }, 0);

    return () => window.clearTimeout(restoreId);
  }, [facilitySlugFromUrl, nameFromUrl, restoreGuestDraft]);

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      const supabase = createClient();
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

      const { data: tagData } = await supabase
        .from("reaction_tags")
        .select("id, label, category, sort_order, tag_type")
        .eq("is_active", true)
        .order("sort_order");

      if (!active) return;
      if (tagData) setReactionTagMaster(tagData as ReactionTag[]);
      const { data, error: childrenError } = childrenResult;
      if (childrenError) {
        setError(childrenError.message);
      } else {
        const childRows = (data ?? []) as Child[];
        const guestDraft = restoreGuestDraft ? readGuestRecordDraft() : null;
        const matchingGuestDraft =
          guestDraft &&
          guestDraft.facilitySlug === facilitySlugFromUrl &&
          guestDraft.facilityName === nameFromUrl
            ? guestDraft
            : null;
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
        setChildren(
          childRows.map((child) => ({
            ...child,
            avatarUrl: child.avatar_url
              ? avatarUrlByPath.get(child.avatar_url) ?? null
              : null,
          })),
        );
        if (matchingGuestDraft) {
          if (childRows.length === 0) {
            setParentMemo(
              `${matchingGuestDraft.note}\n\nお試しで選んだ興味：${matchingGuestDraft.interestTagIds
                  .map((tag) => getRecommendedForTagMeta(tag).label)
                  .join("、")}`,
            );
          } else {
            setChildTags(
              Object.fromEntries(
                childRows.map((child) => [
                  child.id,
                  matchingGuestDraft.interestTagIds,
                ]),
              ),
            );
          }
        }
        const childIdSet = new Set(childRows.map((child) => child.id));
        const presetChildIds = takeVisitPresetChildren();
        setSelectedChildIds(
          presetChildIds === null
            ? childRows.map((child) => child.id)
            : presetChildIds.filter((childId) => childIdSet.has(childId)),
        );
      }
      setInitializing(false);
    }

    loadChildren();
    return () => {
      active = false;
    };
  }, [facilitySlugFromUrl, nameFromUrl, restoreGuestDraft]);

  useEffect(() => {
    if (!loading) submissionLockedRef.current = false;
  }, [loading]);

  useEffect(() => {
    const query = facilityName.trim();
    if (facilitySlugFromUrl || facilitySlug || query.length < 2) return;

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
  }, [facilityName, facilitySlug, facilitySlugFromUrl]);

  const visitedOn = useMemo(
    () => dateForChoice(dateChoice, customDate),
    [dateChoice, customDate],
  );

  const selectedChildren = children.filter((child) =>
    selectedChildIds.includes(child.id),
  );
  const interestTags = reactionTagMaster.filter(
    (tag) => tag.tag_type === "interest" && tag.id !== "other" && tag.label !== "その他",
  );
  const behaviorTags = reactionTagMaster.filter(
    (tag) => tag.tag_type !== "interest",
  );

  const allSelectedChildrenRated =
    selectedChildren.length === 0 ||
    selectedChildren.every((child) => satisfactions[child.id]);

  const canSubmit =
    facilityName.trim().length > 0 &&
    Boolean(visitedOn) &&
    Boolean(familyRevisit) &&
    Boolean(parentFatigue) &&
    allSelectedChildrenRated &&
    !loading &&
    !initializing &&
    (!PHOTO_UPLOAD_ENABLED || !photoBusy);

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

  function finishAfterSave(visitId: string) {
    setCreatedVisitId(null);
    setCreatedVisitContext(null);
    if (PHOTO_UPLOAD_ENABLED) {
      photoUploaderRef.current?.reset();
    }
    storeVisitCompletion({
      visitId,
      entryMethod: "standard",
      returnFacility: facilitySlugFromUrl || undefined,
    });
    if (restoredGuestDraft) clearGuestRecordDraft();
    router.replace("/mypage/visits/complete");
  }

  async function uploadPhotosForVisit(
    visitId: string,
    context: VisitCompletionContext,
  ) {
    if (!PHOTO_UPLOAD_ENABLED) return true;

    const photoResult = await photoUploaderRef.current?.upload(visitId);
    if (photoResult && !photoResult.ok) {
      setCreatedVisitId(visitId);
      setCreatedVisitContext(context);
      setError(`記録は保存済みです。写真だけ再試行できます。${photoResult.error}`);
      setLoading(false);
      return false;
    }
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLockedRef.current || !canSubmit) return;
    submissionLockedRef.current = true;

    setLoading(true);
    setError(null);

    if (createdVisitId) {
      const retryContext = createdVisitContext ?? {
        facilitySlug: facilitySlugFromUrl || facilitySlug || makeFacilitySlug(facilityName),
      };
      if (await uploadPhotosForVisit(createdVisitId, retryContext)) {
        finishAfterSave(createdVisitId);
      }
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("ログインが必要です");
      setLoading(false);
      return;
    }

    const visitedDate = new Date(`${visitedOn}T00:00:00`);
    const visitedYear = visitedDate.getFullYear();
    const visitedMonth = visitedDate.getMonth() + 1;
    const today = formatDate(new Date());
    const savedFacilitySlug =
      facilitySlugFromUrl || facilitySlug || makeFacilitySlug(facilityName);
    const visitCompletionContext: VisitCompletionContext = {
      facilitySlug: savedFacilitySlug,
    };

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        user_id: user.id,
        facility_slug: savedFacilitySlug,
        facility_name: facilityName.trim(),
        visited_on: visitedOn,
        visited_year: visitedYear,
        visited_month: visitedMonth,
        date_precision: "exact",
        is_past_entry: visitedOn < today,
        family_revisit: familyRevisit,
        parent_fatigue: parentFatigue,
        weather: weather || null,
        crowding: crowding || null,
        parking: parking || null,
        stay_duration_min: durationMinutes ? parseInt(durationMinutes, 10) : null,
        time_was_enough: timeWasEnough || null,
        food_rating: foodRating || null,
        expectation_vs_reality: expectation || null,
        parent_memo: parentMemo.trim() || null,
      })
      .select("id")
      .single();

    if (visitError || !visit) {
      setError(visitError?.message ?? "保存に失敗しました");
      setLoading(false);
      return;
    }

    if (selectedChildren.length > 0) {
      const rows = selectedChildren.map((child) => ({
        visit_id: visit.id,
        child_id: child.id,
        satisfaction: satisfactions[child.id],
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
          (childTags[child.id] ?? []).some((tagId) => {
            const tag = reactionTagMaster.find((item) => item.id === tagId);
            return tag ? isBehaviorOtherTag(tag) : false;
          }),
        ),
      }));

      const { data: visitChildRows, error: childError } = await supabase
        .from("visit_children")
        .insert(rows)
        .select("id, child_id");
      if (childError) {
        setError(childError.message);
        setLoading(false);
        return;
      }

      const tagRows = (visitChildRows ?? []).flatMap((row) =>
        (childTags[row.child_id] ?? []).map((tagId) => ({
          visit_child_id: row.id,
          tag_id: tagId,
        })),
      );

      if (tagRows.length > 0) {
        const { error: tagError } = await supabase
          .from("visit_child_tags")
          .insert(tagRows);
        if (tagError) {
          setError(tagError.message);
          setLoading(false);
          return;
        }
      }
    }

    if (!(await uploadPhotosForVisit(visit.id, visitCompletionContext))) {
      return;
    }
    finishAfterSave(visit.id);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
        ← マイページ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">おでかけを記録</h1>
        <p className="text-sm text-slate-500 mt-1">必須項目だけなら30秒で残せます。</p>
      </div>

      {restoredGuestDraft && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-950">
            思い出カードの内容を引き継ぎました
          </p>
          <dl className="mt-2 space-y-1 text-xs leading-relaxed text-emerald-900">
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold">訪問日</dt>
              <dd>{restoredGuestDraft.visitedOn}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold">ひとこと</dt>
              <dd>{restoredGuestDraft.note}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold">興味タグ</dt>
              <dd>
                {restoredGuestDraft.interestTagIds
                  .map((tag) => getRecommendedForTagMeta(tag).label)
                  .join("、")}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-emerald-700">
            写真は安全のため引き継いでいません。
          </p>
        </section>
      )}

      <Link
        href="/mypage/visits/from-photo"
        className="block rounded-xl border border-brand/20 bg-sky-50 px-4 py-3 text-center transition-colors hover:bg-sky-100"
      >
        <span className="block text-sm font-bold text-brand">
          📷 写真からおでかけ記録を作る
        </span>
        <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">
          写真を選ぶだけで日付・場所が入ります
        </span>
      </Link>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">施設名</label>
          {facilitySlugFromUrl && (
            <p className="text-xs text-emerald-600 font-medium">施設ページから自動入力</p>
          )}
          <input
            type="text"
            value={facilityName}
            onChange={(event) => {
              setFacilityName(event.target.value);
              setFacilitySlug("");
              setSuggestions([]);
              setSuggestionsOpen(false);
            }}
            onFocus={() => {
              if (!facilitySlugFromUrl && suggestions.length > 0) {
                setSuggestionsOpen(true);
              }
            }}
            placeholder="施設名を入力、例: 富士山こどもの国"
            className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          {!facilitySlugFromUrl && suggestionsOpen && suggestions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg py-2 shadow-sm">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.slug}
                  type="button"
                  onClick={() => {
                    setFacilityName(suggestion.name);
                    setFacilitySlug(suggestion.slug);
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
          <p className="text-sm font-bold text-slate-800">訪問日</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "today", label: "今日" },
              { value: "yesterday", label: "昨日" },
              { value: "custom", label: "日付を選ぶ" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDateChoice(option.value as DateChoice)}
                className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                  dateChoice === option.value
                    ? "bg-brand border-brand text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {dateChoice === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          )}
        </section>

        {children.length === 0 && <ChildRegistrationNudge />}

        {children.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-bold text-slate-800">今回行った子ども</p>
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
                  <span className="font-medium text-slate-800">{child.nickname}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {selectedChildren.length > 0 && (
          <section className="space-y-3">
            <p className="text-sm font-bold text-slate-800">子どもごとの満足度</p>
            {selectedChildren.map((child) => (
              <div key={child.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ChildAvatar
                    childId={child.id}
                    nickname={child.nickname}
                    avatarUrl={child.avatarUrl ?? null}
                    size="sm"
                  />
                  <p className="text-sm font-semibold text-slate-800">{child.nickname}</p>
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

              <OptionButtons
                title="天気"
                options={weatherOptions}
                value={weather}
                onChange={setWeather}
                allowClear
                small
              />

              <OptionButtons
                title="混雑"
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

              <OptionButtons
                title="期待との比較"
                options={expectationOptions}
                value={expectation}
                onChange={setExpectation}
                allowClear
                small
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600">親メモ</label>
              <textarea
                value={parentMemo}
                onChange={(event) => setParentMemo(event.target.value)}
                placeholder="気づいたこと、次回メモなど"
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {PHOTO_UPLOAD_ENABLED && (
              <VisitPhotoUploader
                ref={photoUploaderRef}
                initialExistingCount={0}
                disabled={loading}
                onBusyChange={setPhotoBusy}
              />
            )}
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
        >
          {loading
            ? PHOTO_UPLOAD_ENABLED && createdVisitId
              ? "写真を保存中..."
              : "保存中..."
            : PHOTO_UPLOAD_ENABLED && createdVisitId
              ? "写真を再試行"
              : "保存する"}
        </button>
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
