import Link from "next/link";
import ChildAvatar from "@/components/ChildAvatar";
import type { FamilyStats } from "@/lib/mypage-stats";

type HeroChild = {
  id: string;
  anchorId: string;
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
    <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-brand/10 via-white to-accent/10 p-5 shadow-sm ring-1 ring-brand/15 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-wrap gap-2">
            {kids.map((child) => (
              <Link
                key={child.id}
                href={`#${child.anchorId}`}
                className="flex min-h-11 items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 shadow-sm ring-1 ring-brand/10 transition-all hover:-translate-y-0.5 hover:ring-brand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-slate-500 ring-1 ring-slate-200/80 transition-colors hover:bg-white hover:text-slate-700"
          aria-label="アカウント設定"
        >
          ⚙️
        </Link>
      </div>

      {isFirstRecord ? (
        <div className="mt-6">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand">OUR FAMILY</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">最初の1件を記録しましょう</h1>
          <p className="mt-1 text-sm text-slate-500">
            記録すると、家族のおでかけがここにたまっていきます
          </p>
          <Link
            href="/mypage/visits/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-dark"
          >
            ✏️ おでかけを記録する
          </Link>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-[10px] font-bold tracking-[0.18em] text-brand">OUR FAMILY</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">家族のおでかけ記録</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 tabular-nums sm:text-4xl">
            {stats.totalVisitCount}回
            <span className="mx-2 text-accent">·</span>
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
