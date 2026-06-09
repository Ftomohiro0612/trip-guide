import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ChildrenForm from "./ChildrenForm";

export const metadata: Metadata = { title: "子どもプロフィール" };

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  gender: string | null;
};

function calcAge(birthYear: number, birthMonth: number): string {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth) age -= 1;
  if (age < 0) return "0歳";
  return `${age}歳`;
}

function genderLabel(gender: string | null): string {
  if (gender === "male") return "男の子";
  if (gender === "female") return "女の子";
  if (gender === "other") return "その他";
  return "";
}

export default async function ChildrenPage() {
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("id, nickname, birth_year, birth_month, gender")
    .order("sort_order", { ascending: true });

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← マイページ
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-900">子どもプロフィール</h1>

      <p className="text-slate-500 text-sm leading-relaxed">
        ニックネームと生年月を登録することで、おでかけ記録に「当時の年齢」が自動で記録されます。
        本名・学校名は不要です。
      </p>

      {/* 子ども一覧 */}
      <div className="space-y-3">
        {children && children.length > 0 ? (
          (children as Child[]).map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {child.gender === "female" ? "👧" : "🧒"}
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{child.nickname}</p>
                  <p className="text-xs text-slate-400">
                    {child.birth_year}年{child.birth_month}月生まれ
                    {" · "}
                    {calcAge(child.birth_year, child.birth_month)}
                    {child.gender ? ` · ${genderLabel(child.gender)}` : ""}
                  </p>
                </div>
              </div>
              <DeleteButton childId={child.id} nickname={child.nickname} />
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            まだ登録されていません
          </div>
        )}
      </div>

      {/* 追加フォーム（最大5人まで） */}
      {(!children || children.length < 5) && <ChildrenForm />}
      {children && children.length >= 5 && (
        <p className="text-xs text-slate-400 text-center">
          現在、最大5人まで登録できます
        </p>
      )}

      {/* マイページへ進む */}
      {children && children.length > 0 && (
        <div className="pt-2">
          <Link
            href="/mypage"
            className="block w-full text-center py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors"
          >
            マイページへ進む →
          </Link>
        </div>
      )}
    </div>
  );
}

// 削除ボタン（クライアントコンポーネント）
import DeleteButton from "./DeleteButton";
