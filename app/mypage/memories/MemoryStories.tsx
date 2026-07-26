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

  return (
    <div
      className={`absolute inset-0 grid gap-0.5 bg-black ${
        story.photoUrls.length === 1
          ? "grid-cols-1"
          : story.photoUrls.length === 2
            ? "grid-cols-[2fr_1fr]"
            : "grid-cols-[2fr_1fr] grid-rows-2"
      }`}
    >
      {story.photoUrls.slice(0, 3).map((photoUrl, photoIndex) => (
        // Signed private photo URLs and review-only sample paths both work without
        // introducing a new image host or changing the existing photo pipeline.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${story.id}-${photoIndex}`}
          src={photoUrl}
          alt={`${story.facilityName}の家族の思い出 ${photoIndex + 1}`}
          className={`h-full w-full object-cover ${
            story.photoUrls.length === 3 && photoIndex === 0 ? "row-span-2" : ""
          }`}
          loading={priority && photoIndex === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}

export default function MemoryStories({
  stories,
  focusId,
  demo = false,
  standalone = false,
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
      className={`fixed inset-x-0 top-[6.5rem] z-20 bg-slate-950 text-white sm:static ${
        standalone ? "bottom-0" : "bottom-14"
      }`}
    >
      <div className="mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-black shadow-2xl sm:h-[calc(100dvh-3.5rem)]">
        <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-black/95 px-4">
          <Link
            href="/mypage/visits"
            className="rounded-full px-2 py-1 text-sm font-bold text-white/80 hover:text-white"
          >
            ← 履歴
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold tracking-wide">家族の思い出</p>
            {demo && <p className="text-[10px] text-amber-200">体験確認用サンプル</p>}
          </div>
          <span className="min-w-12 text-right text-xs tabular-nums text-white/60">
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
          className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth"
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

              <div className="absolute left-0 right-0 top-0 flex gap-1 px-3 pt-3" aria-hidden="true">
                {stories.map((item, itemIndex) => (
                  <span
                    key={item.id}
                    className={`h-0.5 flex-1 rounded-full ${
                      itemIndex <= activeIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>

              <div className="absolute left-4 top-8 flex items-center gap-2">
                <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold tracking-wide backdrop-blur-sm">
                  {story.visitedOn}
                </span>
                {story.memoryLabel && (
                  <span className="rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-amber-950 shadow">
                    {story.memoryLabel}
                  </span>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-8 pt-28">
                <div>
                  <p className="text-xs font-bold tracking-[0.18em] text-white/70">
                    OUR FAMILY MEMORY
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-tight drop-shadow-md">
                    {story.facilityName}
                  </h2>
                </div>

                {story.note && (
                  <blockquote className="border-l-2 border-amber-300 pl-3 text-base font-medium leading-relaxed text-white drop-shadow">
                    「{story.note}」
                  </blockquote>
                )}

                {(story.childLines.length > 0 || story.revisit) && (
                  <div className="flex flex-wrap gap-2">
                    {story.childLines.map((line) => (
                      <span
                        key={line}
                        className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-bold backdrop-blur-md"
                      >
                        {line}
                      </span>
                    ))}
                    {story.revisit && (
                      <span className="rounded-full bg-emerald-400/90 px-3 py-1.5 text-xs font-black text-emerald-950">
                        また行きたい：{story.revisit}
                      </span>
                    )}
                  </div>
                )}

                {story.tags.length > 0 && (
                  <p className="text-xs font-medium text-white/75">
                    {story.tags.map((tag) => `#${tag}`).join("  ")}
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
                    <span className="animate-pulse text-xs font-bold text-white/75">
                      上に送って次の思い出へ ↑
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
      </div>
    </main>
  );
}
