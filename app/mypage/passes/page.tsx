import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  PASS_BADGE_CLASS,
  formatPassDateJa,
  passStatus,
} from "@/lib/annual-pass";
import DeletePassButton from "./DeletePassButton";

export const metadata: Metadata = {
  title: "年パス管理 | マイページ",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

type PassRow = {
  id: string;
  facility_slug: string;
  facility_name: string;
  expires_on: string;
  holder_note: string | null;
};

function isPassRow(row: unknown): row is PassRow {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.facility_slug === "string" &&
    typeof r.facility_name === "string" &&
    typeof r.expires_on === "string" &&
    (typeof r.holder_note === "string" || r.holder_note === null)
  );
}

export default async function AnnualPassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/mypage/passes");
  }

  const { data } = await supabase
    .from("annual_passes")
    .select("id, facility_slug, facility_name, expires_on, holder_note")
    .eq("user_id", user.id)
    .order("expires_on", { ascending: true });

  const passes = (data ?? []).filter(isPassRow);

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
        <Link href="/mypage" className="hover:text-brand">
          マイページ
        </Link>
        <span className="mx-1.5">/</span>
        <span>年パス管理</span>
      </nav>

      <h1 className="text-xl font-bold text-slate-900">🎫 年パス管理</h1>
      <p className="mt-1 text-sm text-slate-500">
        家族の年間パスポートの有効期限をまとめて管理できます。
      </p>

      {passes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-3xl" aria-hidden>
            🎫
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            まだ年パスの登録がありません
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            施設ページの「年パスを持っている方はこちら」から登録すると、有効期限がここに並び、期限が近づくとマイページでお知らせします。
          </p>
          <Link
            href="/facilities"
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            施設をさがす →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {passes.map((pass) => {
            const status = passStatus(pass.expires_on);
            return (
              <li
                key={pass.id}
                className={`rounded-xl border p-4 ${
                  status.tone === "expired"
                    ? "border-red-200 bg-red-50/60"
                    : status.tone === "soon"
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/facilities/${pass.facility_slug}`}
                    className="min-w-0 font-bold text-slate-900 hover:text-brand hover:underline"
                  >
                    {pass.facility_name}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${PASS_BADGE_CLASS[status.tone]}`}
                  >
                    {status.label}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  有効期限: <strong>{formatPassDateJa(pass.expires_on)}</strong>
                  {pass.holder_note && (
                    <span className="ml-2 text-xs text-slate-500">
                      対象: {pass.holder_note}
                    </span>
                  )}
                </p>
                {status.tone === "soon" && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-700">
                    もうすぐ期限です。行くなら今のうち！更新したら施設ページから期限を編集できます。
                  </p>
                )}
                {status.tone === "expired" && (
                  <p className="mt-1.5 text-xs text-red-600">
                    期限が切れています。更新した場合は施設ページから新しい期限を登録してください。
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-3">
                  <Link
                    href={`/facilities/${pass.facility_slug}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    施設ページで編集 →
                  </Link>
                  <DeletePassButton passId={pass.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
