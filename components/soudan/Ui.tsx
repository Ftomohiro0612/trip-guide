"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const buttonBase = "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50";
export const buttonClass = `${buttonBase} border-slate-200 bg-white text-brand hover:bg-slate-50`;
export const primaryClass = `${buttonBase} border-brand bg-brand text-white hover:bg-brand-dark`;
export const inputClass = "mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
export const cardClass = "space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5";

export function useSoudanAction() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const running = useRef(false);
  const router = useRouter();
  function run(work: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setMessage("");
    startTransition(async () => {
      try { await work(); } catch { setMessage("通信できませんでした。もう一度お試しください。"); }
      finally { running.current = false; }
    });
  }
  return { pending, message, setMessage, run, router };
}

export function Notice({ children }: { children: React.ReactNode }) {
  return children ? <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{children}</p> : null;
}

export function Dialog({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: React.ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
    <div className="mb-4 flex items-start justify-between gap-3"><h2 id={titleId} className="text-lg font-bold">{title}</h2><button type="button" disabled={busy} onClick={onClose} className={buttonClass} aria-label="閉じる">×</button></div>
    {children}
  </dialog>;
}

export function Chips({ label, values, selected, onToggle }: { label: string; values: readonly string[]; selected: readonly string[]; onToggle: (value: string) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-medium text-slate-700">{label}</legend><div className="flex flex-wrap gap-2">{values.map((value) => <button type="button" aria-pressed={selected.includes(value)} key={value} onClick={() => onToggle(value)} className={`${buttonBase} rounded-full text-xs ${selected.includes(value) ? "border-brand bg-brand/10 text-brand hover:bg-brand/15" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{value}</button>)}</div></fieldset>;
}
