"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthState = "loading" | "guest" | "authenticated";

export default function HeaderAuthButton() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setAuthState(user ? "authenticated" : "guest");
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (authState === "loading") return null;

  if (authState === "authenticated") {
    return (
      <Link
        href="/mypage"
        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-brand/10 text-brand"
      >
        👤 マイページ
      </Link>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
    >
      ログイン
    </Link>
  );
}
