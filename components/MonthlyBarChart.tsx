export type MonthData = {
  month: string;
  label: string;
  count: number;
  categories: { category: string; count: number }[];
};

const categoryColors: Record<string, string> = {
  "遊園地・テーマパーク": "bg-rose-400", 動物園: "bg-amber-400", 水族館: "bg-sky-400",
  "公園(大型遊具)": "bg-emerald-400", 屋内遊び場: "bg-violet-400", 科学館: "bg-cyan-400",
  博物館: "bg-orange-400", クラフト体験: "bg-pink-400", 味覚狩り: "bg-lime-400",
  温泉プール: "bg-teal-400", アスレチック: "bg-green-500", "美術館・体験": "bg-fuchsia-400",
  "スキー場・雪遊び": "bg-indigo-400", 体験: "bg-purple-400", ホテル: "bg-stone-400",
  "公園・自然": "bg-lime-600", 展望台: "bg-blue-400", "自然・絶景": "bg-emerald-600",
  屋内テーマパーク: "bg-red-500", ゲームセンター: "bg-yellow-400",
};

function categoryColor(category: string): string {
  return categoryColors[category] ?? "bg-slate-300";
}

function compareCategories(
  a: { category: string; count: number },
  b: { category: string; count: number },
): number {
  const aOther = a.category === "その他";
  const bOther = b.category === "その他";
  if (aOther !== bOther) return aOther ? 1 : -1;
  return b.count - a.count || a.category.localeCompare(b.category, "ja");
}

export default function MonthlyBarChart({ data }: { data: MonthData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const legendCategories = Array.from(
    data.flatMap((d) => d.categories).reduce((counts, { category, count }) => {
      counts.set(category, (counts.get(category) ?? 0) + count);
      return counts;
    }, new Map<string, number>()),
  ).map(([category, count]) => ({ category, count })).sort(compareCategories);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1" style={{ height: "64px" }}>
        {data.map(({ month, label, count, categories }) => {
          const barHeight = count > 0 ? Math.max(Math.round((count / max) * 44), 6) : 0;
          return (
            <div key={month} className="flex flex-1 flex-col items-center justify-end gap-0.5">
              {count > 0 && <span className="text-[10px] font-medium leading-none text-brand">{count}</span>}
              {count > 0 && (
                <div className="w-full overflow-hidden rounded-t" style={{ height: `${barHeight}px` }}>
                  <div className="flex h-full flex-col-reverse">
                    {categories.map(({ category, count: categoryCount }) => (
                      <div key={category} className={categoryColor(category)} style={{ height: `${Math.round((categoryCount / count) * barHeight)}px` }} title={`${category} ${categoryCount}回`} />
                    ))}
                  </div>
                </div>
              )}
              <span className="pt-0.5 text-[9px] leading-none text-slate-400">{label}</span>
            </div>
          );
        })}
      </div>
      {legendCategories.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {legendCategories.map(({ category }) => (
            <div key={category} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${categoryColor(category)}`} />
              <span className="text-[11px] text-slate-600">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
