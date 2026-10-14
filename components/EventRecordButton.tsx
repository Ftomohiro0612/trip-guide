"use client";

import { useEventIntentActions } from "@/components/useEventIntentActions";

export default function EventRecordButton({
  eventId,
  appearance = "default",
}: {
  eventId: string;
  appearance?: "default" | "quiet";
}) {
  const { handleRecordEvent, loading, isGuest } = useEventIntentActions(eventId);
  const isQuiet = appearance === "quiet";

  return (
    <button
      type="button"
      onClick={handleRecordEvent}
      disabled={loading}
      className={
        isQuiet
          ? "inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:cursor-wait disabled:opacity-50"
          : "inline-flex shrink-0 items-center justify-center rounded-md border border-brand bg-white px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/5 disabled:cursor-wait disabled:opacity-50"
      }
    >
      {isQuiet || !isGuest
        ? "このイベントを記録"
        : "このイベントを記録（無料登録・ログインが必要）"}
    </button>
  );
}
