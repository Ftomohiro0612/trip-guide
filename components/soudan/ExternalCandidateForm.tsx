"use client";

import { saveCandidate } from "@/app/mypage/soudan/actions";
import { trackSoudan } from "@/lib/soudan-analytics-client";
import { buttonClass, cardClass, inputClass, Notice, useSoudanAction } from "./Ui";

export default function ExternalCandidateForm({ id }: { id: string }) {
  const { pending, message, setMessage, run, router } = useSoudanAction();
  return <details className={cardClass}><summary className="cursor-pointer text-sm font-bold text-brand">＋ 外部サイトを候補に入れる</summary><form className="space-y-3" onSubmit={(event) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    run(async () => {
      const result = await saveCandidate(id, null, { kind: "external", title: data.get("title"), external_url: data.get("url"), reason: data.get("note") });
      if (!result.ok) { setMessage(result.error); return; }
      trackSoudan({ name: "soudan_candidate_add", properties: { kind: "external" } });
      form.reset(); setMessage("候補に入れました"); router.refresh();
    });
  }}><fieldset disabled={pending} className="space-y-3"><label className="block text-xs font-medium">URL<input className={inputClass} name="url" type="url" required placeholder="https://" /></label><label className="block text-xs font-medium">タイトル<input className={inputClass} name="title" required maxLength={100} /></label><label className="block text-xs font-medium">一言（任意）<input className={inputClass} name="note" maxLength={500} /></label><button type="submit" className={buttonClass}>候補に入れる</button></fieldset><Notice>{message}</Notice></form></details>;
}
