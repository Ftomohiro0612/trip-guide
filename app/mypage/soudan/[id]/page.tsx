import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ownerView } from "@/lib/soudan-owner";
import { SOUDAN_COPY } from "@/lib/soudan/copy";
import type { Consultation, ConsultationCandidate, ConsultationResponse } from "@/lib/soudan/types";
import ConsultationForm from "@/components/soudan/ConsultationForm";
import CandidateCard from "@/components/soudan/CandidateCard";
import ShareControls from "@/components/soudan/ShareControls";
import ConsultationState from "@/components/soudan/ConsultationState";
import ExternalCandidateForm from "@/components/soudan/ExternalCandidateForm";
import Responses from "@/components/soudan/Responses";

export default async function SoudanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect(`/auth/login?redirectTo=${encodeURIComponent(`/mypage/soudan/${id}`)}`);
  const { data, error } = await db.from("consultations").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("相談を読み込めませんでした");
  if (!data) notFound();
  const c = ownerView(data as Consultation);
  const [candidatesResult, responsesResult] = await Promise.all([
    db.from("consultation_candidates").select("*").eq("consultation_id", id).order("sort_order").order("created_at").order("id"),
    db.from("consultation_responses").select("*").eq("consultation_id", id).order("created_at").order("id"),
  ]);
  if (candidatesResult.error || responsesResult.error) throw new Error("候補を読み込めませんでした");
  const candidates = candidatesResult.data as ConsultationCandidate[];
  const responses = responsesResult.data as ConsultationResponse[];
  const decided = candidates.find((candidate) => candidate.id === c.decided_candidate_id);
  const dateLabel = c.decided_date ? `${Number(c.decided_date.slice(5, 7))}月${Number(c.decided_date.slice(8, 10))}日` : "日にち未定";
  return <><Link href="/mypage/soudan" className="text-sm text-slate-500">← おでかけ相談</Link><h1 className="break-words text-xl font-bold">{c.title}</h1>
    {decided && <section className="space-y-2 rounded-xl border border-brand/20 bg-brand/5 p-4"><h2 className="break-words font-bold">決定: {decided.title} / {dateLabel}</h2><p className="text-xs text-slate-600">共有リンクが当日カードになります。</p></section>}
    {c.status === "archived" && <p className="text-sm font-bold text-slate-500">アーカイブ中・共有は停止しています</p>}
    <ConsultationForm key={`${c.id}-form`} id={c.id} title={c.title} conditions={c.conditions} />
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"><h2 className="font-bold">家族に送る</h2><ShareControls consultation={c} /><div className="space-y-2 text-xs leading-relaxed text-slate-500"><p>{SOUDAN_COPY.visibility}</p><p>{SOUDAN_COPY.forwarding}</p><p>{SOUDAN_COPY.search}</p><p>共有 URL は発行直後だけ表示されます。あとで必要になったら再発行してください。</p></div></section>
    <div className="space-y-2"><h2 className="font-bold">候補（{candidates.length}/30）</h2><p className="text-xs leading-relaxed text-slate-500">施設ページやイベント、行きたいリストから「相談に入れる」で追加できます。</p><p className="text-xs leading-relaxed text-slate-500">本体の施設情報の訂正は Memorips の公式確認で行います</p></div>
    {candidates.map((candidate, index) => <CandidateCard key={candidate.id} candidate={candidate} consultation={c} responses={responses.filter((r) => r.candidate_id === candidate.id)} index={index} total={candidates.length} />)}
    {c.status === "open" && <ExternalCandidateForm id={c.id} />}
    {responses.some((r) => r.candidate_id === null) && <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-3 font-bold">相談全体への書き込み</h2><Responses consultationId={c.id} candidateId={null} responses={responses.filter((r) => r.candidate_id === null)} /></section>}
    <ConsultationState consultation={c} />
  </>;
}
