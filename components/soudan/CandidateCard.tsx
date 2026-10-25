"use client";

import Link from "next/link";
import { useState } from "react";
import { moveCandidate, saveCandidate } from "@/app/mypage/soudan/actions";
import type { ConsultationCandidate, ConsultationResponse, CandidateSnapshot } from "@/lib/soudan/types";
import type { OwnerConsultation } from "@/lib/soudan-owner";
import { responseCounts } from "@/lib/soudan-owner";
import { isHttpUrl } from "@/lib/soudan/validation";
import Responses from "./Responses";
import DecideButton from "./DecideButton";
import { buttonClass, cardClass, inputClass, Notice, useSoudanAction } from "./Ui";

const snapshotFields = { venue_name: "場所", prefecture_label: "エリア", date_label: "開催日", hours: "営業時間", price: "料金", reservation: "予約", rain: "雨天", age: "対象年齢" } as const;

export default function CandidateCard({ candidate: c, consultation, responses, index, total }: { candidate: ConsultationCandidate; consultation: OwnerConsultation; responses: ConsultationResponse[]; index: number; total: number }) {
  const [status, setStatus] = useState(c.status);
  const { pending, message, setMessage, run, router } = useSoudanAction();
  const counts = responseCounts(responses);
  const snapshot = c.snapshot as Partial<CandidateSnapshot>;
  function move(direction: -1 | 1) {
    run(async () => { const result = await moveCandidate(consultation.id, c.id, direction); if (!result.ok) setMessage(result.error); router.refresh(); });
  }
  return <article className={cardClass}>
    <div><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{c.kind === "facility" ? "施設" : c.kind === "event" ? "イベント" : "外部サイト"}</span><span>{c.status === "favorite" ? "本命" : c.status === "rejected" ? "見送り" : "候補"}</span>{consultation.decided_candidate_id === c.id && <span className="font-bold text-brand">決定</span>}<span>未確認 {counts.unverified}件 / 訂正 {counts.correction}件</span></div>
      <h2 className="mt-2 break-words text-lg font-bold">{c.title}</h2>
      {c.kind === "facility" && <Link href={`/facilities/${c.facility_slug}`} className="text-xs text-brand underline">施設ページを見る →</Link>}
      {c.kind === "event" && <Link href={`/events?event=${encodeURIComponent(c.event_id ?? "")}`} className="text-xs text-brand underline">イベントを見る →</Link>}
      {c.external_url && isHttpUrl(c.external_url) && <a href={c.external_url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-brand underline">外部サイトを見る ↗</a>}
    </div>
    {c.kind !== "external" && <section className="space-y-2 rounded-lg bg-sky-50/60 p-3"><h3 className="text-sm font-bold">Memorips で分かっていること</h3><dl className="space-y-1 text-xs leading-relaxed">{Object.entries(snapshotFields).map(([key, label]) => {
      const value = snapshot[key as keyof typeof snapshotFields];
      const corrected = responses.some((r) => r.kind === "correction" && r.source === "link" && r.correction_field === key);
      if (!value && !["hours", "price", "reservation"].includes(key)) return null;
      return <div key={key} className="break-words"><dt className="inline font-medium">{label}: </dt><dd className="inline">{value || "情報なし"}{corrected && <span className="ml-2 inline-block rounded bg-amber-50 px-1 text-amber-800">家族から訂正あり</span>}</dd></div>;
    })}</dl><p className="text-xs text-slate-500">公式確認日: {snapshot.source_checked_at || "未記録"}</p>{snapshot.official_url && isHttpUrl(snapshot.official_url) && <a href={snapshot.official_url} className="inline-block text-xs text-brand underline" target="_blank" rel="noopener noreferrer nofollow">公式サイト ↗</a>}</section>}
    <form onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      run(async () => {
        const result = await saveCandidate(consultation.id, c.id, { ...c, status, reason: data.get("reason"), research_note: data.get("research_note"), concern: data.get("concern"), reject_reason: status === "rejected" ? data.get("reject_reason") : null });
        if (!result.ok) { setMessage(result.error); return; } setMessage("保存しました"); router.refresh();
      });
    }}><fieldset disabled={pending} className="space-y-3"><label className="block text-xs font-medium">状態<select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="candidate">候補</option><option value="favorite">本命</option><option value="rejected">見送り</option></select></label>
      {([["reason", "選んだ理由"], ["research_note", "調べたこと"], ["concern", "気になる点"], ...(status === "rejected" ? [["reject_reason", "見送り理由"]] : [])] as ["reason" | "research_note" | "concern" | "reject_reason", string][]).map(([name, label]) => <label key={name} className="block text-xs font-medium">{label}（任意）<input className={inputClass} name={name} defaultValue={c[name] ?? ""} maxLength={500} /></label>)}
      <button className={buttonClass} type="submit">候補のメモを保存</button>
    </fieldset></form>
    <div className="flex flex-wrap items-center gap-2"><button className={buttonClass} type="button" aria-label={`${c.title}を上へ`} disabled={pending || index === 0} onClick={() => move(-1)}>↑ 上へ</button><button className={buttonClass} type="button" aria-label={`${c.title}を下へ`} disabled={pending || index === total - 1} onClick={() => move(1)}>↓ 下へ</button><DecideButton id={consultation.id} candidateId={c.id} title={c.title} dates={consultation.conditions.dates ?? []} disabled={pending || consultation.status === "archived" || consultation.decided_candidate_id === c.id} /></div>
    <Notice>{message}</Notice>
    <Responses consultationId={consultation.id} candidateId={c.id} responses={responses} researchNote={c.research_note} />
  </article>;
}
