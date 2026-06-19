"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import EventCard from "@/components/EventCard";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { EventPrefecture, EventView } from "@/lib/events";
import type { RecommendedForTag } from "@/types/facility";

interface PrefectureOption {
  id: EventPrefecture;
  name: string;
}

interface EventFilterBarProps {
  views: EventView[];
  prefectureOptions?: PrefectureOption[];
  showPrefectureFilter?: boolean;
  showPrefectureOnCard?: boolean;
}

type QuickFilter = "weekend" | "month" | "indoor" | "free" | "noReservation";

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "weekend", label: "今週末" },
  { key: "month", label: "今月" },
  { key: "indoor", label: "屋内" },
  { key: "free", label: "無料" },
  { key: "noReservation", label: "予約不要" },
];

export default function EventFilterBar({
  views,
  prefectureOptions = [],
  showPrefectureFilter = true,
  showPrefectureOnCard = true,
}: EventFilterBarProps) {
  const [selectedPrefectures, setSelectedPrefectures] = useState<
    EventPrefecture[]
  >([]);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    QuickFilter[]
  >([]);
  const [selectedRecommendedTags, setSelectedRecommendedTags] = useState<
    RecommendedForTag[]
  >([]);

  const availableRecommendedTags = useMemo(() => {
    const tags = new Set<RecommendedForTag>();
    for (const view of views) {
      for (const tag of view.event.recommended_for_tags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) =>
      RECOMMENDED_FOR_TAG_META[a].label.localeCompare(
        RECOMMENDED_FOR_TAG_META[b].label,
        "ja",
      ),
    );
  }, [views]);

  const filteredViews = useMemo(
    () =>
      views.filter((view) => {
        if (
          showPrefectureFilter &&
          selectedPrefectures.length > 0 &&
          !selectedPrefectures.includes(view.event.prefecture)
        ) {
          return false;
        }
        if (
          selectedRecommendedTags.length > 0 &&
          !selectedRecommendedTags.some((tag) =>
            view.event.recommended_for_tags.includes(tag),
          )
        ) {
          return false;
        }
        return selectedQuickFilters.every((filter) =>
          matchesQuickFilter(view, filter),
        );
      }),
    [
      selectedPrefectures,
      selectedQuickFilters,
      selectedRecommendedTags,
      showPrefectureFilter,
      views,
    ],
  );

  const hasActiveFilters =
    selectedPrefectures.length > 0 ||
    selectedQuickFilters.length > 0 ||
    selectedRecommendedTags.length > 0;

  return (
    <section aria-labelledby="event-list-heading">
      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="event-list-heading"
              className="text-xl font-bold text-slate-900"
            >
              開催中・これからのイベント
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              表示中 {filteredViews.length}件 / 全{views.length}件
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedPrefectures([]);
              setSelectedQuickFilters([]);
              setSelectedRecommendedTags([]);
            }}
            disabled={!hasActiveFilters}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            全解除
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {showPrefectureFilter && prefectureOptions.length > 0 ? (
            <FilterGroup label="都道府県">
              {prefectureOptions.map((prefecture) => (
                <FilterButton
                  key={prefecture.id}
                  active={selectedPrefectures.includes(prefecture.id)}
                  onClick={() =>
                    setSelectedPrefectures((current) =>
                      toggleValue(current, prefecture.id),
                    )
                  }
                >
                  {prefecture.name}
                </FilterButton>
              ))}
            </FilterGroup>
          ) : null}

          <FilterGroup label="条件">
            {QUICK_FILTERS.map((filter) => (
              <FilterButton
                key={filter.key}
                active={selectedQuickFilters.includes(filter.key)}
                onClick={() =>
                  setSelectedQuickFilters((current) =>
                    toggleValue(current, filter.key),
                  )
                }
              >
                {filter.label}
              </FilterButton>
            ))}
          </FilterGroup>

          {availableRecommendedTags.length > 0 ? (
            <FilterGroup label="好き">
              {availableRecommendedTags.map((tag) => {
                const meta = RECOMMENDED_FOR_TAG_META[tag];
                return (
                  <FilterButton
                    key={tag}
                    active={selectedRecommendedTags.includes(tag)}
                    onClick={() =>
                      setSelectedRecommendedTags((current) =>
                        toggleValue(current, tag),
                      )
                    }
                  >
                    {meta.icon} {meta.label}
                  </FilterButton>
                );
              })}
            </FilterGroup>
          ) : null}
        </div>
      </div>

      {filteredViews.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          条件に合うイベントはありません
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredViews.map((view) => (
            <EventCard
              key={view.event.id}
              view={view}
              showPrefecture={showPrefectureOnCard}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-bold text-white transition-colors"
          : "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
      }
    >
      {children}
    </button>
  );
}

function toggleValue<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function matchesQuickFilter(view: EventView, filter: QuickFilter): boolean {
  switch (filter) {
    case "weekend":
      return view.isThisWeekend;
    case "month":
      return view.isThisMonth;
    case "indoor":
      return view.event.is_indoor === true;
    case "free":
      return view.event.is_free === true;
    case "noReservation":
      return view.event.reservation === "not_required";
  }
}
