import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "ようこそ | マイページ" };

export default async function MypageOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/mypage/onboarding");
  }

  const [{ count: childCount }, { count: visitCount }] = await Promise.all([
    supabase
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "published"),
  ]);

  if ((childCount ?? 0) > 0 || (visitCount ?? 0) > 0) {
    redirect("/mypage");
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="space-y-6">
        <section className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-5">
          <p className="text-xs font-medium text-sky-600">メモリップ</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
            ようこそ！まずは過去のおでかけを3件 👋
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sky-800">
            これまでのおでかけを3件入れると、家族のおでかけマップと思い出カードがすぐに動き出します。10分もかかりません。
          </p>
        </section>

        <section className="space-y-3">
          <div className="rounded-xl border-2 border-brand/40 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base">
                📷
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">写真から過去の記録をつくる</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    いちばんかんたん
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  スマホのおでかけ写真を選ぶだけ。撮影日と場所のヒントを自動で読み取って、記録の下書きを作ります。去年の思い出もすぐ入ります。
                </p>
                <Link
                  href="/mypage/visits/from-photo"
                  className="mt-4 inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  写真を選んではじめる →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base">
                ✏️
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">手で1件記録する</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  写真がなくても大丈夫。行った場所と、だいたいの時期だけで記録できます（「去年の夏ごろ」でもOK）。
                </p>
                <Link
                  href="/mypage/visits/new"
                  className="mt-4 inline-flex items-center rounded-lg border border-brand px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-sky-50"
                >
                  記録をはじめる →
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base">
                👧
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">子どもを登録（任意）</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  ニックネームと生年月だけで、すべての記録に「当時◯歳」が自動でつきます。本名・学校名は不要です。
                </p>
                <Link
                  href="/mypage/children"
                  className="mt-4 inline-flex items-center text-sm font-bold text-sky-600 hover:underline"
                >
                  子どもを登録する →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4 ring-1 ring-amber-100">
          <p className="text-xs font-bold text-amber-700">3件たまると、こうなります</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>🗺️ 行った場所がピンで並ぶ「家族のおでかけマップ」</li>
            <li>🖼️ 見返したくなる「思い出カード」が1件ごとに完成</li>
            <li>📊 月ごとのおでかけグラフと、子どもの「好き」の記録</li>
          </ul>
        </section>

        <div className="text-center">
          <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            あとで
          </Link>
        </div>
      </div>
    </main>
  );
}
