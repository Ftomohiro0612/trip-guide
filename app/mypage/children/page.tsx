import type { Metadata } from "next";
import Link from "next/link";
import ChildAvatar from "@/components/ChildAvatar";
import type { ChildGrowthRecord } from "@/lib/child-growth";
import { createClient } from "@/lib/supabase/server";
import ChildAvatarUploader from "./ChildAvatarUploader";
import ChildGrowthRecorder from "./ChildGrowthRecorder";
import ChildrenForm from "./ChildrenForm";
import DeleteButton from "./DeleteButton";
import FirstMemoryActivationCard from "./FirstMemoryActivationCard";

export const metadata: Metadata = { title: "子どもプロフィール" };

type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  birth_month: number;
  gender: string | null;
  avatar_url: string | null;
};

function calcAge(birthYear: number, birthMonth: number): string {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (today.getMonth() + 1 < birthMonth) age -= 1;
  if (age < 0) return "0歳";
  return `${age}歳`;
}

function genderLabel(gender: string | null): string {
  if (gender === "male") return "男の子";
  if (gender === "female") return "女の子";
  if (gender === "other") return "その他";
  return "";
}

export default async function ChildrenPage() {
  const supabase = await createClient();
  const [{ data: children }, { count: publishedVisitCount }] = await Promise.all([
    supabase
      .from("children")
      .select("id, nickname, birth_year, birth_month, gender, avatar_url")
      .order("sort_order", { ascending: true }),
    supabase
      .from("visits")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);
  const childRows = (children ?? []) as Child[];
  const childIds = childRows.map((child) => child.id);
  const { data: growthRecords } =
    childIds.length > 0
      ? await supabase
          .from("child_growth_records")
          .select("id, child_id, recorded_on, height_cm, created_at")
          .in("child_id", childIds)
          .order("recorded_on", { ascending: false })
          .order("created_at", { ascending: false })
      : { data: [] };
  const growthRows = (growthRecords ?? []) as ChildGrowthRecord[];
  const avatarPaths = childRows
    .map((child) => child.avatar_url)
    .filter((path): path is string => Boolean(path));
  const { data: signedAvatars } =
    avatarPaths.length > 0
      ? await supabase.storage
          .from("child-avatars")
          .createSignedUrls(avatarPaths, 60 * 60)
      : { data: [] };
  const avatarUrlByPath = new Map(
    (signedAvatars ?? []).map((row) => [row.path, row.signedUrl]),
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-slate-400 hover:text-slate-600 transition-colors">
          ← マイページ
        </Link>
      </div>

      <h1 className="text-xl font-bold text-slate-900">子どもプロフィール</h1>

      <p className="text-slate-500 text-sm leading-relaxed">
        ニックネームと生年月を登録することで、おでかけ記録に「当時の年齢」が自動で記録されます。
        本名・学校名は不要です。
      </p>

      {/* 子ども一覧 */}
      <div className="space-y-3">
        {childRows.length > 0 ? (
          childRows.map((child) => {
            const avatarUrl = child.avatar_url
              ? avatarUrlByPath.get(child.avatar_url) ?? null
              : null;
            return (
            <div
              key={child.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ChildAvatar
                    childId={child.id}
                    nickname={child.nickname}
                    avatarUrl={avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {child.nickname}
                    </p>
                    <p className="text-xs text-slate-400">
                      {child.birth_year}年{child.birth_month}月生まれ
                      {" · "}
                      {calcAge(child.birth_year, child.birth_month)}
                      {child.gender ? ` · ${genderLabel(child.gender)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/mypage/children/${child.id}`}
                    className="inline-flex min-h-9 items-center rounded-lg bg-amber-50 px-2.5 text-xs font-bold text-amber-700 ring-1 ring-amber-100 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    ページを見る
                  </Link>
                  <DeleteButton childId={child.id} nickname={child.nickname} />
                </div>
              </div>
              <ChildAvatarUploader
                childId={child.id}
                nickname={child.nickname}
                avatarUrl={avatarUrl}
              />
              <ChildGrowthRecorder
                childId={child.id}
                nickname={child.nickname}
                initialRecords={growthRows
                  .filter((record) => record.child_id === child.id)
                  .slice(0, 10)}
              />
            </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            まだ登録されていません
          </div>
        )}
      </div>

      {/* 追加フォーム（最大5人まで） */}
      {childRows.length < 5 && <ChildrenForm />}
      {childRows.length >= 5 && (
        <p className="text-xs text-slate-400 text-center">
          現在、最大5人まで登録できます
        </p>
      )}

      {/* 最初の記録へ進む */}
      {childRows.length > 0 && (
        <div className="pt-2">
          {(publishedVisitCount ?? 0) === 0 ? (
            <FirstMemoryActivationCard />
          ) : (
            <Link
              href="/mypage"
              className="block w-full text-center py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors"
            >
              マイページへ進む →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
