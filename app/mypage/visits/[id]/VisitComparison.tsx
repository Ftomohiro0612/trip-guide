import {
  formatVisitDuration,
  visitGapInDays,
} from "@/lib/visit-comparison";
import {
  crowdingLabels,
  familyRevisitLabels,
  fatigueLabels,
  satisfactionLabels,
  visitLabel,
} from "@/lib/visit-labels";
import {
  getVisitChildProfile,
  getVisitChildReactionTags,
  visitChildAgeLabel,
  type VisitChildCardData,
  type VisitChildReactionTag,
} from "./VisitChildCard";

export type ComparisonVisit = {
  id: string;
  visited_on: string | null;
  created_at: string | null;
  family_revisit: string | null;
  parent_fatigue: string | null;
  stay_duration_min: number | null;
  crowding: string | null;
};

function formatVisitedOn(value: string | null): string {
  return value ? value.replaceAll("-", "/") : "日付未設定";
}

function ComparisonPair({
  label,
  previous,
  current,
}: {
  label: string;
  previous: string;
  current: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
        <div className="min-w-0">
          <span className="block text-xs text-slate-400">前回</span>
          <span className="mt-0.5 block break-words font-medium text-slate-700">
            {previous}
          </span>
        </div>
        <span aria-hidden className="text-slate-300">
          →
        </span>
        <div className="min-w-0">
          <span className="block text-xs text-slate-400">今回</span>
          <span className="mt-0.5 block break-words font-medium text-slate-900">
            {current}
          </span>
        </div>
      </dd>
    </div>
  );
}

function ReactionTags({ tags }: { tags: VisitChildReactionTag[] }) {
  if (tags.length === 0) return <span className="text-slate-500">未記録</span>;

  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
        >
          <span aria-hidden>{tag.icon}</span>
          {tag.label}
        </span>
      ))}
    </span>
  );
}

function ChildValue({
  row,
  visitedOn,
}: {
  row: VisitChildCardData | null;
  visitedOn: string | null;
}) {
  if (!row) return <p className="text-sm text-slate-500">記録なし</p>;

  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="text-xs text-slate-400">訪問時年齢</dt>
        <dd className="font-medium text-slate-700">
          {visitChildAgeLabel(row, visitedOn)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-400">満足度</dt>
        <dd className="font-medium text-slate-700">
          {visitLabel(satisfactionLabels, row.satisfaction)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-slate-400">反応</dt>
        <dd className="mt-1">
          <ReactionTags tags={getVisitChildReactionTags(row)} />
        </dd>
      </div>
    </dl>
  );
}

function ChildComparison({
  previousRow,
  currentRow,
  previousVisitedOn,
  currentVisitedOn,
}: {
  previousRow: VisitChildCardData | null;
  currentRow: VisitChildCardData | null;
  previousVisitedOn: string | null;
  currentVisitedOn: string | null;
}) {
  const child = getVisitChildProfile(
    currentRow?.children ?? previousRow?.children ?? null,
  );
  if (!child) return null;

  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <h3 className="font-bold text-slate-800">{child.nickname}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0 border-r border-slate-100 pr-3">
          <p className="mb-2 text-xs font-bold text-slate-400">前回</p>
          <ChildValue row={previousRow} visitedOn={previousVisitedOn} />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold text-slate-400">今回</p>
          <ChildValue row={currentRow} visitedOn={currentVisitedOn} />
        </div>
      </div>
    </article>
  );
}

export function VisitComparison({
  previousVisit,
  currentVisit,
  previousChildren,
  currentChildren,
}: {
  previousVisit: ComparisonVisit;
  currentVisit: ComparisonVisit;
  previousChildren: VisitChildCardData[];
  currentChildren: VisitChildCardData[];
}) {
  const previousChildById = new Map(
    previousChildren.map((row) => [row.child_id, row]),
  );
  const currentChildById = new Map(
    currentChildren.map((row) => [row.child_id, row]),
  );
  const childIds = [
    ...currentChildren.map((row) => row.child_id),
    ...previousChildren
      .filter((row) => !currentChildById.has(row.child_id))
      .map((row) => row.child_id),
  ];
  const gapInDays = visitGapInDays(
    previousVisit.visited_on,
    currentVisit.visited_on,
  );

  return (
    <section
      aria-labelledby="previous-visit-comparison"
      className="space-y-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
    >
      <div className="space-y-1">
        <h2
          id="previous-visit-comparison"
          className="font-bold text-slate-800"
        >
          前回との比較
        </h2>
        <p className="text-sm text-slate-500">
          前回 {formatVisitedOn(previousVisit.visited_on)} → 今回{" "}
          {formatVisitedOn(currentVisit.visited_on)}
        </p>
        {gapInDays !== null && (
          <p className="text-xs font-medium text-slate-500">
            訪問間隔: {gapInDays === 0 ? "同日" : `${gapInDays}日`}
          </p>
        )}
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <ComparisonPair
          label="また行きたいか"
          previous={visitLabel(
            familyRevisitLabels,
            previousVisit.family_revisit,
          )}
          current={visitLabel(familyRevisitLabels, currentVisit.family_revisit)}
        />
        <ComparisonPair
          label="親の疲れ度"
          previous={visitLabel(fatigueLabels, previousVisit.parent_fatigue)}
          current={visitLabel(fatigueLabels, currentVisit.parent_fatigue)}
        />
        <ComparisonPair
          label="滞在時間"
          previous={formatVisitDuration(previousVisit.stay_duration_min)}
          current={formatVisitDuration(currentVisit.stay_duration_min)}
        />
        <ComparisonPair
          label="混雑"
          previous={visitLabel(crowdingLabels, previousVisit.crowding)}
          current={visitLabel(crowdingLabels, currentVisit.crowding)}
        />
      </dl>

      {childIds.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-slate-700">子どもごとの記録</h3>
          {childIds.map((childId) => (
            <ChildComparison
              key={childId}
              previousRow={previousChildById.get(childId) ?? null}
              currentRow={currentChildById.get(childId) ?? null}
              previousVisitedOn={previousVisit.visited_on}
              currentVisitedOn={currentVisit.visited_on}
            />
          ))}
        </div>
      )}
    </section>
  );
}
