import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DeleteVisitButton from "./DeleteVisitButton";

export const metadata: Metadata = { title: "おでかけ履歴" };

type Visit = {
  id: string;
  facility_name: string;
  visited_on: string | null;
  family_revisit: "yes" | "conditional" | "once_enough" | "no";
};

const revisitLabels: Record<Visit["family_revisit"], string> = {
  yes: "✅ また行きたい",
  conditional: "🔄 条件次第",
  once_enough: "👍 一度で十分",
  no: "🙅 もう行かない",
};

function formatVisitedOn(visitedOn: string | null): string {
  if (!visitedOn) return "日付未設定";
  return visitedOn.replaceAll("-", "/");
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ no_child?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: visits } = user
    ? await supabase
        .from("visits")
        .select("id, facility_name, visited_on, family_revisit")
        .eq("user_id", user.id)
        .order("visited_on", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
        ← マイページ
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">おでかけ履歴</h1>
          <p className="text-sm text-slate-500 mt-1">最近の記録を新しい順に表示します。</p>
        </div>
        <Link
          href="/mypage/visits/new"
          className="shrink-0 px-3 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors"
        >
          記録する
        </Link>
      </div>

      {params.no_child === "1" && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700 leading-relaxed">
          子どもプロフィールなしで保存しました。あとから登録すると、次回以降は子どもごとの満足度も残せます。
        </div>
      )}

      {visits && visits.length > 0 ? (
        <div className="space-y-3">
          {(visits as Visit[]).map((visit) => (
            <article
              key={visit.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-slate-900">{visit.facility_name}</h2>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatVisitedOn(visit.visited_on)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  {revisitLabels[visit.family_revisit]}
                </p>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/mypage/visits/${visit.id}/edit`}
                    className="px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    編集
                  </Link>
                  <DeleteVisitButton visitId={visit.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-slate-400 text-sm">
          まだ記録がありません
        </div>
      )}

      <Link
        href="/mypage/visits/new"
        className="block w-full text-center py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors"
      >
        おでかけを記録する
      </Link>
    </div>
  );
}
