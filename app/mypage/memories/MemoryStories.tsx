"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type MemoryStory = {
  id: string;
  facilityName: string;
  visitedOn: string;
  photoUrls: string[];
  note: string | null;
  revisit: string | null;
  childLines: string[];
  tags: string[];
  detailHref: string;
  memoryLabel: string | null;
};

function StoryPhotos({
  story,
  priority,
}: {
  story: MemoryStory;
  priority: boolean;
}) {
  const photoUrls = story.photoUrls.slice(0, 3);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  if (story.photoUrls.length === 0) {
    return (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#fed7aa_0%,transparent_32%),radial-gradient(circle_at_80%_30%,#bae6fd_0%,transparent_30%),linear-gradient(145deg,#0f172a_0%,#334155_48%,#14532d_100%)]">
        <div className="flex h-full items-center justify-center pb-36">
          <span className="text-7xl drop-shadow-lg" aria-hidden="true">
            ✨
          </span>
        </div>
      </div>
    );
  }

  if (story.photoUrls.length === 1) {
    return (
      <div className="absolute inset-0 grid grid-cols-1 gap-0.5 bg-black">
        {/* Signed private photo URLs and review-only sample paths both work without
            introducing a new image host or changing the existing photo pipeline. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrls[0]}
          alt={`${story.facilityName}の家族の思い出 1`}
          className="h-full w-full object-cover"
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black">
      {/* Signed private photo URLs and review-only sample paths both work without
          introducing a new image host or changing the existing photo pipeline. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrls[activePhotoIndex]}
        alt={`${story.facilityName}の家族の思い出 ${activePhotoIndex + 1}`}
        className="h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
      />

      <div
        className="absolute right-5 bottom-[calc(32%+0.75rem)] z-20 flex max-w-[calc(100%-2.5rem)] justify-end gap-2 touch-pan-y"
        role="group"
        aria-label={`${story.facilityName}の写真を選ぶ`}
      >
        {photoUrls.map((photoUrl, photoIndex) => (
          <button
            key={`${story.id}-${photoIndex}`}
            type="button"
            onClick={() => setActivePhotoIndex(photoIndex)}
            className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/40 shadow-lg transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              photoIndex === activePhotoIndex
                ? "scale-105 ring-2 ring-white"
                : "ring-1 ring-white/70"
            }`}
            aria-label={`${photoIndex + 1}枚目の写真を表示`}
            aria-pressed={photoIndex === activePhotoIndex}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function reactionCopy(lines: string[]): string | null {
  if (lines.length === 0) return null;
  const parsed = lines.map((line) => {
    const [name, reaction] = line.split("：");
    return { name, reaction };
  });
  const names = parsed.map(({ name }) => name).join("も");
  if (parsed.every(({ reaction }) => reaction === "大満足")) {
    return `${names}も、ずっと笑顔だった一日。`;
  }
  if (parsed.every(({ reaction }) => reaction === "楽しんだ")) {
    return `${names}も、夢中で遊んだ一日。`;
  }
  const phrases = parsed.map(({ name, reaction }, index) => {
    const subject = `${name}${index === 0 ? "は" : "も"}`;
    if (reaction === "大満足") return `${subject}ずっと笑顔`;
    if (reaction === "楽しんだ") return `${subject}夢中で楽しんだ`;
    if (reaction === "普通") return `${subject}のんびり過ごした`;
    if (reaction === "合わなかった") return `${subject}には少し合わなかった`;
    if (reaction === "参加できず") return `${subject}次のお楽しみ`;
    return `${subject}${reaction}`;
  });
  return `${phrases.join("、")}。`;
}

function revisitCopy(value: string | null): string | null {
  if (value === "また行きたい") return "また、みんなで来たい場所。";
  if (value === "条件次第") return "次は季節や時間を変えて、もう一度。";
  if (value === "一度で十分") return "一度きりでも、ちゃんと残したい一日。";
  if (value === "もう行かない") return "ここで過ごしたことは、思い出として残る。";
  return value;
}

export default function MemoryStories({
  stories,
  focusId,
  demo = false,
}: {
  stories: MemoryStory[];
  focusId?: string;
  demo?: boolean;
  standalone?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const storyRefs = useRef(new Map<string, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!focusId) return;
    storyRefs.current.get(focusId)?.scrollIntoView({ block: "start" });
  }, [focusId]);

  if (stories.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl" aria-hidden="true">
          📷
        </span>
        <h1 className="mt-5 text-xl font-bold text-slate-900">最初の思い出を残そう</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          写真とひとことがあれば、家族の1日が1枚のストーリーになります。
        </p>
        <Link
          href="/mypage/visits/new"
          className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white"
        >
          1件記録する
        </Link>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 z-[60] h-[100dvh] bg-slate-950 text-white"
    >
      <div className="relative mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-black shadow-2xl">
        <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-2">
          <Link
            href="/mypage/visits"
            className="rounded-full bg-black/25 px-3 py-1.5 text-sm font-bold text-white/90 backdrop-blur-sm hover:text-white"
          >
            ← 思い出を閉じる
          </Link>
          <div className="text-center">
            {demo && <p className="text-[10px] text-amber-200">体験確認用サンプル</p>}
          </div>
          <span className="min-w-12 rounded-full bg-black/25 px-2 py-1 text-right text-xs tabular-nums text-white/80 backdrop-blur-sm">
            {activeIndex + 1} / {stories.length}
          </span>
        </header>

        <div
          ref={scrollerRef}
          onScroll={(event) => {
            const scroller = event.currentTarget;
            if (scroller.clientHeight === 0) return;
            const nextIndex = Math.min(
              stories.length - 1,
              Math.max(0, Math.round(scroller.scrollTop / scroller.clientHeight)),
            );
            setActiveIndex(nextIndex);
          }}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="家族の思い出ストーリー"
        >
          {stories.map((story, index) => (
            <article
              key={story.id}
              ref={(element) => {
                if (element) storyRefs.current.set(story.id, element);
                else storyRefs.current.delete(story.id);
              }}
              data-story-index={index}
              className="relative h-full min-h-full snap-start snap-always overflow-hidden bg-slate-900"
              aria-label={`${story.visitedOn} ${story.facilityName}`}
            >
              <StoryPhotos story={story} priority={index === 0} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/5 to-black/90" />

              <div className="absolute left-4 top-20 flex items-center gap-2">
                <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold tracking-wide backdrop-blur-sm">
                  {story.visitedOn}
                </span>
                {story.memoryLabel && (
                  <span className="rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-amber-950 shadow">
                    {story.memoryLabel}
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 max-h-[68%] space-y-3 overflow-y-auto overscroll-contain px-5 pb-[max(4rem,env(safe-area-inset-bottom))] pt-5">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-white/70">
                    OUR FAMILY MEMORY
                  </p>
                  <h2 className="mt-1 text-[clamp(1.25rem,5.5vw,1.875rem)] font-black leading-tight [overflow-wrap:anywhere] drop-shadow-md">
                    {story.facilityName}
                  </h2>
                </div>

                {story.note && (
                  <blockquote className="border-l-2 border-amber-300 pl-3 text-[clamp(0.875rem,3.5vw,1rem)] font-medium leading-relaxed text-white [overflow-wrap:anywhere] drop-shadow">
                    「{story.note}」
                  </blockquote>
                )}

                {reactionCopy(story.childLines) && (
                  <p className="text-sm font-bold leading-relaxed text-white/90">
                    {reactionCopy(story.childLines)}
                  </p>
                )}
                {revisitCopy(story.revisit) && (
                  <p className="text-sm font-black leading-relaxed text-amber-200">
                    ♡ {revisitCopy(story.revisit)}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href={story.detailHref}
                    className="text-xs font-bold text-white/70 underline underline-offset-4"
                  >
                    記録の詳細
                  </Link>
                  {index < stories.length - 1 ? (
                    <span className="flex flex-col items-center text-xs font-bold text-white/80">
                      <span className="animate-bounce text-lg leading-none" aria-hidden="true">⌃</span>
                      上へスワイプ
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Link
                        href="/events"
                        className="rounded-full bg-white/20 px-3 py-2 text-xs font-black text-white backdrop-blur"
                      >
                        次のおでかけを探す
                      </Link>
                      <Link
                        href="/mypage/visits/new"
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-900"
                      >
                        もう1件残す
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div
          className="pointer-events-none absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2"
          aria-hidden="true"
        >
          {stories.map((story, index) => (
            <span
              key={story.id}
              className={`w-1 rounded-full transition-all ${
                index === activeIndex ? "h-8 bg-white" : "h-3 bg-white/35"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
