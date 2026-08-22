import type { Metadata } from "next";
import Link from "next/link";
import { prefectures } from "@/lib/facilities";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";
import RecommendationPrefectureForm from "./RecommendationPrefectureForm";

export const metadata: Metadata = { title: "アカウント設定" };

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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <Link
        href="/mypage"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← マイページ
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">アカウント設定</h1>
        <p className="text-sm text-slate-500 mt-1">
          {recommendationSettingsAvailable
            ? "おすすめ地域とプロフィール情報を管理します。"
            : "プロフィール情報を管理します。"}
        </p>
      </div>

      {recommendationSettingsAvailable && (
        <RecommendationPrefectureForm
          options={prefectures.map(({ id, name }) => ({ id, name }))}
          initialPrefectureIds={initialPrefectureIds}
        />
      )}

      <AccountForm
        email={user?.email ?? ""}
        initialDisplayName={profile?.display_name ?? ""}
        isPasswordUser={isPasswordUser}
      />
    </div>
  );
}
