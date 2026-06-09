"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "../LogoutButton";

export default function AccountForm({
  email,
  initialDisplayName,
}: {
  email: string;
  initialDisplayName: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("ログインが必要です");
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
      setError(updateError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  return (
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

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
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

      <div className="pt-4 border-t border-slate-100">
        <LogoutButton />
      </div>
    </form>
  );
}
