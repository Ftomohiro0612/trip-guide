"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SERVICE } from "@/lib/config";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // メール確認後に子どもプロフィール設定ページへ遷移
        emailRedirectTo: `${SERVICE.baseUrl}/auth/callback?next=/mypage`,
      },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setSent(true);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/mypage`,
      },
    });
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            確認メールを送りました
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            <strong>{email}</strong> に確認メールを送りました。
            <br />
            メール内のリンクをクリックして登録を完了してください。
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
          <div className="text-4xl mb-3">✨</div>
          <h1 className="text-2xl font-bold text-slate-900">新規登録</h1>
          <p className="text-slate-500 text-sm mt-1">メモリップ — おでかけ記録サービス</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          className="w-full py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 mb-2"
        >
          <GoogleIcon />
          Google で登録（かんたん）
        </button>

        <div className="mt-2 mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-amber-700">
            <span aria-hidden>ℹ️</span> お知らせ
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            Googleログイン時に{" "}
            <span className="font-mono break-all text-slate-700">
              ilhtklvdtbwdgntokhmh.supabase.co
            </span>{" "}
            と表示される場合があります。Supabaseはメモリップが利用している安全な認証サービスです。
          </p>
          <Image
            src="/images/supabase.png"
            alt="Googleログイン画面の例。「ilhtklvdtbwdgntokhmh.supabase.co に移動」と表示されます。"
            width={1624}
            height={968}
            className="mt-2 w-full h-auto rounded-md border border-amber-200/70"
          />
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">またはメールで登録</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              パスワード（8文字以上）
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="8文字以上"
            />
          </div>
          <div>
            <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-700 mb-1">
              パスワード（確認）
            </label>
            <input
              id="password-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="もう一度入力"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {loading ? "送信中..." : "確認メールを送る"}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-amber-700">
            <span aria-hidden>ℹ️</span> お知らせ
          </p>
          <p className="text-xs leading-relaxed text-slate-600">
            メールで登録すると、Supabase から確認メールが届きます。これはメモリップが利用している安全なサービスです。
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          登録することで
          <Link href="/terms" className="text-brand hover:underline mx-1">
            利用規約
          </Link>
          と
          <Link href="/privacy" className="text-brand hover:underline mx-1">
            プライバシーポリシー
          </Link>
          に同意したものとみなされます。
        </p>

        <p className="mt-6 text-center text-sm text-slate-500">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/auth/login" className="text-brand font-semibold hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
