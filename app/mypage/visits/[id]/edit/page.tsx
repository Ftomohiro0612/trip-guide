"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
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

export default function EditVisitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const visitId = params.id;
  const photoUploaderRef = useRef<VisitPhotoUploaderHandle>(null);

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

  useEffect(() => {
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
    !saving &&
    !loading &&
    (!PHOTO_UPLOAD_ENABLED || !photoBusy);

  async function saveVisit(nextStatus?: VisitStatus) {
    if (!canSubmit) return;
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

    if (PHOTO_UPLOAD_ENABLED) {
      const photoResult = await photoUploaderRef.current?.upload(visitId);
      if (photoResult && !photoResult.ok) {
        setError(`変更は保存済みです。写真だけ再試行できます。${photoResult.error}`);
        setSaving(false);
        return;
      }
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
