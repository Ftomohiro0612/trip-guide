import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ownerView } from "@/lib/soudan-owner";
import type { Consultation } from "@/lib/soudan/types";
import ShareControls from "@/components/soudan/ShareControls";

export default async function SoudanListPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/auth/login?redirectTo=%2Fmypage%2Fsoudan");
  const { data, error } = await db.from("consultations").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
  const items = ((data ?? []) as Consultation[]).map(ownerView);
  return <><Link href="/mypage" className="text-sm text-slate-500">← マイページ</Link><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">おでかけ相談</h1><Link className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white" href="/mypage/soudan/new">新しい相談を作る</Link></div><p className="text-sm text-slate-500">候補や調べたことをまとめて、家族に1つのリンクで送れます。</p>
    {error ? <p role="alert" className="rounded-xl border border-slate-200 p-4 text-sm">相談を読み込めませんでした。時間をおいてお試しください。</p> : items.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">施設ページやイベントの『相談に入れる』から始められます</p> : ([ ["open", "進行中"], ["decided", "決定済み"], ["archived", "アーカイブ"] ] as const).map(([status, label]) => <section key={status} className="space-y-3"><h2 className="text-sm font-bold">{label}（{items.filter((c) => c.status === status).length}）</h2>{items.filter((c) => c.status === status).map((c) => <article key={c.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"><Link href={`/mypage/soudan/${c.id}`} className="block break-words font-bold text-brand underline">{c.title} →</Link><ShareControls consultation={c} /></article>)}</section>)}
  </>;
}
