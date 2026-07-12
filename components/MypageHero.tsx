import Link from "next/link";
import ChildAvatar from "@/components/ChildAvatar";
import type { FamilyStats } from "@/lib/mypage-stats";

type HeroChild = {
  id: string;
  nickname: string;
  age: number;
  avatarUrl: string | null;
};

export default function MypageHero({
  kids,
  stats,
}: {
  kids: HeroChild[];
  stats: FamilyStats;
}) {
  const isFirstRecord = stats.totalVisitCount === 0 && kids.length > 0;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 ring-1 ring-sky-100 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            {kids.map((child) => (
              <Link
                key={child.id}
                href={`#child-achievement-${child.id}`}
                className="flex items-center gap-2 rounded-full border border-white bg-white/90 px-2.5 py-1 shadow-sm transition-colors hover:border-brand/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <ChildAvatar
                  childId={child.id}
                  nickname={child.nickname}
                  avatarUrl={child.avatarUrl}
                  size="sm"
                />
                <span className="text-sm font-medium text-slate-800">{child.nickname}</span>
                <span className="text-xs text-slate-400">{child.age}歳</span>
              </Link>
            ))}
          </div>
          {kids.length > 0 && (
            <Link
              href="/mypage/children"
              className="shrink-0 text-xs font-medium text-brand hover:underline"
            >
              編集
            </Link>
          )}
        </div>
        <Link
          href="/mypage/settings"
          className="shrink-0 p-1 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="アカウント設定"
        >
          ⚙️
        </Link>
      </div>

      {isFirstRecord ? (
        <div className="mt-4">
          <h1 className="text-xl font-bold text-slate-900">最初の1件を記録しましょう</h1>
          <p className="mt-1 text-sm text-slate-500">
            記録すると、家族のおでかけがここにたまっていきます
          </p>
          <Link
            href="/mypage/visits/new"
            className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            ✏️ おでかけを記録する
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-medium tracking-wide text-slate-400">おでかけ記録</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">
            {stats.totalVisitCount}回
            <span className="mx-2 text-slate-300">·</span>
            {stats.distinctFacilityCount}か所
          </h1>
          {stats.thisMonthRecordedCount > 0 ? (
            <p className="mt-2 text-sm font-semibold text-brand tabular-nums">
              今月の記録 +{stats.thisMonthRecordedCount}回
              {stats.thisMonthNewlyRecordedFacilityCount > 0 && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  新しく記録した場所 +{stats.thisMonthNewlyRecordedFacilityCount}
                </>
              )}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              おでかけを記録すると、ここに増えていきます
            </p>
          )}
        </div>
      )}
    </section>
  );
}
