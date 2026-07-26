"use client";

import { useState } from "react";
import MemoryStories, {
  type MemoryStory,
} from "@/app/mypage/memories/MemoryStories";

export default function MemoryStoryReview({
  stories,
}: {
  stories: MemoryStory[];
}) {
  const [showFeed, setShowFeed] = useState(false);
  const memory = stories[0];

  if (showFeed) {
    return <MemoryStories stories={stories} demo standalone />;
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-[6.5rem] z-20 overflow-y-auto bg-[#fffaf3] px-4 py-5 text-slate-950 sm:static sm:min-h-[calc(100dvh-3.5rem)]">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">
            SAVE → REWARD / 0 SEC
          </p>
          <h1 className="mt-1 text-2xl font-black">思い出が1枚できました</h1>
          <p className="mt-1 text-sm text-slate-500">
            入力した瞬間から、家族で見返せます。
          </p>
        </div>

        <section className="relative aspect-[9/13] max-h-[64dvh] w-full overflow-hidden rounded-[2rem] bg-slate-900 text-left text-white shadow-2xl">
          <div className="absolute inset-0 grid grid-cols-[2fr_1fr] grid-rows-2 gap-0.5 bg-black">
            {memory.photoUrls.slice(0, 3).map((photoUrl, index) => (
              // Review imagery uses repository-owned sample assets.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photoUrl}
                src={photoUrl}
                alt={`${memory.facilityName}の思い出 ${index + 1}`}
                className={`h-full w-full object-cover ${index === 0 ? "row-span-2" : ""}`}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/90" />
          <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
            {memory.visitedOn}
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-5 pt-24">
            <p className="text-xs font-bold tracking-[0.16em] text-white/65">
              OUR FAMILY MEMORY
            </p>
            <h2 className="text-2xl font-black leading-tight">{memory.facilityName}</h2>
            {memory.note && (
              <blockquote className="border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed">
                「{memory.note}」
              </blockquote>
            )}
            <div className="flex flex-wrap gap-2">
              {memory.childLines.map((line) => (
                <span
                  key={line}
                  className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur"
                >
                  {line}
                </span>
              ))}
              {memory.revisit && (
                <span className="rounded-full bg-emerald-400 px-3 py-1.5 text-xs font-black text-emerald-950">
                  また行きたい：{memory.revisit}
                </span>
              )}
            </div>
          </div>
        </section>

        <p className="text-xs font-bold text-slate-500">
          入力したもの：写真3枚・日付・場所・短い一言・また行きたい
        </p>
        <button
          type="button"
          onClick={() => setShowFeed(true)}
          className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          家族の思い出を縦送りで見る
        </button>
        <p className="pb-5 text-xs text-slate-400">
          地図・件数・グラフは、この体験の後に補助情報として残します。
        </p>
      </div>
    </main>
  );
}
