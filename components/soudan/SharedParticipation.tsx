"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConsultationResponse, Reaction, ResponseKind } from "@/lib/soudan/types";
import type { SoudanAnalyticsEvent } from "@/lib/soudan/analytics";
import { RESPONSE_KINDS } from "@/lib/soudan/types";
import { isHttpUrl } from "@/lib/soudan/validation";
import { buttonClass, inputClass, Notice } from "./Ui";

const labels = { finding: "分かったこと", correction: "訂正", unverified: "未確認", comment: "一言" };
const fields = { hours: "営業時間", price: "料金", reservation: "予約", other: "その他" };
const Author = createContext("家族");
type SharedEvent = Extract<SoudanAnalyticsEvent, { name: "soudan_link_view" | "soudan_response" }>;
function track(event: SharedEvent) {
  try {
    if (event.name === "soudan_link_view") window.gtag?.("event", "soudan_link_view", {});
    else if (event.name === "soudan_response" && RESPONSE_KINDS.includes(event.properties.kind)) window.gtag?.("event", "soudan_response", { kind: event.properties.kind });
  } catch { /* Measurement does not affect participation. */ }
}

export function SharedParticipation({ children }: { children: React.ReactNode }) {
  const [author, setAuthor] = useState("家族");
  const viewed = useRef(false);
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem("memorips-soudan-author");
        if (stored?.trim() && [...stored].length <= 20) setAuthor(stored);
      } catch { /* Storage is optional. */ }
    }, 0);
    let analyticsTimer: number | undefined;
    let attempts = 0;
    const recordView = () => {
      if (viewed.current) return;
      if (window.gtag) { viewed.current = true; track({ name: "soudan_link_view", properties: {} }); }
      else if (++attempts < 50) analyticsTimer = window.setTimeout(recordView, 100);
    };
    recordView();
    return () => { window.clearTimeout(timer); window.clearTimeout(analyticsTimer); };
  }, []);
  return <Author.Provider value={author}>
    <div className="mb-6 space-y-3 rounded-xl bg-sky-50 p-4">
      <label className="block text-sm font-bold">書き込むときの名前
        <input className={inputClass} value={author} maxLength={20} placeholder="パパ、ばあば など" onChange={(e) => {
          setAuthor(e.target.value);
          try { localStorage.setItem("memorips-soudan-author", e.target.value); } catch { /* Storage is optional. */ }
        }} />
      </label>
      <p className="text-xs text-slate-600">名前はこの端末に覚えます。種類を選び、1行書くだけで参加できます。</p>
      <button type="button" disabled={refreshing} className={buttonClass} onClick={() => refresh(() => router.refresh())}>最新の内容に更新</button>
    </div>
    {children}
  </Author.Provider>;
}

