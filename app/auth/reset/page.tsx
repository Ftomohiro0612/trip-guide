"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SERVICE } from "@/lib/config";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SERVICE.baseUrl}/auth/callback?next=/mypage/settings`,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            メールを送りました
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            <strong>{email}</strong> にパスワードリセット用のリンクを送りました。
            <br />
            メール内のリンクをクリックしてパスワードを再設定してください。
          </p>
          <p className="text-slate-400 text-xs">
            メールが届かない場合は迷惑メールフォルダをご確認ください。
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-block text-brand text-sm hover:underline"
          >
            ← ログインページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-slate-900">パスワードリセット</h1>
          <p className="text-slate-500 text-sm mt-2">
            登録したメールアドレスを入力してください。
            <br />
            パスワード再設定用のリンクをお送りします。
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? "送信中..." : "リセットメールを送る"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/auth/login" className="text-brand hover:underline">
            ← ログインページへ戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
