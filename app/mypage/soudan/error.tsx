"use client";

import Link from "next/link";

export default function SoudanError({ reset }: { reset: () => void }) {
  return <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"><p role="alert" className="text-sm">相談を読み込めませんでした。時間をおいてお試しください。</p><button type="button" onClick={reset} className="rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white">もう一度読み込む</button><Link href="/mypage/soudan" className="block text-sm text-brand underline">相談一覧へ</Link></div>;
}
