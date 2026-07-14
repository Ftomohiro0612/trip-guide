"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import EventCard from "@/components/EventCard";
import {
  filterEventViews,
  paginateEventViews,
  type EventQuickFilter,
  type EventTypeFilterValue,
} from "@/lib/event-filter";
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
  showEventTypeFilter?: boolean;
}

const QUICK_FILTERS: { key: EventQuickFilter; label: string }[] = [
  { key: "weekend", label: "今週末" },
  { key: "month", label: "今月" },
  { key: "indoor", label: "屋内" },
  { key: "free", label: "無料" },
  { key: "noReservation", label: "予約不要" },
];

const EVENT_TYPE_FILTERS: {
  key: EventTypeFilterValue;
  label: string;
  icon: string;
}[] = [
  { key: "fireworks", label: "花火大会", icon: "🎆" },
  { key: "summer_festival", label: "夏祭り・盆踊り", icon: "🏮" },
  { key: "summer_tradition", label: "縁日・灯籠・風鈴", icon: "🎐" },
  { key: "night_outing", label: "夜のおでかけ", icon: "🌙" },
];

export default function EventFilterBar({
  views,
  prefectureOptions = [],
  showPrefectureFilter = true,
  showPrefectureOnCard = true,
  showEventTypeFilter = false,
}: EventFilterBarProps) {
  const eventListHeadingRef = useRef<HTMLHeadingElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventTypes, setSelectedEventTypes] = useState<
    EventTypeFilterValue[]
  >([]);
  const [selectedPrefectures, setSelectedPrefectures] = useState<
    EventPrefecture[]
  >([]);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    EventQuickFilter[]
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
      filterEventViews(
        views,
        {
          eventTypes: selectedEventTypes,
          prefectures: selectedPrefectures,
          quickFilters: selectedQuickFilters,
          recommendedTags: selectedRecommendedTags,
        },
        showPrefectureFilter,
      ),
    [
      selectedEventTypes,
      selectedPrefectures,
      selectedQuickFilters,
      selectedRecommendedTags,
      showPrefectureFilter,
      views,
    ],
  );

  const hasActiveFilters =
    selectedEventTypes.length > 0 ||
    selectedPrefectures.length > 0 ||
    selectedQuickFilters.length > 0 ||
    selectedRecommendedTags.length > 0;
  const page = useMemo(
    () => paginateEventViews(filteredViews, currentPage),
    [currentPage, filteredViews],
  );
  const countDenominator = hasActiveFilters ? "該当" : "全";

  function handlePageChange(nextPage: number) {
    const targetPage = Math.min(Math.max(nextPage, 1), page.totalPages);
    if (targetPage === page.currentPage) return;

    setCurrentPage(targetPage);
    window.requestAnimationFrame(() => {
      const heading = eventListHeadingRef.current;
      if (!heading) return;
      heading.focus({ preventScroll: true });
      const top = window.scrollY + heading.getBoundingClientRect().top - 72;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  return (
    <section aria-labelledby="event-list-heading">
      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="event-list-heading"
              ref={eventListHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold text-slate-900"
            >
              開催中・これからのイベント
            </h2>
            <p
              className="mt-1 text-sm text-slate-600"
              aria-live="polite"
              data-event-filter-count
            >
              {page.totalItems === 0
                ? "0件を表示"
                : `${page.startNumber}〜${page.endNumber}件を表示`} /{" "}
              {countDenominator}
              {page.totalItems}件
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentPage(1);
              setSelectedEventTypes([]);
              setSelectedPrefectures([]);
              setSelectedQuickFilters([]);
              setSelectedRecommendedTags([]);
            }}
            disabled={!hasActiveFilters}
            data-filter-clear
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            全解除
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {showPrefectureFilter && prefectureOptions.length > 0 ? (
            <FilterGroup label="都道府県" dataAttribute="prefecture">
              {prefectureOptions.map((prefecture) => (
                <FilterButton
                  key={prefecture.id}
                  active={selectedPrefectures.includes(prefecture.id)}
                  dataAttribute={`prefecture-${prefecture.id}`}
                  onClick={() => {
                    setCurrentPage(1);
                    setSelectedPrefectures((current) =>
                      toggleValue(current, prefecture.id),
                    );
                  }}
                >
                  {prefecture.name}
                </FilterButton>
              ))}
            </FilterGroup>
          ) : null}

          {showEventTypeFilter ? (
            <FilterGroup label="イベントの種類" dataAttribute="event-type">
              {EVENT_TYPE_FILTERS.map((type) => (
                <FilterButton
                  key={type.key}
                  active={selectedEventTypes.includes(type.key)}
                  dataAttribute={`event-type-${type.key}`}
                  onClick={() => {
                    setCurrentPage(1);
                    setSelectedEventTypes((current) =>
                      toggleValue(current, type.key),
                    );
                  }}
                >
                  <span aria-hidden>{type.icon}</span> {type.label}
                </FilterButton>
              ))}
            </FilterGroup>
          ) : null}

          <FilterGroup label="条件" dataAttribute="quick">
            {QUICK_FILTERS.map((filter) => (
              <FilterButton
                key={filter.key}
                active={selectedQuickFilters.includes(filter.key)}
                dataAttribute={`quick-${filter.key}`}
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedQuickFilters((current) =>
                    toggleValue(current, filter.key),
                  );
                }}
              >
                {filter.label}
              </FilterButton>
            ))}
          </FilterGroup>

          {availableRecommendedTags.length > 0 ? (
            <FilterGroup label="好き" dataAttribute="recommended">
              {availableRecommendedTags.map((tag) => {
                const meta = RECOMMENDED_FOR_TAG_META[tag];
                return (
                  <FilterButton
                    key={tag}
                    active={selectedRecommendedTags.includes(tag)}
                    dataAttribute={`recommended-${tag}`}
                    onClick={() => {
                      setCurrentPage(1);
                      setSelectedRecommendedTags((current) =>
                        toggleValue(current, tag),
                      );
                    }}
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
          {page.items.map((view) => (
            <EventCard
              key={view.event.id}
              view={view}
              showPrefecture={showPrefectureOnCard}
            />
          ))}
        </div>
      )}

      {page.totalPages > 1 ? (
        <nav
          aria-label="イベント一覧のページ"
          data-event-pagination
          className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:gap-5"
        >
          <button
            type="button"
            data-page-action="previous"
            disabled={!page.hasPreviousPage}
            onClick={() => handlePageChange(page.currentPage - 1)}
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            前へ
          </button>
          <p
            aria-live="polite"
            aria-atomic="true"
            aria-current="page"
            data-event-page
            className="min-w-24 text-center text-sm font-bold text-slate-700"
          >
            <span className="sr-only">現在 </span>
            {page.currentPage} / {page.totalPages}ページ
          </p>
          <button
            type="button"
            data-page-action="next"
            disabled={!page.hasNextPage}
            onClick={() => handlePageChange(page.currentPage + 1)}
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function FilterGroup({
  label,
  children,
  dataAttribute,
}: {
  label: string;
  children: ReactNode;
  dataAttribute?: string;
}) {
  return (
    <div data-filter-group={dataAttribute}>
      <p className="mb-2 text-xs font-bold text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
  dataAttribute,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dataAttribute?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-filter-control={dataAttribute}
      onClick={onClick}
      className={
        active
          ? "inline-flex min-h-11 items-center justify-center rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-bold text-white transition-colors"
          : "inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
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
