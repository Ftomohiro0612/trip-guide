"use client";

import { useEventIntentActions } from "@/components/useEventIntentActions";

export default function EventRecordButton({ eventId }: { eventId: string }) {
  const { handleRecordEvent, loading } = useEventIntentActions(eventId);

  return (
    <button
      type="button"
      onClick={handleRecordEvent}
      disabled={loading}
      className="inline-flex shrink-0 items-center justify-center rounded-md border border-brand bg-white px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/5 disabled:cursor-wait disabled:opacity-50"
    >
      このイベントを記録
    </button>
  );
}
