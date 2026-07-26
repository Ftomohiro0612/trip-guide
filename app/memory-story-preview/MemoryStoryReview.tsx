"use client";

import { useEffect, useRef, useState } from "react";
import MemoryStories, {
  type MemoryStory,
} from "@/app/mypage/memories/MemoryStories";

function displayDate(value: string): string {
  if (!value) return "今日";
  const [year, month, day] = value.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

function PhotoComposition({
  story,
}: {
  story: MemoryStory;
}) {
  return (
    <div
      className={`absolute inset-0 grid gap-0.5 bg-black ${
        story.photoUrls.length === 1
          ? "grid-cols-1"
          : story.photoUrls.length === 2
            ? "grid-rows-2"
            : "grid-cols-2 grid-rows-[2fr_1fr]"
      }`}
    >
      {story.photoUrls.slice(0, 3).map((photoUrl, index) => (
        // Owner review photos remain local object URLs and are never uploaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={photoUrl}
          src={photoUrl}
          alt={`${story.facilityName}の思い出 ${index + 1}`}
          className={`h-full w-full object-cover ${
            story.photoUrls.length === 3 && index === 0 ? "col-span-2" : ""
          }`}
        />
      ))}
    </div>
  );
}

export default function MemoryStoryReview({
  stories,
}: {
  stories: MemoryStory[];
}) {
  const photoUrlsRef = useRef<string[]>([]);
  const [step, setStep] = useState<"record" | "complete" | "feed">("record");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [visitedOn, setVisitedOn] = useState("2026-07-26");
  const [facilityName, setFacilityName] = useState("");
  const [note, setNote] = useState("");
  const [revisit, setRevisit] = useState(true);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const memory: MemoryStory = {
    ...stories[0],
    id: "owner-family-memory",
    facilityName: facilityName.trim() || "家族で出かけた場所",
    visitedOn: displayDate(visitedOn),
    photoUrls,
    note: note.trim() || null,
    revisit: revisit ? "また行きたい" : null,
    childLines: [],
    tags: [],
    detailHref: "/memory-story-preview",
    memoryLabel: "たった今",
  };

  if (step === "feed") {
    return (
      <MemoryStories
        stories={[memory, ...stories.slice(1)]}
        focusId={memory.id}
        standalone
      />
    );
  }

  if (step === "complete") {
    return (
      <main className="fixed inset-0 z-[60] overflow-y-auto bg-[#fffaf3] px-4 py-5 text-slate-950">
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 text-center">
          <div>
            <p className="text-xs font-black tracking-[0.18em] text-amber-600">
              MEMORY COMPLETE
            </p>
            <h1 className="mt-1 text-2xl font-black">思い出が1枚できました</h1>
            <p className="mt-1 text-sm text-slate-500">
              入力した瞬間から、家族で見返せます。
            </p>
          </div>

          <section className="relative aspect-[9/14] max-h-[68dvh] w-full overflow-hidden rounded-[2rem] bg-slate-900 text-left text-white shadow-2xl">
            <PhotoComposition story={memory} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/90" />
            <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
              {memory.visitedOn}
            </div>
            <div className="absolute inset-x-0 bottom-0 max-h-[68%] space-y-3 overflow-y-auto px-5 pb-6 pt-5">
              <p className="text-xs font-bold tracking-[0.16em] text-white/65">
                OUR FAMILY MEMORY
              </p>
              <h2 className="text-[clamp(1.25rem,5.5vw,1.875rem)] font-black leading-tight [overflow-wrap:anywhere]">
                {memory.facilityName}
              </h2>
              {memory.note && (
                <blockquote className="border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed [overflow-wrap:anywhere]">
                  「{memory.note}」
                </blockquote>
              )}
              {memory.revisit && (
                <p className="text-sm font-black text-amber-200">
                  ♡ また、みんなで来たい場所。
                </p>
              )}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setStep("feed")}
            className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            できた思い出を見る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[60] overflow-y-auto bg-[#fffaf3] px-4 py-7 text-slate-950">
      <form
        className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setStep("complete");
        }}
      >
        <div className="text-center">
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">
            ONE FAMILY MEMORY
          </p>
          <h1 className="mt-1 text-2xl font-black">今日のおでかけを残そう</h1>
          <p className="mt-2 text-sm text-slate-500">
            写真とひとことだけで、家族の1枚になります。
          </p>
        </div>

        <div>
          <input
            id="owner-family-photos"
            type="file"
            accept="image/*"
            multiple
            required
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
            htmlFor="owner-family-photos"
            className="flex min-h-52 cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-amber-300 bg-white text-center shadow-sm transition-colors hover:border-amber-500"
          >
            {photoUrls.length > 0 ? (
              <div className={`grid h-60 w-full gap-0.5 ${
                photoUrls.length === 1
                  ? "grid-cols-1"
                  : photoUrls.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-3"
              }`}>
                {photoUrls.map((url, index) => (
                  // Local owner-review previews are never uploaded.
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
                <span className="block text-5xl" aria-hidden="true">📷</span>
                <span className="mt-3 block text-base font-black">写真を1〜3枚選ぶ</span>
                <span className="mt-1 block text-xs text-slate-400">
                  この画面内だけで使い、保存・送信しません
                </span>
              </span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <label className="space-y-1 text-xs font-bold text-slate-500">
            日付
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
              onChange={(event) => setFacilityName(event.target.value)}
              placeholder="どこへ行った？"
              maxLength={100}
              required
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
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

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-sm">
          <input
            type="checkbox"
            checked={revisit}
            onChange={(event) => setRevisit(event.target.checked)}
            className="h-5 w-5 accent-amber-500"
          />
          また、みんなで来たい
        </label>

        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          この日の思い出をつくる
        </button>
      </form>
    </main>
  );
}
