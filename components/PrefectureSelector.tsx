"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { PrefectureId } from "@/types/facility";

type PrefectureOption = {
  id: PrefectureId;
  name: string;
  count: number;
};

interface Props {
  prefectures: PrefectureOption[];
  selectedId: PrefectureId | null;
  disableEmpty?: boolean;
}

const QUICK_PREFECTURE_IDS: PrefectureId[] = [
  "tokyo",
  "kanagawa",
  "chiba",
  "saitama",
];

export default function PrefectureSelector({
  prefectures,
  selectedId,
  disableEmpty = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const selected = prefectures.find((prefecture) => prefecture.id === selectedId);
  const quickOptions = QUICK_PREFECTURE_IDS.map((id) =>
    prefectures.find((prefecture) => prefecture.id === id),
  ).filter((prefecture): prefecture is PrefectureOption => Boolean(prefecture));
  const selectedIsQuick = quickOptions.some(
    (prefecture) => prefecture.id === selectedId,
  );

  useEffect(() => {
    try {
      for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
        const key = window.sessionStorage.key(index);
        if (
          key?.startsWith("mapview:facilities:") ||
          key?.startsWith("mapview:tag:")
        ) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch {
      // URL remains the source of truth even when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function isDisabled(prefecture: PrefectureOption) {
    return disableEmpty && prefecture.count === 0;
  }

  function selectPrefecture(nextId: PrefectureId | null) {
    const params = new URLSearchParams(searchParams);

    // The primary selector owns a single prefecture. Selecting 全国 also clears
    // detailed multi-prefecture state while preserving every non-area filter.
    params.delete("prefectures");
    if (nextId) params.set("prefecture", nextId);
    else params.delete("prefecture");

    setOpen(false);
    startTransition(() => {
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function optionClass(active: boolean) {
    return `shrink-0 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
      active
        ? "border-sky-600 bg-sky-600 text-white"
        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
    }`;
  }

  return (
    <section aria-label="都道府県を選ぶ" className="mt-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => selectPrefecture(null)}
          className={optionClass(selectedId === null)}
          aria-pressed={selectedId === null}
        >
          全国
        </button>
        {quickOptions.map((prefecture) => (
          <button
            key={prefecture.id}
            type="button"
            onClick={() => selectPrefecture(prefecture.id)}
            disabled={isDisabled(prefecture)}
            className={`${optionClass(selectedId === prefecture.id)} disabled:cursor-not-allowed disabled:opacity-40`}
            aria-pressed={selectedId === prefecture.id}
          >
            {prefecture.name.replace(/[都府県]$/, "")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${optionClass(Boolean(selectedId && !selectedIsQuick))} inline-flex items-center gap-1.5`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-pressed={Boolean(selectedId && !selectedIsQuick)}
        >
          {selected && !selectedIsQuick ? selected.name : "都道府県を選ぶ"}
          <span aria-hidden>⌄</span>
        </button>
        {isPending && (
          <span className="self-center whitespace-nowrap text-xs text-slate-400">
            更新中…
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[1100] bg-slate-950/45 p-4 sm:grid sm:place-items-center"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prefecture-dialog-title"
            className="fixed inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:static sm:w-full sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 id="prefecture-dialog-title" className="text-lg font-bold">
                  都道府県を選ぶ
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  地図と施設一覧を同じ都府県に切り替えます
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-600 hover:bg-slate-200"
                aria-label="都道府県選択を閉じる"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              <button
                type="button"
                onClick={() => selectPrefecture(null)}
                aria-pressed={selectedId === null}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                  selectedId === null
                    ? "border-sky-600 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-700 hover:border-sky-300"
                }`}
              >
                全国
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {prefectures.reduce((sum, prefecture) => sum + prefecture.count, 0)}件
                </span>
              </button>
              {prefectures.map((prefecture) => (
                <button
                  key={prefecture.id}
                  type="button"
                  onClick={() => selectPrefecture(prefecture.id)}
                  disabled={isDisabled(prefecture)}
                  aria-pressed={selectedId === prefecture.id}
                  className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedId === prefecture.id
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-slate-200 text-slate-700 hover:border-sky-300"
                  }`}
                >
                  {prefecture.name}
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    {prefecture.count}件
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
