"use client";

import { changeConsultationState } from "@/app/mypage/soudan/actions";
import type { OwnerConsultation } from "@/lib/soudan-owner";
import { buttonClass, Notice, useSoudanAction } from "./Ui";

export default function ConsultationState({ consultation: c }: { consultation: OwnerConsultation }) {
  const { pending, message, setMessage, run, router } = useSoudanAction();
  function change(operation: "archive" | "restore" | "undo") {
    if (operation === "archive" && !window.confirm("アーカイブすると共有も停止します。アーカイブしますか？")) return;
    run(async () => {
      const result = await changeConsultationState(c.id, operation);
      if (!result.ok) { setMessage(result.error); return; } router.refresh();
    });
  }
  return <div className="space-y-2"><div className="flex flex-wrap gap-2">{c.status === "decided" && <button type="button" disabled={pending} className={buttonClass} onClick={() => change("undo")}>決定を取り消す</button>}<button type="button" disabled={pending} className={`${buttonClass} text-slate-500`} onClick={() => change(c.status === "archived" ? "restore" : "archive")}>{c.status === "archived" ? "アーカイブから戻す" : "アーカイブ"}</button></div><Notice>{message}</Notice></div>;
}
