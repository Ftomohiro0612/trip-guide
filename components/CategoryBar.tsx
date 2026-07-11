export default function CategoryBar({ category, count, max }: { category: string; count: number; max: number }) {
  const pct = Math.round((count / Math.max(max, 1)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-700">{category}</span>
        <span className="font-medium tabular-nums text-slate-500">{count}回</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className="h-1.5 rounded-full bg-brand/70 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
