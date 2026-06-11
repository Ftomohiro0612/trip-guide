"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VisitPhotoUploader, {
  type VisitPhotoUploaderHandle,
} from "../../VisitPhotoUploader";

type FamilyRevisit = "yes" | "conditional" | "once_enough" | "no";
type ParentFatigue = "easy" | "normal" | "tired" | "exhausted";
type Weather = "sunny" | "cloudy" | "rainy" | "snowy" | "unknown";
type Crowding = "empty" | "normal" | "busy" | "very_busy" | "unknown";
type Parking = "easy" | "normal" | "difficult" | "full" | "none" | "not_used";
type TempFeeling = "hot" | "comfortable" | "cold";
type TimeWasEnough = "enough" | "want_more" | "too_long";
type FoodRating = "great" | "ok" | "poor" | "no_food";
type Expectation = "exceeded" | "met" | "below";

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
  { value: "unknown", label: "覚えていない" },
];

const crowdingOptions: { value: Crowding; label: string }[] = [
  { value: "empty", label: "空いていた" },
  { value: "normal", label: "ふつう" },
  { value: "busy", label: "混んでいた" },
  { value: "very_busy", label: "かなり混んでいた" },
  { value: "unknown", label: "覚えていない" },
];

const parkingOptions: { value: Parking; label: string }[] = [
  { value: "easy", label: "あり・余裕" },
  { value: "normal", label: "あり・普通" },
  { value: "difficult", label: "あり・混雑" },
  { value: "full", label: "満車" },
  { value: "none", label: "なし" },
  { value: "not_used", label: "使っていない" },
];

const tempFeelingOptions: { value: TempFeeling; label: string }[] = [
  { value: "hot", label: "暑かった" },
  { value: "comfortable", label: "ちょうどよかった" },
  { value: "cold", label: "寒かった" },
];

const durationOptions = [
  { value: "30", label: "0.5時間" },
  { value: "60", label: "1時間" },
  { value: "90", label: "1.5時間" },
  { value: "120", label: "2時間" },
  { value: "180", label: "3時間" },
  { value: "240", label: "4時間" },
  { value: "300", label: "5時間" },
  { value: "360", label: "6時間以上" },
];

const timeWasEnoughOptions: { value: TimeWasEnough; label: string }[] = [
  { value: "enough", label: "十分だった" },
  { value: "want_more", label: "足りなかった" },
  { value: "too_long", label: "長かった" },
];

const foodRatingOptions: { value: FoodRating; label: string }[] = [
  { value: "no_food", label: "なし" },
  { value: "great", label: "あり・満足" },
  { value: "poor", label: "あり・不満" },
  { value: "ok", label: "持参/普通" },
];

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
  const [visitedOn, setVisitedOn] = useState("");
  const [familyRevisit, setFamilyRevisit] = useState<FamilyRevisit | "">("");
  const [parentFatigue, setParentFatigue] = useState<ParentFatigue | "">("");
  const [expectation, setExpectation] = useState<Expectation | "">("");
  const [weather, setWeather] = useState<Weather | "">("");
  const [crowding, setCrowding] = useState<Crowding | "">("");
  const [parking, setParking] = useState<Parking | "">("");
  const [tempFeeling, setTempFeeling] = useState<TempFeeling | "">("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [timeWasEnough, setTimeWasEnough] = useState<TimeWasEnough | "">("");
  const [foodRating, setFoodRating] = useState<FoodRating | "">("");
  const [parentMemo, setParentMemo] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [existingPhotoCount, setExistingPhotoCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const [visitResult, photoCountResult] = await Promise.all([
        supabase
          .from("visits")
          .select(
            "facility_name, visited_on, family_revisit, parent_fatigue, expectation_vs_reality, weather, crowding, parking, temp_feeling, stay_duration_min, time_was_enough, food_rating, parent_memo",
          )
          .eq("id", visitId)
          .single(),
        supabase
          .from("visit_photos")
          .select("id", { count: "exact", head: true })
          .eq("visit_id", visitId),
      ]);
      if (!active) return;
      const { data, error: fetchError } = visitResult;
      if (fetchError || !data) {
        setError("記録の読み込みに失敗しました");
        setLoading(false);
        return;
      }
      if (photoCountResult.error) {
        setError("写真枚数の読み込みに失敗しました");
      } else {
        setExistingPhotoCount(photoCountResult.count ?? 0);
      }
      setFacilityName(data.facility_name ?? "");
      setVisitedOn(data.visited_on ?? "");
      setFamilyRevisit((data.family_revisit as FamilyRevisit) ?? "");
      setParentFatigue((data.parent_fatigue as ParentFatigue) ?? "");
      setExpectation((data.expectation_vs_reality as Expectation) ?? "");
      setWeather((data.weather as Weather) ?? "");
      setCrowding((data.crowding as Crowding) ?? "");
      setParking((data.parking as Parking) ?? "");
      setTempFeeling((data.temp_feeling as TempFeeling) ?? "");
      setDurationMinutes(data.stay_duration_min ? String(data.stay_duration_min) : "");
      setTimeWasEnough((data.time_was_enough as TimeWasEnough) ?? "");
      setFoodRating((data.food_rating as FoodRating) ?? "");
      setParentMemo(data.parent_memo ?? "");
      if (
        data.expectation_vs_reality ||
        data.weather ||
        data.crowding ||
        data.parking ||
        data.temp_feeling ||
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

  const canSubmit =
    facilityName.trim().length > 0 &&
    Boolean(familyRevisit) &&
    Boolean(parentFatigue) &&
    !saving &&
    !loading &&
    !photoBusy;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("visits")
      .update({
        facility_name: facilityName.trim(),
        visited_on: visitedOn || null,
        family_revisit: familyRevisit,
        parent_fatigue: parentFatigue,
        expectation_vs_reality: expectation || null,
        weather: weather || null,
        crowding: crowding || null,
        parking: parking || null,
        temp_feeling: tempFeeling || null,
        stay_duration_min: durationMinutes ? parseInt(durationMinutes, 10) : null,
        time_was_enough: timeWasEnough || null,
        food_rating: foodRating || null,
        parent_memo: parentMemo.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitId);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const photoResult = await photoUploaderRef.current?.upload(visitId);
    if (photoResult && !photoResult.ok) {
      setError(`変更は保存済みです。写真だけ再試行できます。${photoResult.error}`);
      setSaving(false);
      return;
    }

    router.push("/mypage/visits");
  }

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
        <h1 className="text-xl font-bold text-slate-900">記録を編集</h1>
        <p className="text-sm text-slate-500 mt-1">
          施設名・日付・評価を変更できます。
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
            onChange={(e) => setFacilityName(e.target.value)}
            className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
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
                title="気温感"
                options={tempFeelingOptions}
                value={tempFeeling}
                onChange={setTempFeeling}
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
                title="駐車場"
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
                title="食事"
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

            <VisitPhotoUploader
              ref={photoUploaderRef}
              initialExistingCount={existingPhotoCount}
              disabled={saving}
              onBusyChange={setPhotoBusy}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
        >
          {saving ? "保存中..." : "変更を保存"}
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
