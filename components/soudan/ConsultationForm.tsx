"use client";

import { useState } from "react";
import { AGE_BANDS } from "@/lib/soudan/types";
import type { Conditions } from "@/lib/soudan/types";
import { createSoudan, saveSoudan } from "@/app/mypage/soudan/actions";
import { trackSoudan } from "@/lib/soudan-analytics-client";
import { buttonClass, cardClass, Chips, inputClass, Notice, primaryClass, useSoudanAction } from "./Ui";

export default function ConsultationForm({ id, title, conditions }: { id?: string; title: string; conditions: Conditions }) {
  const [value, setValue] = useState(conditions);
  const [date, setDate] = useState("");
  const { pending, message, setMessage, run, router } = useSoudanAction();
  function toggle(key: "ageBands" | "dates", item: string) {
    const values = value[key] ?? [];
    const next = values.includes(item as never) ? values.filter((v) => v !== item) : [...values, item];
    setValue({ ...value, [key]: next });
  }
  return <form className={cardClass} onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(async () => {
      const input = { title: data.get("title"), conditions: value };
      if (id) {
        const result = await saveSoudan(id, input);
        if (!result.ok) { setMessage(result.error); return; }
        setMessage("保存しました"); router.refresh();
      } else {
        const result = await createSoudan(input);
        if (!result.ok) { setMessage(result.error); return; }
        trackSoudan({ name: "soudan_create", properties: {} });
        router.push(`/mypage/soudan/${result.id}`);
      }
    });
  }}><fieldset disabled={pending} className="space-y-4">
    <label className="block text-sm font-bold">タイトル<input className={inputClass} name="title" defaultValue={title} required maxLength={60} /></label>
    <details open={!!id}><summary className="cursor-pointer text-sm font-bold text-brand">希望条件（すべて任意）</summary><div className="mt-4 space-y-5">
      <div><Chips label="日にち候補（5つまで・押すと外せます）" values={value.dates ?? []} selected={value.dates ?? []} onToggle={(v) => toggle("dates", v)} /><div className="mt-2 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs text-slate-600">日にちを選ぶ<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></label><button type="button" className={buttonClass} disabled={!date || (value.dates?.length ?? 0) >= 5 || value.dates?.includes(date)} onClick={() => { toggle("dates", date); setDate(""); }}>追加</button></div></div>
      <label className="block text-sm font-medium">エリア（任意・5つまで、読点で区切る）<input className={inputClass} maxLength={500} value={(value.areas ?? []).join("、")} onChange={(e) => setValue({ ...value, areas: e.target.value ? e.target.value.split("、").slice(0, 5) : [] })} placeholder="例: 東京、神奈川" /></label>
      <Chips label="予算感" values={["無料", "〜1,000円", "〜3,000円", "〜5,000円", "こだわらない"]} selected={value.budget ? [value.budget] : []} onToggle={(v) => setValue({ ...value, budget: value.budget === v ? "" : v })} />
      <Chips label="移動時間" values={["30分以内", "1時間以内", "2時間以内", "こだわらない"]} selected={value.travelTime ? [value.travelTime] : []} onToggle={(v) => setValue({ ...value, travelTime: value.travelTime === v ? "" : v })} />
      <Chips label="子どもの年齢帯（プロフィールから自動入力・外せます）" values={AGE_BANDS} selected={value.ageBands ?? []} onToggle={(v) => toggle("ageBands", v)} />
      <Chips label="天気" values={["雨でも可 / 屋内"]} selected={value.rainOk ? ["雨でも可 / 屋内"] : []} onToggle={() => setValue({ ...value, rainOk: !value.rainOk })} />
      <label className="block text-sm font-medium">その他の一言（任意）<input className={inputClass} maxLength={100} value={value.note ?? ""} onChange={(e) => setValue({ ...value, note: e.target.value })} /></label>
    </div></details>
    <button className={primaryClass} type="submit">{pending ? "保存中…" : id ? "希望条件・タイトルを保存" : "このタイトルで作る"}</button>
  </fieldset><Notice>{message}</Notice></form>;
}
