"use client";

import { useState } from "react";
import { decideSoudan } from "@/app/mypage/soudan/actions";
import { trackSoudan } from "@/lib/soudan-analytics-client";
import { buttonClass, Chips, Dialog, inputClass, Notice, primaryClass, useSoudanAction } from "./Ui";

export default function DecideButton({ id, candidateId, title, dates, disabled }: { id: string; candidateId: string; title: string; dates: string[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [conflict, setConflict] = useState<string | undefined>();
  const { pending, message, setMessage, run, router } = useSoudanAction();
  function decide() {
    run(async () => {
      const result = await decideSoudan(id, candidateId, date || null, conflict);
      if (!result.ok) { setMessage(result.error); return; }
      if (result.conflict) { setConflict(result.conflict); return; }
      trackSoudan({ name: "soudan_decide", properties: {} });
      setOpen(false); router.refresh();
    });
  }
  return <><button type="button" className={primaryClass} disabled={disabled} onClick={() => { setDate(""); setConflict(undefined); setMessage(""); setOpen(true); }}>これに決定</button>
    {open && <Dialog title="おでかけ先を決める" busy={pending} onClose={() => setOpen(false)}><div className="space-y-4"><p className="break-words text-sm font-bold">{title}</p><p className="text-xs text-slate-500">日にちは任意です。他の候補もそのまま残ります。</p><fieldset disabled={pending} className="space-y-3"><Chips label="日にち候補" values={dates} selected={date ? [date] : []} onToggle={(v) => { setDate(date === v ? "" : v); setConflict(undefined); }} /><label className="block text-sm">日付（任意）<input type="date" value={date} onChange={(e) => { setDate(e.target.value); setConflict(undefined); }} className={inputClass} /></label>{date && <button type="button" className={buttonClass} onClick={() => { setDate(""); setConflict(undefined); }}>日付を指定しない</button>}</fieldset>
      {conflict && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">行きたいリストには {conflict} の予定があります。{date} に変更しますか？</p>}
      <button type="button" className={primaryClass} disabled={pending} onClick={decide}>{pending ? "保存中…" : conflict ? "予定日を変更して決定" : "決定する"}</button><Notice>{message}</Notice>
    </div></Dialog>}
  </>;
}
