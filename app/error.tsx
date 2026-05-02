"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.error("App error:", error);
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-7xl mb-4" aria-hidden>
        🌧️
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
        ページの読み込みでエラーが発生しました
      </h1>
      <p className="text-slate-600 mb-2">
        一時的な問題かもしれません。もう一度試すか、ホームに戻ってみてください。
      </p>
      {error.digest && (
        <p className="text-xs text-slate-400 font-mono mb-6">
          ref: {error.digest}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-brand hover:bg-brand-dark text-white font-bold px-5 py-2.5 rounded-full text-sm"
        >
          もう一度読み込む
        </button>
        <Link
          href="/"
          className="bg-white border border-slate-200 hover:border-brand text-slate-700 font-bold px-5 py-2.5 rounded-full text-sm"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
