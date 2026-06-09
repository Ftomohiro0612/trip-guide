import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/mypage";

  const supabase = await createClient();

  if (code) {
    // OAuth (Google) PKCE フロー
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    // メール確認リンクのフロー
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "recovery" | "email",
    });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
