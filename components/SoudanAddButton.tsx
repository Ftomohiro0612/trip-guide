"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildLoginRedirect } from "@/lib/auth-dest";
import { createClient } from "@/lib/supabase/client";
import type { addSoudanCandidate, listSoudanDestinations } from "@/lib/soudan-owner-server";
import { trackSoudan } from "@/lib/soudan-analytics-client";
import { buttonClass, Dialog, Notice, useSoudanAction } from "./soudan/Ui";

export default function SoudanAddButton({ kind, reference }: { kind: "facility" | "event"; reference: string }) {
  const { pending, message, setMessage, run } = useSoudanAction();
  const [items, setItems] = useState<{ id: string; title: string }[] | null>(null);
  const [added, setAdded] = useState<{ id: string; title: string } | null>(null);
  const resumed = useRef(false);
  const marker = `${kind}:${reference}`;

  async function add(destination: string | null) {
    const response = await fetch("/api/soudan/candidates", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, reference, destination }),
    });
    const result: Awaited<ReturnType<typeof addSoudanCandidate>> = await response.json();
    if (!result.ok) { setMessage(result.error); return; }
    if (result.created) trackSoudan({ name: "soudan_create", properties: {} });
    trackSoudan({ name: "soudan_candidate_add", properties: { kind } });
    setAdded({ id: result.id, title: result.title }); setItems(null);
  }
  function begin() {
    run(async () => {
      setAdded(null);
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) {
        const url = new URL(window.location.href);
        url.searchParams.set("soudanAdd", marker);
        window.location.assign(buildLoginRedirect(`${url.pathname}${url.search}${url.hash}`));
        return;
      }
      const response = await fetch("/api/soudan/destinations", { credentials: "same-origin", cache: "no-store" });
      const result: Awaited<ReturnType<typeof listSoudanDestinations>> = await response.json();
      if (!result.ok) { setMessage(result.error); return; }
      if (result.items.length === 0) await add(null);
      else setItems(result.items);
    });
  }
  useEffect(() => {
    if (resumed.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("soudanAdd") !== marker) return;
    resumed.current = true;
    url.searchParams.delete("soudanAdd");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    begin();
    // One-shot login continuation; no polling or DB access on ordinary page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marker]);

  return <div className="space-y-2">
    <button type="button" disabled={pending} onClick={begin} className={buttonClass}>{pending ? "入れています…" : "相談に入れる"}</button>
    <Notice>{message}</Notice>
    {added && <div role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{added.title}に入れました <Link className="font-bold underline" href={`/mypage/soudan/${added.id}`}>相談を見る →</Link></div>}
    {items && <Dialog title="どの相談に入れますか？" busy={pending} onClose={() => setItems(null)}><div className="space-y-2"><p className="text-xs text-slate-500">最近更新した相談から表示しています</p>{items.map((item) => <button key={item.id} type="button" disabled={pending} className={`${buttonClass} w-full justify-start break-words text-left`} onClick={() => run(() => add(item.id))}>{item.title}</button>)}<button type="button" disabled={pending} className={`${buttonClass} w-full`} onClick={() => run(() => add(null))}>＋ 新しい相談を作る</button><Notice>{message}</Notice></div></Dialog>}
  </div>;
}
