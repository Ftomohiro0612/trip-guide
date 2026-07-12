"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readVisitEdit } from "@/lib/visit-flow-session";

export default function PhotoDraftsCompletePage() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const context = readVisitEdit();
    queueMicrotask(() => setCount(context?.batchIds?.length ?? (context ? 1 : 0)));
  }, []);

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <span className="text-5xl" aria-hidden="true">📷</span>
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {count === null ? "下書きを確認しています" : `${count}件の下書きができました`}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          まだ家族のおでかけ回数には加わっていません。内容を確認して公開すると、記録が完成します。
        </p>
      </div>
      <div className="w-full space-y-3">
        {Boolean(count) && (
          <Link href="/mypage/visits/edit" className="block w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
            下書きを仕上げる
          </Link>
        )}
        <Link href="/mypage/visits" className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
          おでかけ履歴を見る
        </Link>
      </div>
    </main>
  );
}
