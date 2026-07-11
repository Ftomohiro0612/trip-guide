import type { FamilyStats } from "@/lib/mypage-stats";

export default function MonthlyDiffCard({ stats }: { stats: FamilyStats }) {
  if (stats.totalVisitCount < 3 || stats.thisMonthRecordedCount === 0) return null;

  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
      <h2 className="text-xs font-bold text-emerald-800">今月の変化</h2>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-950">
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
