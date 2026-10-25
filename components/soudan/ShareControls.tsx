"use client";

import { useState } from "react";
import { changeShare } from "@/app/mypage/soudan/actions";
import { SOUDAN_COPY } from "@/lib/soudan/copy";
import { buildLineShareUrl, buildWebShareData } from "@/lib/soudan/share-link";
import { trackSoudan } from "@/lib/soudan-analytics-client";
import type { OwnerConsultation } from "@/lib/soudan-owner";
import { buttonClass, Dialog, inputClass, Notice, primaryClass, useSoudanAction } from "./Ui";

export default function ShareControls({ consultation: c }: { consultation: OwnerConsultation }) {
  const [mode, setMode] = useState<"issue" | "issued" | null>(null);
  const [url, setUrl] = useState("");
  const [webShare, setWebShare] = useState(false);
  const { pending, message, setMessage, run, router } = useSoudanAction();
  const reissue = c.share_state !== "未発行";
  function change(operation: "issue" | "stop" | "resume") {
    run(async () => {
      setUrl("");
      const result = await changeShare(c.id, operation);
      if (!result.ok) { setMessage(result.error); return; }
      if (result.url) {
        setUrl(result.url); setWebShare(typeof navigator.share === "function"); setMode("issued");
        trackSoudan({ name: "soudan_share", properties: {} });
      } else { setMessage(operation === "stop" ? "共有を停止しました" : "共有を再開しました"); setMode(null); }
      router.refresh();
    });
  }
  return <div className="space-y-3">
    <p className="text-xs font-bold text-slate-600">リンク: {c.share_state}</p>
    <div className="flex flex-wrap gap-2">
      <button disabled={pending || c.status === "archived"} className={buttonClass} type="button" onClick={() => { setMessage(""); setMode("issue"); }}>{reissue ? "リンクを再発行" : "家族に送る"}</button>
      {c.share_state === "共有中" && <button disabled={pending} className={buttonClass} onClick={() => change("stop")} type="button">共有を停止</button>}
      {c.share_state === "停止中" && c.status !== "archived" && <button disabled={pending} className={buttonClass} onClick={() => change("resume")} type="button">共有を再開</button>}
    </div>
    <Notice>{message}</Notice>
    {mode && <Dialog title={mode === "issued" ? "リンクを発行しました" : reissue ? "共有リンクを再発行" : "家族に送る前に"} busy={pending} onClose={() => { setMode(null); setUrl(""); setMessage(""); }}>
      {mode === "issue" ? <div className="space-y-4 text-sm leading-relaxed">
        <p className="font-bold">{SOUDAN_COPY.visibility}</p><p>{SOUDAN_COPY.forwarding}</p><p>{SOUDAN_COPY.search}</p>{reissue && <p className="font-bold">{SOUDAN_COPY.reissue}</p>}
        <p className="text-xs text-slate-500">URL は発行直後だけ表示されます。あとで URL を表示するには再発行が必要です。</p>
        <button disabled={pending} type="button" className={primaryClass} onClick={() => change("issue")}>リンクを発行する</button><Notice>{message}</Notice>
      </div> : <div className="space-y-4">
        <p className="text-sm">この画面を閉じる前に、コピーするか LINE で送ってください。URL は保存されず、あとで表示するには再発行が必要です。</p>
        <label className="block text-sm font-bold">共有 URL<input readOnly value={url} className={`${inputClass} text-xs`} onFocus={(e) => e.target.select()} /></label>
        <div className="flex flex-wrap gap-2"><button className={primaryClass} type="button" onClick={() => run(async () => { await navigator.clipboard.writeText(url); setMessage("コピーしました"); })}>URL をコピー</button><a className={primaryClass} href={buildLineShareUrl(c.title, url)} target="_blank" rel="noopener noreferrer nofollow">LINE で送る ↗</a>{webShare && <button type="button" className={buttonClass} onClick={() => run(async () => { try { await navigator.share(buildWebShareData(c.title, url)); } catch (error) { if (!(error instanceof Error) || error.name !== "AbortError") setMessage("共有できませんでした。URL をコピーしてください。"); } })}>端末の共有を使う</button>}</div>
        <Notice>{message}</Notice>
      </div>}
    </Dialog>}
  </div>;
}
