"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "../LogoutButton";

export default function AccountForm({
  email,
  initialDisplayName,
  isPasswordUser,
}: {
  email: string;
  initialDisplayName: string;
  isPasswordUser: boolean;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaveError("ログインが必要です");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setSaveError(updateError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwSaved(false);
    setPwError(null);

    if (newPassword.length < 8) {
      setPwError("パスワードは8文字以上にしてください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("パスワードが一致しません");
      return;
    }

    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPwError(error.message);
    } else {
      setPwSaved(true);
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwSaving(false);
  }

  return (
    <div className="space-y-8">
      {/* プロフィール編集フォーム */}
      <form onSubmit={handleSave} className="space-y-6">
        <section className="space-y-1.5">
          <p className="text-sm font-bold text-slate-700">メールアドレス</p>
          <p className="text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            {email}
          </p>
          <p className="text-xs text-slate-400">
            メールアドレスの変更は現在未対応です
          </p>
        </section>

        <section className="space-y-2">
          <label
            htmlFor="display_name"
            className="block text-sm font-bold text-slate-700"
          >
            表示名（ニックネーム）
          </label>
          <input
            id="display_name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            placeholder="例：ママ、パパ、田中家 など"
            maxLength={30}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <p className="text-xs text-slate-400">
            マイページで「こんにちは、◯◯さん」と表示されます
          </p>
        </section>

        {saveError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}
        {saved && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            保存しました
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
        >
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </form>

      {/* パスワード変更 */}
      <div className="border-t border-slate-100 pt-6">
        <p className="text-sm font-bold text-slate-700 mb-4">パスワード変更</p>
        {isPasswordUser ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <section className="space-y-2">
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-slate-700"
              >
                新しいパスワード
              </label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPwSaved(false);
                  setPwError(null);
                }}
                placeholder="8文字以上"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </section>

            <section className="space-y-2">
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-slate-700"
              >
                新しいパスワード（確認）
              </label>
              <input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPwSaved(false);
                  setPwError(null);
                }}
                placeholder="もう一度入力"
                autoComplete="new-password"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </section>

            {pwError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {pwError}
              </p>
            )}
            {pwSaved && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                パスワードを変更しました
              </p>
            )}

            <button
              type="submit"
              disabled={pwSaving || !newPassword}
              className="w-full py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              {pwSaving ? "変更中..." : "パスワードを変更"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed">
            Google でログインしているため、メモリップ側ではパスワードを設定できません。パスワードの管理は Google アカウントの設定から行ってください。
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}