export function SharedResponseForm({ token, candidateId, replyTo, onSaved }: { token: string; candidateId: string | null; replyTo?: string; onSaved?: () => void }) {
  const author = useContext(Author);
  const router = useRouter();
  const [kind, setKind] = useState<ResponseKind>(replyTo ? "finding" : "comment");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  async function send(form: HTMLFormElement, reaction: Reaction | null) {
    if (running.current) return;
    running.current = true; setPending(true); setMessage("");
    const data = new FormData(form);
    const responseKind = reaction ? "comment" : kind;
    try {
      const response = await fetch("/api/soudan/respond", { method: "POST", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, candidate_id: candidateId, kind: responseKind, body: reaction ? "" : data.get("body"), author_label: author, correction_field: !reaction && kind === "correction" ? data.get("correction_field") : null, source_url: reaction ? null : data.get("source_url") || null, reply_to_id: replyTo ?? null, reaction }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setMessage(result.message || "送信できませんでした。少し時間をおいてお試しください。"); return; }
      track({ name: "soudan_response", properties: { kind: responseKind } });
      form.reset(); setMessage("書き残しました。最新の内容を読み込みます。"); router.refresh(); onSaved?.();
    } catch { setMessage("通信できませんでした。もう一度お試しください。"); }
    finally { running.current = false; setPending(false); }
  }
  return <form className="space-y-3 rounded-xl bg-slate-50 p-3" onSubmit={(e) => { e.preventDefault(); void send(e.currentTarget, null); }}>
    <fieldset disabled={pending} className="space-y-3">
      {!replyTo && candidateId && <div className="flex gap-2">{(["like", "concern"] as const).map((reaction) => <button key={reaction} type="button" className={buttonClass} onClick={(e) => void send(e.currentTarget.form!, reaction)}>{reaction === "like" ? "いいね" : "気になる"}</button>)}</div>}
      {replyTo ? <p className="text-sm font-bold">この未確認について分かったこと</p> : <label className="block text-xs font-bold">書き込みの種類<select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as ResponseKind)}>{RESPONSE_KINDS.map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>}
      {kind === "correction" && <label className="block text-xs font-bold">訂正する項目<select name="correction_field" className={inputClass}>{Object.entries(fields).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <label className="block text-xs font-bold">{replyTo ? "分かったこと" : "1行書く"}<input name="body" required maxLength={500} className={inputClass} /></label>
      <details><summary className="cursor-pointer text-xs text-slate-600">出典 URL を添える（任意）</summary><label className="mt-2 block text-xs">出典 URL<input name="source_url" type="url" maxLength={500} placeholder="https://" className={inputClass} /></label></details>
      <button type="submit" className={buttonClass}>{pending ? "送信中…" : "書き残す"}</button>
    </fieldset>
    <Notice>{message}</Notice>
  </form>;
}

export function SharedResponses({ token, candidateId, responses, researchNote }: { token: string; candidateId: string | null; responses: ConsultationResponse[]; researchNote?: string | null }) {
  const [reply, setReply] = useState<string | null>(null);
  const sorted = [...responses].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const ids = new Set(sorted.map((r) => r.id));
  function item(r: ConsultationResponse, nested = false): React.ReactNode {
    return <li key={r.id} className={`space-y-2 border-l-2 border-slate-200 pl-3 ${nested ? "mt-3" : "py-3"}`}>
      <p className="flex flex-wrap gap-2 text-xs text-slate-600"><span className="font-bold text-slate-800">{labels[r.kind]}{r.correction_field ? `・${fields[r.correction_field]}` : ""}</span><span>{r.author_label}</span><time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>{r.status === "resolved" && <span className="text-emerald-700">{r.kind === "correction" ? "反映済み" : "確認済み"}</span>}</p>
      {r.body && <p className="whitespace-pre-wrap break-words text-sm">{r.body}</p>}
      {r.source_url && isHttpUrl(r.source_url) && <a href={r.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-xs text-brand underline">出典を見る ↗</a>}
      {r.kind === "unverified" && <button type="button" className={buttonClass} onClick={() => setReply(reply === r.id ? null : r.id)}>これに答える</button>}
      {reply === r.id && <SharedResponseForm token={token} candidateId={candidateId} replyTo={r.id} onSaved={() => setReply(null)} />}
      {!nested && <ol>{sorted.filter((entry) => entry.reply_to_id === r.id).map((entry) => item(entry, true))}</ol>}
    </li>;
  }
  return <section className="space-y-3">
    <h3 className="font-bold text-sm">調べたこと・家族の書き込み</h3>
    {researchNote && <div className="rounded-lg bg-sky-50 p-3 text-sm"><p className="mb-1 text-xs font-bold text-slate-600">作成者の調べたこと（現在のメモ）</p><p className="whitespace-pre-wrap break-words">{researchNote}</p></div>}
    {(["like", "concern"] as const).map((reaction) => {
      const rows = sorted.filter((r) => r.reaction === reaction);
      return rows.length ? <p className="text-xs text-slate-600" key={reaction}>{reaction === "like" ? "いいね" : "気になる"} {rows.length}件 · {rows.map((r) => r.author_label).join("、")}</p> : null;
    })}
    <ol>{sorted.filter((r) => !r.reaction && (!r.reply_to_id || !ids.has(r.reply_to_id))).map((r) => item(r))}</ol>
    <SharedResponseForm token={token} candidateId={candidateId} />
  </section>;
}
