"use client";

import { useState } from "react";
import { addOwnerResponse, changeResponse } from "@/app/mypage/soudan/actions";
import type { ConsultationResponse } from "@/lib/soudan/types";
import { isHttpUrl } from "@/lib/soudan/validation";
import { buttonClass, inputClass, Notice, useSoudanAction } from "./Ui";

const labels = { finding: "分かったこと", correction: "訂正", unverified: "未確認", comment: "一言" };
const fields = { hours: "営業時間", price: "料金", reservation: "予約", other: "その他" };
const timeLabel = (value: string) => new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function OwnerResponseForm({ consultationId, candidateId, replyTo, onSaved }: { consultationId: string; candidateId: string | null; replyTo?: string; onSaved?: () => void }) {
  const { pending, message, setMessage, run, router } = useSoudanAction();
  return <form className="space-y-2 rounded-lg bg-slate-50 p-3" onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(async () => {
      const result = await addOwnerResponse(consultationId, { candidate_id: candidateId, kind: replyTo ? "finding" : data.get("kind"), body: data.get("body"), author_label: "作成者", reply_to_id: replyTo ?? null, source_url: data.get("source_url") || null });
      if (!result.ok) { setMessage(result.error); return; }
      form.reset(); setMessage("残しました"); router.refresh(); onSaved?.();
    });
  }}><fieldset disabled={pending} className="space-y-2">
    {replyTo ? <p className="text-xs font-bold">この未確認について分かったこと</p> : <label className="block text-xs font-medium">作成者の書き込み<select name="kind" className={inputClass}><option value="finding">分かったこと</option><option value="unverified">未確認</option></select></label>}
    <label className="block text-xs font-medium">{replyTo ? "分かったこと" : "内容"}<input required name="body" maxLength={500} className={inputClass} /></label>
    <label className="block text-xs font-medium">出典 URL（任意）<input type="url" name="source_url" maxLength={500} className={inputClass} placeholder="https://" /></label>
    <button type="submit" className={buttonClass}>書き残す</button>
  </fieldset><Notice>{message}</Notice></form>;
}

export default function Responses({ consultationId, candidateId, responses, researchNote }: { consultationId: string; candidateId: string | null; responses: ConsultationResponse[]; researchNote?: string | null }) {
  const { pending, message, setMessage, run, router } = useSoudanAction();
  const [reply, setReply] = useState<string | null>(null);
  const sorted = [...responses].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const ids = new Set(sorted.map((r) => r.id));
  function change(id: string, operation: "resolve" | "reopen" | "delete") {
    if (operation === "delete" && !window.confirm("この書き込みを削除しますか？")) return;
    run(async () => {
      const result = await changeResponse(consultationId, id, operation);
      if (!result.ok) { setMessage(result.error); return; }
      router.refresh();
    });
  }
  function renderResponse(r: ConsultationResponse, nested = false): React.ReactNode {
    const resolvable = r.kind === "unverified" || r.kind === "correction";
    return <li key={r.id} className={`space-y-2 border-l-2 border-slate-200 pl-3 ${nested ? "mt-3" : "py-2"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded px-2 py-1 font-bold ${r.kind === "correction" ? "bg-amber-50 text-amber-800" : "bg-sky-50 text-slate-700"}`}>{labels[r.kind]}{r.correction_field ? `・${fields[r.correction_field]}` : ""}</span><span>{r.author_label}</span><time className="text-slate-500" dateTime={r.created_at}>{timeLabel(r.created_at)}</time>{r.status === "resolved" && <span className="text-emerald-700">{r.kind === "correction" ? "反映済み" : "確認済み"}</span>}</div>
      {r.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.body}</p>}
      {r.reaction && <p className="text-xs text-slate-600">{r.reaction === "like" ? "よさそう" : "気になる"}</p>}
      {r.source_url && isHttpUrl(r.source_url) && <a className="block break-all text-xs text-brand underline" href={r.source_url} target="_blank" rel="noopener noreferrer nofollow">出典を見る ↗</a>}
      <div className="flex flex-wrap gap-2">{resolvable && <button type="button" disabled={pending} className={buttonClass} onClick={() => change(r.id, r.status === "resolved" ? "reopen" : "resolve")}>{r.status === "resolved" ? "元に戻す" : r.kind === "correction" ? "反映した" : "確認した"}</button>}{r.kind === "unverified" && <button className={buttonClass} type="button" onClick={() => setReply(reply === r.id ? null : r.id)}>分かったことを残す</button>}<button type="button" disabled={pending} className={`${buttonClass} text-slate-500`} onClick={() => change(r.id, "delete")}>書き込みを削除</button></div>
      {reply === r.id && <OwnerResponseForm consultationId={consultationId} candidateId={candidateId} replyTo={r.id} onSaved={() => setReply(null)} />}
      {!nested && <ol>{sorted.filter((item) => item.reply_to_id === r.id).map((item) => renderResponse(item, true))}</ol>}
    </li>;
  }
  return <section className="space-y-3"><h3 className="text-sm font-bold">調べたこと・家族からの書き込み</h3>
    {researchNote && <div className="rounded-lg bg-slate-50 p-3 text-sm"><p className="mb-1 text-xs font-bold text-slate-500">作成者の調べたこと（現在のメモ）</p><p className="whitespace-pre-wrap break-words">{researchNote}</p></div>}
    {sorted.length ? <ol>{sorted.filter((r) => !r.reply_to_id || !ids.has(r.reply_to_id)).map((r) => renderResponse(r))}</ol> : <p className="text-xs text-slate-500">書き込みはまだありません</p>}
    <Notice>{message}</Notice>
    <OwnerResponseForm consultationId={consultationId} candidateId={candidateId} />
  </section>;
}
