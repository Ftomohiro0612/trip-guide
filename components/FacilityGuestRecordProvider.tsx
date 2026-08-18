"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildAuthDest, buildLoginRedirect, buildRegisterRedirect } from "@/lib/auth-dest";
import {
  selectGuestRecordRecommendations,
  storeGuestRecordDraft,
  type GuestInterestTag,
  type GuestRecordDraft,
  type GuestRecordRecommendation,
} from "@/lib/guest-record";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";

type GuestRecordContextValue = {
  openGuestRecord: () => void;
};

const GuestRecordContext = createContext<GuestRecordContextValue | null>(null);

function localDateValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

const revisitOptions: Array<{
  value: GuestRecordDraft["familyRevisit"];
  label: string;
}> = [
  { value: "yes", label: "また行きたい" },
  { value: "conditional", label: "条件次第" },
  { value: "once_enough", label: "一度で十分" },
  { value: "no", label: "もう行かない" },
];

const fatigueOptions: Array<{
  value: GuestRecordDraft["parentFatigue"];
  label: string;
}> = [
  { value: "easy", label: "楽だった" },
  { value: "normal", label: "普通" },
  { value: "tired", label: "少し疲れた" },
  { value: "exhausted", label: "かなり疲れた" },
];

export function useFacilityGuestRecord() {
  const context = useContext(GuestRecordContext);
  if (!context) {
    throw new Error(
      "useFacilityGuestRecord must be used within FacilityGuestRecordProvider",
    );
  }
  return context;
}

export default function FacilityGuestRecordProvider({
  facilitySlug,
  facilityName,
  interestTags,
  recommendationCandidates,
  children,
}: {
  facilitySlug: string;
  facilityName: string;
  interestTags: GuestInterestTag[];
  recommendationCandidates: GuestRecordRecommendation[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openGuestRecord = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openGuestRecord }), [openGuestRecord]);

  return (
    <GuestRecordContext.Provider value={value}>
      {children}
      {open && (
        <GuestRecordExperience
          facilitySlug={facilitySlug}
          facilityName={facilityName}
          interestTags={interestTags}
          recommendationCandidates={recommendationCandidates}
          onClose={() => setOpen(false)}
        />
      )}
    </GuestRecordContext.Provider>
  );
}

