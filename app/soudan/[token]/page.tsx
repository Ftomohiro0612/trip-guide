import type { Metadata } from "next";
import Link from "next/link";
import { createSoudanAnonClient } from "@/lib/soudan-anon";
import { isPlausibleShareToken } from "@/lib/soudan/token";
import { SOUDAN_COPY } from "@/lib/soudan/copy";
import { UNAVAILABLE_LINK } from "@/lib/soudan-respond";
import { getSharedFacts } from "@/lib/soudan-shared-facts";
import type { SharedConsultation } from "@/lib/soudan/types";
import SharedFacts, { ExternalLink } from "@/components/soudan/SharedFacts";
import { SharedParticipation, SharedResponses } from "@/components/soudan/SharedParticipation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "おでかけ相談 | メモリップ" },
  description: "おでかけの候補と調べたことを、一緒に相談するページです。",
  robots: { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false, noarchive: true } },
  referrer: "no-referrer",
  openGraph: { title: "おでかけ相談 | メモリップ", description: "おでかけの候補を一緒に相談。", images: ["/opengraph-image.png"] },
  twitter: { card: "summary_large_image", title: "おでかけ相談 | メモリップ", description: "おでかけの候補を一緒に相談。", images: ["/opengraph-image.png"] },
};

export default async function SharedSoudanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let shared: SharedConsultation | null = null;
  if (isPlausibleShareToken(token)) {
    try {
      const { data, error } = await createSoudanAnonClient().rpc("soudan_shared_get", { p_token: token });
      if (!error && data) shared = data as SharedConsultation;
    } catch { /* All unavailable links have the same display; never log the URL. */ }
  }
  if (!shared) return <div className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-xl font-bold">このリンクは使えません</h1><p className="mt-4 leading-relaxed">{UNAVAILABLE_LINK}</p></div>;
  const { consultation: c, candidates, responses } = shared;
  const facts = new Map(await Promise.all(candidates.filter((candidate) => candidate.kind !== "external").map(async (candidate) => [candidate.id, await getSharedFacts(candidate)] as const)));
  const chosen = candidates.find((candidate) => candidate.id === c.decided_candidate_id);
  const chosenFacts = chosen ? facts.get(chosen.id) : undefined;
  const pending = responses.filter((r) => r.kind === "unverified" && r.status === "open" && (!r.candidate_id || r.candidate_id === chosen?.id));
  const conditions = c.conditions;
  const conditionsList = [
    ["日にち候補", conditions.dates?.join("、")], ["エリア", conditions.areas?.join("、")], ["予算感", conditions.budget], ["移動時間", conditions.travelTime], ["年齢帯", conditions.ageBands?.join("、")], ["雨の日", conditions.rainOk === true ? "雨でも可" : conditions.rainOk === false ? "晴れの日に" : null], ["一言", conditions.note],
  ];
  return <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-slate-800">
    <aside className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed"><p className="font-bold">{SOUDAN_COPY.visibility}</p><p>{SOUDAN_COPY.forwarding}</p><p>{SOUDAN_COPY.search}</p></aside>
    {c.status === "decided" && chosen && <section className="space-y-4 rounded-2xl border-2 border-sky-300 bg-sky-50 p-4 sm:p-6" aria-label="当日カード">
      <p className="text-sm font-bold text-brand">当日カード</p><h1 className="break-words text-2xl font-bold">{chosenFacts?.snapshot.title || chosen.title}</h1>
      <p className="font-bold">{c.decided_date || "日付は未定"}</p>
      {chosenFacts?.address && <p className="text-sm">住所: {chosenFacts.address}</p>}
      <ExternalLink href={chosenFacts?.mapUrl}>地図を開く</ExternalLink>
      {chosenFacts && <SharedFacts facts={chosenFacts} responses={responses.filter((r) => r.candidate_id === chosen.id)} />}
      {chosen.kind === "external" && <ExternalLink href={chosen.external_url}>候補のサイトを見る</ExternalLink>}
      {chosen.reason && <div><h2 className="text-sm font-bold">選んだ理由</h2><p className="whitespace-pre-wrap break-words text-sm">{chosen.reason}</p></div>}
      {chosen.concern && <div><h2 className="text-sm font-bold">気になる点・持ち物・注意</h2><p className="whitespace-pre-wrap break-words text-sm">{chosen.concern}</p></div>}
      {pending.length > 0 && <div><h2 className="text-sm font-bold">まだ確認していないこと</h2><ul className="list-disc space-y-1 pl-5 text-sm">{pending.map((r) => <li key={r.id} className="break-words">{r.body} <span className="text-xs text-slate-500">{r.author_label}</span></li>)}</ul></div>}
      <Link href="/mypage/visits/new" prefetch={false} className="inline-block text-sm text-brand underline">Memorips に登録して記録する</Link>
    </section>}
    <header><p className="mb-2 text-sm text-slate-500">{c.status === "decided" ? "検討の経緯" : "おでかけ相談"}</p>{c.status === "decided" ? <h2 className="break-words text-xl font-bold">{c.title}</h2> : <h1 className="break-words text-2xl font-bold">{c.title}</h1>}</header>
    {conditionsList.some(([, value]) => value) && <section className="rounded-xl bg-white p-4"><h2 className="mb-3 font-bold">希望条件</h2><dl className="space-y-2 text-sm">{conditionsList.map(([label, value]) => value ? <div key={label}><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div> : null)}</dl></section>}
    <SharedParticipation>
      <div className="space-y-6">{candidates.map((candidate) => {
        const rows = responses.filter((r) => r.candidate_id === candidate.id);
        const open = (kind: string) => rows.filter((r) => r.kind === kind && r.status === "open").length;
        const f = facts.get(candidate.id);
        return <article key={candidate.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <header className="space-y-2"><p className="text-xs text-slate-500">{{ facility: "施設", event: "イベント", external: "外部サイト" }[candidate.kind]} · {{ candidate: "候補", favorite: "本命", rejected: "見送り" }[candidate.status]}</p><h2 className="break-words text-lg font-bold">{f?.snapshot.title || candidate.title}</h2><p className="text-xs text-slate-500">未確認 {open("unverified")}件 · 訂正 {open("correction")}件</p></header>
          {candidate.reason && <div><h3 className="text-sm font-bold">選んだ理由</h3><p className="whitespace-pre-wrap break-words text-sm">{candidate.reason}</p></div>}
          {candidate.concern && <div><h3 className="text-sm font-bold">気になる点</h3><p className="whitespace-pre-wrap break-words text-sm">{candidate.concern}</p></div>}
          {candidate.status === "rejected" && <div><h3 className="text-sm font-bold">見送り理由</h3><p className="whitespace-pre-wrap break-words text-sm">{candidate.reject_reason || "まだ記入されていません"}</p></div>}
          {f && <SharedFacts facts={f} responses={rows} />}
          {candidate.kind === "external" && <ExternalLink href={candidate.external_url}>{candidate.external_url}</ExternalLink>}
          <SharedResponses token={token} candidateId={candidate.id} responses={rows} researchNote={candidate.research_note} />
        </article>;
      })}</div>
      <section className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-bold">相談全体への書き込み</h2><SharedResponses token={token} candidateId={null} responses={responses.filter((r) => r.candidate_id === null)} /></section>
    </SharedParticipation>
  </div>;
}
