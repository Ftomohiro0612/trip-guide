export default function Loading() {
  return (
    <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-6xl place-items-center px-4 py-20">
      <div className="text-center">
        <div
          className="inline-block w-10 h-10 border-4 border-sky-200 border-t-brand rounded-full animate-spin mb-4"
          aria-hidden
        />
        <p className="text-sm text-slate-500">読み込み中…</p>
      </div>
    </div>
  );
}
