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
            はじめまして！メモリップへようこそ 👋
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sky-800">
            2ステップで、おでかけの記録をはじめましょう
          </p>
        </section>

        <section className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                1
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">子どもを登録(任意)</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  ニックネームと生年月を登録すると、おでかけ記録に「当時の年齢」が自動でつきます。本名・学校名は不要です。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/mypage/children"
                    className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    子どもを登録する →
                  </Link>
                  <a href="#first-visit" className="text-xs font-medium text-sky-600 hover:underline">
                    スキップして記録へ ↓
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div
            id="first-visit"
            className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                2
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-slate-900">最初のおでかけを記録</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  行った場所の記録が1件たまると、マイページが動きはじめます。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/mypage/visits/new"
                    className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    記録をはじめる →
                  </Link>
                  <Link href="/" className="text-xs font-medium text-sky-600 hover:underline">
                    施設をさがす →
                  </Link>
                </div>
              </div>
            </div>
          </div>
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
