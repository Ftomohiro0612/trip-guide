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
        aria-label="マイページ"
        className="rounded-lg bg-brand/10 px-2.5 py-1.5 text-sm font-medium text-brand sm:px-3"
      >
        👤 <span className="hidden md:inline">マイページ</span>
      </Link>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 sm:px-3 sm:text-sm"
    >
      ログイン
    </Link>
  );
}
