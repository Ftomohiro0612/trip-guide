"use client";

import { useEventIntentActions } from "@/components/useEventIntentActions";

export default function EventRecordButton({ eventId }: { eventId: string }) {
  const { handleRecordEvent, loading, isGuest } = useEventIntentActions(eventId);

  return (
    <button
      type="button"
      onClick={handleRecordEvent}
      disabled={loading}
      className="inline-flex shrink-0 items-center justify-center rounded-md border border-brand bg-white px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/5 disabled:cursor-wait disabled:opacity-50"
    >
      {isGuest ? "このイベントを記録（無料登録・ログインが必要）" : "このイベントを記録"}
    </button>
  );
}
