import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";

export const metadata: Metadata = { title: "アカウント設定" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
    : { data: null };

  const identities = (user?.identities ?? []) as { provider: string }[];
  const isPasswordUser = identities.some((i) => i.provider === "email");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <Link
        href="/mypage"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← マイページ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">アカウント設定</h1>
        <p className="text-sm text-slate-500 mt-1">
          プロフィール情報を管理します。
        </p>
      </div>

      <AccountForm
        email={user?.email ?? ""}
        initialDisplayName={profile?.display_name ?? ""}
        isPasswordUser={isPasswordUser}
      />
    </div>
  );
}
