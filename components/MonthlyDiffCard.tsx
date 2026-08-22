import type { FamilyStats } from "@/lib/mypage-stats";

export default function MonthlyDiffCard({ stats }: { stats: FamilyStats }) {
  if (stats.totalVisitCount < 3 || stats.thisMonthRecordedCount === 0) return null;

  return (
    <section className="rounded-[1.75rem] bg-gradient-to-br from-success/15 via-white to-brand/10 p-5 shadow-sm ring-1 ring-success/20 sm:p-6">
      <p className="text-[10px] font-bold tracking-[0.16em] text-brand">THIS MONTH</p>
      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">今月の変化</h2>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm leading-relaxed text-slate-700">
        <p>
          今月は <strong className="tabular-nums">{stats.thisMonthRecordedCount}回</strong>{" "}
          記録しました
        </p>
        {stats.thisMonthNewlyRecordedFacilityCount > 0 && (
          <p>
            新しく記録した場所が{" "}
            <strong className="tabular-nums">
              {stats.thisMonthNewlyRecordedFacilityCount}か所
            </strong>{" "}
            増えました
          </p>
        )}
      </div>
    </section>
  );
}
