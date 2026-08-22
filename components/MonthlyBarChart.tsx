export type MonthData = {
  month: string;
  label: string;
  count: number;
  categories: { category: string; count: number }[];
};

const categoryTones = [
  "bg-brand",
  "bg-accent",
  "bg-success",
  "bg-brand/60",
  "bg-accent/65",
  "bg-success/65",
  "bg-slate-400",
];

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
  const toneByCategory = new Map(
    legendCategories.map(({ category }, index) => [
      category,
      categoryTones[index % categoryTones.length],
    ]),
  );
  const categoryTone = (category: string) =>
    toneByCategory.get(category) ?? "bg-slate-400";
  const chartLabel = data
    .map(({ label, count }) => `${label}${count}回`)
    .join("、");

  return (
    <div className="space-y-3">
      <div
        className="flex h-20 items-end gap-1.5"
        role="img"
        aria-label={`最近6ヶ月のおでかけ回数: ${chartLabel}`}
      >
        {data.map(({ month, label, count, categories }) => {
          const barHeight = count > 0 ? Math.max(Math.round((count / max) * 52), 7) : 0;
          return (
            <div key={month} className="flex flex-1 flex-col items-center justify-end gap-0.5">
              {count > 0 && <span className="text-[10px] font-bold leading-none text-slate-600">{count}</span>}
              {count > 0 && (
                <div className="w-full overflow-hidden rounded-t-lg" style={{ height: `${barHeight}px` }}>
                  <div className="flex h-full flex-col-reverse">
                    {categories.map(({ category, count: categoryCount }) => (
                      <div
                        key={category}
                        className={categoryTone(category)}
                        style={{ height: `${Math.round((categoryCount / count) * barHeight)}px` }}
                        title={`${category} ${categoryCount}回`}
                      />
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
              <span className={`h-2.5 w-2.5 rounded-full ${categoryTone(category)}`} aria-hidden="true" />
              <span className="text-[11px] text-slate-600">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
