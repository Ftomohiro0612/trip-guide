"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  TrackedAnotherVisitLink,
  VisitCompletionViewEvent,
} from "@/components/VisitCompletionAnalytics";
import {
  readVisitCompletion,
  storeVisitEdit,
  storeVisitPresetChildren,
  type VisitCompletionSession,
} from "@/lib/visit-flow-session";
import { loadVisitCompletion } from "./actions";

type LoadedCompletion = Extract<
  Awaited<ReturnType<typeof loadVisitCompletion>>,
  { status: "ok" }
>;

export default function VisitCompletePage() {
  const router = useRouter();
  const [context, setContext] = useState<VisitCompletionSession | null>(null);
  const [data, setData] = useState<LoadedCompletion | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stored = readVisitCompletion();
    if (!stored) {
      queueMicrotask(() => setFailed(true));
      return;
    }
    queueMicrotask(() => setContext(stored));
    loadVisitCompletion(stored.visitId, stored.batchIds ?? []).then((result) => {
      if (result.status === "unauthenticated") {
        router.replace(`/auth/login?redirectTo=${encodeURIComponent("/mypage/visits/complete")}`);
      } else if (result.status === "ok") {
        setData(result);
      } else {
        setFailed(true);
      }
    });
  }, [router]);

  if (failed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-slate-600">完了した記録を確認できませんでした。</p>
        <Link href="/mypage/visits" className="mt-6 inline-flex font-bold text-brand underline">
          おでかけ履歴を見る
        </Link>
      </main>
    );
  }
  if (!context || !data) {
    return <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">記録を確認しています...</main>;
  }

  const visitsHref = data.children.length === 0 ? "/mypage/visits?no_child=1" : "/mypage/visits";
  const nextDraftId = data.remainingDraftIds[0];
  const memory = data.memoryPreview;

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-6 text-center">
      <VisitCompletionViewEvent visitId={context.visitId} entryMethod={context.entryMethod} />
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-amber-600">MEMORY COMPLETE</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">思い出が1枚できました</h1>
        <p className="mt-1 text-sm text-slate-500">入力した瞬間から、家族で見返せます。</p>
      </div>

      <section className="relative aspect-[9/14] max-h-[68dvh] w-full overflow-hidden rounded-[2rem] bg-slate-900 text-left text-white shadow-2xl">
        {memory.photoUrls.length > 0 ? (
          <div
            className={`absolute inset-0 grid gap-0.5 bg-black ${
              memory.photoUrls.length === 1
                ? "grid-cols-1"
                : memory.photoUrls.length === 2
                  ? "grid-cols-[2fr_1fr]"
                  : "grid-cols-[2fr_1fr] grid-rows-2"
            }`}
          >
            {memory.photoUrls.slice(0, 3).map((photoUrl, photoIndex) => (
              // Signed private photo URLs use the existing photo delivery path.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photoUrl}
                src={photoUrl}
                alt={`${memory.facilityName}の思い出 ${photoIndex + 1}`}
                className={`h-full w-full object-cover ${
                  memory.photoUrls.length === 3 && photoIndex === 0 ? "row-span-2" : ""
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,#fed7aa_0%,transparent_32%),radial-gradient(circle_at_80%_30%,#bae6fd_0%,transparent_30%),linear-gradient(145deg,#0f172a_0%,#334155_48%,#14532d_100%)]">
            <div className="flex h-full items-center justify-center pb-32 text-7xl" aria-hidden="true">
              ✨
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/90" />
        <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
          {memory.visitedOn}
        </div>
        <div className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-6 pt-24">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-white/65">OUR FAMILY MEMORY</p>
            <h2 className="mt-1 text-2xl font-black leading-tight drop-shadow">
              {memory.facilityName}
            </h2>
          </div>
          {memory.note && (
            <blockquote className="border-l-2 border-amber-300 pl-3 text-base font-medium leading-relaxed drop-shadow">
              「{memory.note}」
            </blockquote>
          )}
          {memory.revisit && (
            <span className="inline-flex rounded-full bg-emerald-400/90 px-3 py-1.5 text-xs font-black text-emerald-950">
              また行きたい：{memory.revisit}
            </span>
          )}
        </div>
      </section>

      <div className="w-full space-y-3">
        <Link
          href={`/mypage/memories?focus=${encodeURIComponent(context.visitId)}`}
          className="block w-full rounded-xl bg-slate-950 py-3.5 text-sm font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          家族の思い出を縦送りで見る
        </Link>
        {nextDraftId ? (
          <Link
            href="/mypage/visits/edit"
            onClick={() => storeVisitEdit({ visitId: nextDraftId, batchIds: data.remainingDraftIds })}
            className="block w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            次の下書きを仕上げる（残り{data.remainingDraftIds.length}件）
          </Link>
        ) : (
          <TrackedAnotherVisitLink
            href="/mypage/visits/new"
            visitId={context.visitId}
            entryMethod={context.entryMethod}
            onNavigate={() => storeVisitPresetChildren(data.children.map((child) => child.id))}
            className="block w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            もう1件記録する
          </TrackedAnotherVisitLink>
        )}
        <Link href={visitsHref} className="block w-full py-2 text-sm font-bold text-slate-500 underline underline-offset-4">
          地図・件数・記録データを見る
        </Link>
        {context.returnFacility && (
          <Link href={`/facilities/${context.returnFacility}`} className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            施設ページへ戻る
          </Link>
        )}
      </div>

      <details className="w-full rounded-xl bg-slate-50 px-4 py-3 text-left text-sm text-slate-600">
        <summary className="cursor-pointer font-bold">今回の記録データ</summary>
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
          <p>これで家族{data.familyTotal}回目のおでかけです。</p>
          {data.primaryCopy && <p>{data.primaryCopy.progress}</p>}
          {data.primaryCopy?.hint && <p className="text-xs leading-relaxed">{data.primaryCopy.hint}</p>}
        </div>
      </details>
    </main>
  );
}
