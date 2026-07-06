"use client";

import Link from "next/link";
import { useState } from "react";

export default function ChildRegistrationNudge() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-relaxed text-slate-700">
          子どもを登録すると、あとで好みの傾向が見えやすくなります
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/mypage/children"
            className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
          >
            子どもを追加する →
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            今は登録せずに記録する
          </button>
        </div>
      </div>
    </div>
  );
}
