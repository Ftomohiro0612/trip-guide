import { NextResponse } from "next/server";
import { FALLBACK_AUTH_DEST, sanitizeAuthRedirect } from "@/lib/auth-dest";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = sanitizeAuthRedirect(url.searchParams.get("next"));

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

  const redirectUrl = new URL(next, url.origin);
  const safeRedirectUrl =
    redirectUrl.origin === url.origin
      ? redirectUrl
      : new URL(FALLBACK_AUTH_DEST, url.origin);

  return NextResponse.redirect(safeRedirectUrl);
}
