import type { Metadata } from "next";
import Link from "next/link";
import { prefectures } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";
import RecommendationPrefectureForm from "./RecommendationPrefectureForm";

export const metadata: Metadata = { title: "設定" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileResult, recommendationSettingsResult] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single(),
        supabase
          .from("mypage_recommendation_settings")
          .select("prefecture_ids")
          .eq("user_id", user.id)
          .maybeSingle(),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];
  const profile = profileResult.data;
  const knownPrefectureIds = new Set<string>(prefectures.map(({ id }) => id));
  const rawPrefectureIds = Array.isArray(
    recommendationSettingsResult.data?.prefecture_ids,
  )
    ? recommendationSettingsResult.data.prefecture_ids
    : [];
  const initialPrefectureIds = rawPrefectureIds.filter(
    (id): id is string => typeof id === "string" && knownPrefectureIds.has(id),
  );
  const recommendationSettingsAvailable =
    Boolean(user) && recommendationSettingsResult.error === null;

  const identities = (user?.identities ?? []) as { provider: string }[];
  const isPasswordUser = identities.some((i) => i.provider === "email");

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:py-8">
      <Link
        href="/mypage"
        className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-slate-500 transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        ← マイページ
      </Link>

      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
          FAMILY SETTINGS
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
          設定
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          家族のプロフィール、おすすめ地域、アカウントをそれぞれ管理できます。
        </p>
      </div>

      <section
        aria-labelledby="family-profile-heading"
        className="rounded-[1.75rem] bg-gradient-to-br from-brand/10 via-white to-accent/10 p-5 shadow-sm ring-1 ring-brand/15 sm:p-6"
      >
        <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
          OUR FAMILY
        </p>
        <h2
          id="family-profile-heading"
          className="mt-1 text-xl font-black tracking-tight text-slate-950"
        >
          家族プロフィール
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          子どものニックネーム・生年月・写真と、プロフィールの追加・削除を管理します。
        </p>
        <Link
          href="/mypage/children"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-between rounded-2xl bg-white/90 px-4 py-3 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-brand/15 transition-all hover:-translate-y-0.5 hover:text-brand hover:ring-brand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          子どもプロフィールを編集
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {recommendationSettingsAvailable ? (
        <RecommendationPrefectureForm
          options={prefectures.map(({ id, name }) => ({ id, name }))}
          initialPrefectureIds={initialPrefectureIds}
        />
      ) : (
        <section
          id="recommendation-prefectures"
          aria-labelledby="recommendation-prefectures-heading"
          className="scroll-mt-24 rounded-[1.75rem] bg-gradient-to-br from-accent/10 via-white to-brand/10 p-5 shadow-sm ring-1 ring-accent/20 sm:p-6"
        >
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
            NEXT OUTING
          </p>
          <h2
            id="recommendation-prefectures-heading"
            className="mt-1 text-xl font-black tracking-tight text-slate-950"
          >
            おすすめ地域
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            現在この設定は利用できません。時間をおいて再度お試しください。
          </p>
        </section>
      )}

      <section
        aria-labelledby="account-heading"
        className="rounded-[1.75rem] bg-gradient-to-br from-slate-100 via-white to-brand/5 p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6"
      >
        <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
          ACCOUNT
        </p>
        <h2
          id="account-heading"
          className="mt-1 text-xl font-black tracking-tight text-slate-950"
        >
          アカウント
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          メールアドレス、表示名、パスワードを管理します。
        </p>
        <div className="mt-6">
          <AccountForm
            email={user?.email ?? ""}
            initialDisplayName={profile?.display_name ?? ""}
            isPasswordUser={isPasswordUser}
          />
        </div>
      </section>
    </div>
  );
}
