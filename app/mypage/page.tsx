import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "マイページ" };

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
};

function calcAge(birthYear: number, birthMonth: number): number {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (
    today.getMonth() + 1 < birthMonth ||
    (today.getMonth() + 1 === birthMonth && today.getDate() < 1)
  ) {
    age -= 1;
  }
  return age;
}

export default async function MypagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, birth_year, birth_month")
    .order("sort_order", { ascending: true });

  const hasChildren = children && children.length > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* ウェルカム */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          こんにちは 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
      </div>

      {/* 子どもプロフィール未登録プロンプト */}
      {!hasChildren && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <p className="font-semibold text-sky-900 text-sm">
            まず子どもプロフィールを登録しましょう！
          </p>
          <p className="text-sky-700 text-xs mt-1 leading-relaxed">
            ニックネームと生年月を登録することで、訪問時の「当時の年齢」が自動で記録されます。
          </p>
          <Link
            href="/mypage/children"
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-bold rounded-lg hover:bg-brand-dark transition-colors"
          >
            子どもを登録する →
          </Link>
        </div>
      )}

      {/* 子どもプロフィール一覧 */}
      {hasChildren && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800">子どもプロフィール</h2>
            <Link
              href="/mypage/children"
              className="text-brand text-sm hover:underline"
            >
              編集
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(children as Child[]).map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5"
              >
                <span className="text-lg">🧒</span>
                <span className="text-sm font-medium text-slate-800">
                  {child.nickname}
                </span>
                <span className="text-xs text-slate-400">
                  {calcAge(child.birth_year, child.birth_month)}歳
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <section>
        <h2 className="font-bold text-slate-800 mb-3">クイックアクション</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            href="/mypage/visits/new"
            icon="✏️"
            label="おでかけを記録"
            desc="今日行った場所を30秒で記録"
            primary
          />
          <ActionCard
            href="/mypage/visits/new?mode=past"
            icon="📅"
            label="過去の記録を追加"
            desc="昔行った場所も遡って登録"
          />
          <ActionCard
            href="/mypage/wishlist"
            icon="⭐"
            label="行きたいリスト"
            desc="候補の施設をまとめておく"
          />
          <ActionCard
            href="/mypage/visits"
            icon="📖"
            label="おでかけ履歴"
            desc="これまでの記録を振り返る"
          />
        </div>
      </section>

      {/* ログアウト */}
      <div className="pt-2">
        <LogoutButton />
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  label,
  desc,
  primary,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl p-4 flex flex-col gap-1 transition-colors ${
        primary
          ? "bg-brand text-white hover:bg-brand-dark"
          : "bg-white border border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span
        className={`font-semibold text-sm ${primary ? "text-white" : "text-slate-800"}`}
      >
        {label}
      </span>
      <span
        className={`text-xs leading-relaxed ${primary ? "text-sky-100" : "text-slate-500"}`}
      >
        {desc}
      </span>
    </Link>
  );
}

// クライアントコンポーネント（ログアウトボタン）
import LogoutButton from "./LogoutButton";