function GuestRecordExperience({
  facilitySlug,
  facilityName,
  interestTags,
  recommendationCandidates,
  onClose,
}: {
  facilitySlug: string;
  facilityName: string;
  interestTags: GuestInterestTag[];
  recommendationCandidates: GuestRecordRecommendation[];
  onClose: () => void;
}) {
  const photoUrlsRef = useRef<string[]>([]);
  const [step, setStep] = useState<"record" | "complete">("record");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [visitedOn, setVisitedOn] = useState(() => localDateValue(new Date()));
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<GuestInterestTag[]>([]);
  const [familyRevisit, setFamilyRevisit] =
    useState<GuestRecordDraft["familyRevisit"]>("yes");
  const [parentFatigue, setParentFatigue] =
    useState<GuestRecordDraft["parentFatigue"]>("normal");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const recommendations = selectGuestRecordRecommendations(
    recommendationCandidates,
    selectedTags,
  );
  const saveDestination = `${buildAuthDest("record", facilitySlug, facilityName)}&guestDraft=1`;
  const registerHref = buildRegisterRedirect(saveDestination);
  const loginHref = buildLoginRedirect(saveDestination);
  const canComplete =
    Boolean(visitedOn) &&
    note.trim().length > 0 &&
    selectedTags.length > 0;

  function completeRecord() {
    const draft: GuestRecordDraft = {
      version: 1,
      facilitySlug,
      facilityName,
      visitedOn,
      note: note.trim(),
      interestTagIds: selectedTags,
      familyRevisit,
      parentFatigue,
    };
    storeGuestRecordDraft(draft);
    setStep("complete");
  }

  if (step === "complete") {
    return (
      <main
        className="fixed inset-0 z-[80] overflow-y-auto bg-[#fffaf3] px-4 py-5 text-slate-950"
        aria-labelledby="guest-memory-complete-heading"
      >
        <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5">
          <div className="text-center">
            <p className="text-xs font-black tracking-[0.18em] text-amber-600">
              MEMORY COMPLETE
            </p>
            <h1
              id="guest-memory-complete-heading"
              className="mt-1 text-2xl font-black"
            >
              思い出が1枚できました
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              登録前でも、今ここで見返せます。
            </p>
          </div>

          <section className="relative aspect-[9/13] w-full overflow-hidden rounded-[2rem] bg-slate-900 text-white shadow-2xl">
            {photoUrls.length > 0 ? (
              <div className={`absolute inset-0 grid gap-0.5 bg-black ${
                photoUrls.length === 1
                  ? "grid-cols-1"
                  : photoUrls.length === 2
                    ? "grid-rows-2"
                    : "grid-cols-2 grid-rows-[2fr_1fr]"
              }`}>
                {photoUrls.slice(0, 3).map((url, index) => (
                  // Guest photos remain local object URLs and are never uploaded.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`${facilityName}で選んだ思い出 ${index + 1}`}
                    className={`h-full w-full object-cover ${
                      photoUrls.length === 3 && index === 0 ? "col-span-2" : ""
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-700 via-sky-700 to-slate-950">
                <span className="text-8xl opacity-60" aria-hidden>🗺️</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/90" />
            <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
              {displayDate(visitedOn)}
            </div>
            <div className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-6 pt-10">
              <p className="text-xs font-bold tracking-[0.16em] text-white/65">
                OUR FAMILY MEMORY
              </p>
              <h2 className="text-2xl font-black leading-tight [overflow-wrap:anywhere]">
                {facilityName}
              </h2>
              <blockquote className="border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">
                「{note.trim()}」
              </blockquote>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur-sm"
                  >
                    {getRecommendedForTagMeta(tag).label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black tracking-[0.14em] text-emerald-700">
              NEXT OUTING
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              {recommendations.length === 3
                ? "この記録から、次に合いそうな3件"
                : "この記録から、次に合いそうな施設"}
            </h2>
            {recommendations.length > 0 ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {recommendations.map((facility) => {
                  const reasonTag = facility.matchingTags.find((tag) =>
                    selectedTags.includes(tag),
                  );
                  return (
                    <li key={facility.slug}>
                      <Link
                        href={`/facilities/${facility.slug}`}
                        className="group flex items-center justify-between gap-3 py-3"
                      >
                        <span className="min-w-0">
                          <span className="block font-bold text-slate-900 group-hover:text-emerald-700">
                            {facility.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {facility.prefecture}・{facility.category}
                            {reasonTag
                              ? ` / ${getRecommendedForTagMeta(reasonTag).label}につながる施設`
                              : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-emerald-600" aria-hidden>
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                選んだ内容と結びつく施設が見つからなかったため、無関係な候補は表示していません。
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-slate-950 p-5 text-center text-white shadow-lg">
            <h2 className="text-lg font-black">このカードを保存する</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              写真以外の入力は、このタブで登録・ログイン後の保存画面へ引き継ぎます。
            </p>
            <Link
              href={registerHref}
              className="mt-4 block w-full rounded-full bg-amber-400 px-5 py-3.5 text-sm font-black text-slate-950"
            >
              このカードを保存するために登録
            </Link>
            <Link
              href={loginHref}
              className="mt-3 inline-block text-sm font-bold text-white underline decoration-white/40 underline-offset-4"
            >
              アカウントをお持ちの方はログイン
            </Link>
          </section>

          <button
            type="button"
            onClick={onClose}
            className="pb-3 text-sm font-bold text-slate-500 underline underline-offset-4"
          >
            施設ページへ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 z-[80] overflow-y-auto bg-[#fffaf3] px-4 py-6 text-slate-950"
      aria-labelledby="guest-memory-heading"
    >
      <form
        className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (canComplete) completeRecord();
        }}
      >
        <div className="relative text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="記録体験を閉じる"
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-slate-500 shadow-sm"
          >
            ×
          </button>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">
            ONE FAMILY MEMORY
          </p>
          <h1 id="guest-memory-heading" className="mt-1 text-2xl font-black">
            この場所での思い出を残そう
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            登録不要。写真はこの画面だけで使い、保存・送信しません。
          </p>
        </div>

        <div>
          <input
            id="guest-memory-photos"
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
              const nextUrls = Array.from(event.target.files ?? [])
                .slice(0, 3)
                .map((file) => URL.createObjectURL(file));
              photoUrlsRef.current = nextUrls;
              setPhotoUrls(nextUrls);
            }}
          />
          <label
            htmlFor="guest-memory-photos"
            className="flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-amber-300 bg-white text-center shadow-sm transition-colors hover:border-amber-500"
          >
            {photoUrls.length > 0 ? (
              <div className={`grid h-56 w-full gap-0.5 ${
                photoUrls.length === 1
                  ? "grid-cols-1"
                  : photoUrls.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}>
                {photoUrls.map((url, index) => (
                  // Guest photos remain local object URLs and are never uploaded.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt={`選んだ写真 ${index + 1}`}
                    className="h-full min-w-0 object-cover"
                  />
                ))}
              </div>
            ) : (
              <span>
                <span className="block text-5xl" aria-hidden>📷</span>
                <span className="mt-3 block text-base font-black">写真を選ぶ（任意・3枚まで）</span>
                <span className="mt-1 block text-xs text-slate-400">
                  ネットワークにも端末内にも保存しません
                </span>
              </span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <label className="space-y-1 text-xs font-bold text-slate-500">
            訪問日
            <input
              type="date"
              value={visitedOn}
              onChange={(event) => setVisitedOn(event.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-slate-500">
            場所
            <input
              type="text"
              value={facilityName}
              readOnly
              className="block w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-950"
            />
          </label>
        </div>

        <label className="space-y-1 text-xs font-bold text-slate-500">
          今日のひとこと
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="いちばん残したい瞬間は？"
            maxLength={240}
            required
            rows={3}
            className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-relaxed text-slate-950"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-black text-slate-800">
            何を楽しんでいた？
          </legend>
          <p className="text-xs text-slate-500">
            この記録に合うものを1つ以上選んでください。
          </p>
          <div className="flex flex-wrap gap-2">
            {interestTags.map((tag) => {
              const selected = selectedTags.includes(tag);
              const meta = getRecommendedForTagMeta(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedTags((current) =>
                      selected
                        ? current.filter((item) => item !== tag)
                        : [...current, tag],
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                    selected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <ChoiceButtons
          legend="また行きたいか"
          options={revisitOptions}
          value={familyRevisit}
          onChange={setFamilyRevisit}
        />
        <ChoiceButtons
          legend="親の疲れ度"
          options={fatigueOptions}
          value={parentFatigue}
          onChange={setParentFatigue}
        />

        <button
          type="submit"
          disabled={!canComplete}
          className="rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          この日の思い出をつくる
        </button>
      </form>
    </main>
  );
}

function ChoiceButtons<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-black text-slate-800">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
              value === option.value
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
