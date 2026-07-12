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

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-12 text-center">
      <VisitCompletionViewEvent visitId={context.visitId} entryMethod={context.entryMethod} />
      <span className="text-5xl" aria-hidden="true">🎉</span>
      <div>
        <h1 className="text-xl font-bold text-slate-900">記録しました！</h1>
        <p className="mt-1 text-lg font-bold text-brand">これで家族{data.familyTotal}回目のおでかけです</p>
        <p className="mt-1 text-sm text-slate-500">
          {data.hasCoordinates ? "🗺️ 行った場所マップにピンが増えました" : "おでかけの記録が増えました"}
        </p>
      </div>

      {data.children.length === 0 ? (
        <div className="w-full rounded-xl bg-amber-50 px-4 py-3 text-left text-sm leading-relaxed text-amber-900">
          子どもを登録・紐付けすると、「好き」のヒントも少しずつ見えてきます。登録しなくても、おでかけ記録はそのまま使えます。
        </div>
      ) : (
        <div className="w-full rounded-xl bg-emerald-50 px-4 py-4">
          {data.primaryCopy && <p className="font-bold text-emerald-950">{data.primaryCopy.progress}</p>}
          {data.primaryCopy?.hint && <p className="mt-1 text-sm leading-relaxed text-emerald-800">{data.primaryCopy.hint}</p>}
          {data.children.length > 1 && (
            <>
              <p className="mt-2 text-sm text-emerald-800">{data.children.length}人とも記録が増えました</p>
              <p className="mt-1 text-xs text-emerald-700">
                {data.children.map((child) => `${child.nickname} ${child.visitCount}件`).join("・")}
              </p>
            </>
          )}
          {data.primaryCopy?.showLikesLink && (
            <Link href={`/mypage#child-likes-${data.displayChildSlot ?? 1}`} className="mt-3 inline-flex rounded-lg px-2 py-1 text-sm font-bold text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              「好き」のヒントを見る
            </Link>
          )}
        </div>
      )}

      <div className="w-full space-y-3">
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
        <Link href={visitsHref} className="block w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          {data.hasCoordinates ? "マップと履歴を見る" : "おでかけ履歴を見る"}
        </Link>
        {context.returnFacility && (
          <Link href={`/facilities/${context.returnFacility}`} className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            施設ページへ戻る
          </Link>
        )}
      </div>
    </main>
  );
}
