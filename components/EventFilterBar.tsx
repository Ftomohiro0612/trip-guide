"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EventCard from "@/components/EventCard";
import EventDateReservationFilters from "@/components/EventDateReservationFilters";
import { useTokyoToday } from "@/components/useTokyoToday";
import { refreshEventViewsForDate } from "@/lib/event-dates";
import {
  EVENT_DISCOVERY_TYPE_LABELS,
  getEventAnchorId,
  type EventDiscoveryType,
} from "@/lib/event-discovery";
import {
  filterEventViews,
  getDateOnlyInTimeZone,
  paginateEventViews,
  type EventDatePreset,
  type EventDateRange,
  type EventQuickFilter,
  type EventReservationFilter,
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
  maxAgeDays: number;
  referenceDate: string;
}

const QUICK_FILTERS: { key: EventQuickFilter; label: string }[] = [
  { key: "indoor", label: "屋内" },
  { key: "free", label: "無料" },
];

const DISCOVERY_TYPES = Object.entries(EVENT_DISCOVERY_TYPE_LABELS) as [
  EventDiscoveryType,
  string,
][];

export default function EventFilterBar({
  views,
  prefectureOptions = [],
  showPrefectureFilter = true,
  showPrefectureOnCard = true,
  maxAgeDays,
  referenceDate,
}: EventFilterBarProps) {
  const today = useTokyoToday();
  const eventListHeadingRef = useRef<HTMLHeadingElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [selectedDiscoveryTypes, setSelectedDiscoveryTypes] = useState<
    EventDiscoveryType[]
  >([]);
  const [selectedPrefectures, setSelectedPrefectures] = useState<
    EventPrefecture[]
  >([]);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    EventQuickFilter[]
  >([]);
  const [dateRange, setDateRange] = useState<EventDateRange>({
    startDate: "",
    endDate: "",
  });
  const [datePreset, setDatePreset] = useState<EventDatePreset | null>(null);
  const [datePresetReferenceDate, setDatePresetReferenceDate] =
    useState<string | null>(null);
  const [reservation, setReservation] =
    useState<EventReservationFilter | null>(null);
  const [selectedRecommendedTags, setSelectedRecommendedTags] = useState<
    RecommendedForTag[]
  >([]);

  const currentViews = useMemo(
    () => (today ? refreshEventViewsForDate(views, today, maxAgeDays) : views),
    [maxAgeDays, today, views],
  );

  useEffect(() => {
    function readUrlState() {
      const url = new URL(window.location.href);
      setKeyword(url.searchParams.get("q") ?? "");
      setFocusedEventId(url.searchParams.get("event"));
      if (url.searchParams.has("type")) {
        url.searchParams.delete("type");
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
      }
    }

    readUrlState();
    window.addEventListener("popstate", readUrlState);
    return () => window.removeEventListener("popstate", readUrlState);
  }, []);

  const availableRecommendedTags = useMemo(() => {
    const tags = new Set<RecommendedForTag>();
    for (const view of currentViews) {
      for (const tag of view.event.recommended_for_tags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) =>
      RECOMMENDED_FOR_TAG_META[a].label.localeCompare(
        RECOMMENDED_FOR_TAG_META[b].label,
        "ja",
      ),
    );
  }, [currentViews]);

  const filteredViews = useMemo(() => {
    const filtered = filterEventViews(
      currentViews,
      {
        discoveryTypes: selectedDiscoveryTypes,
        eventTypes: [],
        keyword,
        prefectures: selectedPrefectures,
        quickFilters: selectedQuickFilters,
        recommendedTags: selectedRecommendedTags,
        dateRange,
        datePreset,
        referenceDate: datePresetReferenceDate ?? today ?? referenceDate,
        reservation,
      },
      showPrefectureFilter,
    );
    if (!focusedEventId) return filtered;
    return [...filtered].sort(
      (a, b) =>
        Number(b.event.id === focusedEventId) -
        Number(a.event.id === focusedEventId),
    );
  }, [
    currentViews,
    datePreset,
    datePresetReferenceDate,
    dateRange,
    focusedEventId,
    keyword,
    referenceDate,
    reservation,
    selectedDiscoveryTypes,
    selectedPrefectures,
    selectedQuickFilters,
    selectedRecommendedTags,
    showPrefectureFilter,
    today,
  ]);

  const hasActiveFilters =
    keyword.trim().length > 0 ||
    selectedDiscoveryTypes.length > 0 ||
    selectedPrefectures.length > 0 ||
    selectedQuickFilters.length > 0 ||
    selectedRecommendedTags.length > 0 ||
    Boolean(dateRange.startDate || dateRange.endDate || datePreset) ||
    reservation !== null;
  const page = useMemo(
    () => paginateEventViews(filteredViews, currentPage),
    [currentPage, filteredViews],
  );
  const countDenominator = hasActiveFilters ? "該当" : "全";

  useEffect(() => {
    if (!today || !focusedEventId) return;
    const anchorId = getEventAnchorId(focusedEventId);
    window.requestAnimationFrame(() => {
      document.getElementById(anchorId)?.scrollIntoView({ block: "start" });
    });
  }, [focusedEventId, today]);

  function updateKeyword(nextKeyword: string) {
    setCurrentPage(1);
    setKeyword(nextKeyword);
    const url = new URL(window.location.href);
    if (nextKeyword.trim()) url.searchParams.set("q", nextKeyword);
    else url.searchParams.delete("q");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function clearFilters() {
    setCurrentPage(1);
    setKeyword("");
    setSelectedDiscoveryTypes([]);
    setSelectedPrefectures([]);
    setSelectedQuickFilters([]);
    setSelectedRecommendedTags([]);
    setDateRange({ startDate: "", endDate: "" });
    setDatePreset(null);
    setDatePresetReferenceDate(null);
    setReservation(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function handlePageChange(nextPage: number) {
    const targetPage = Math.min(Math.max(nextPage, 1), page.totalPages);
    if (targetPage === page.currentPage) return;
    setCurrentPage(targetPage);
    window.requestAnimationFrame(() => {
      const heading = eventListHeadingRef.current;
      if (!heading) return;
      heading.focus({ preventScroll: true });
      const stickyHeaderHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 64;
      const top =
        window.scrollY + heading.getBoundingClientRect().top - stickyHeaderHeight - 16;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }

  return (
    <section
      aria-labelledby="event-list-heading"
      aria-hidden={today ? undefined : true}
      hidden={!today}
      data-access-date={today ?? undefined}
    >
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">
            キーワード
            <input
              type="search"
              value={keyword}
              onChange={(event) => updateKeyword(event.target.value)}
              placeholder="秋祭り、恐竜、プラネタリウム…"
              data-event-keyword
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-base font-normal text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            data-filter-clear
            className="min-h-11 shrink-0 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            全解除
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {showPrefectureFilter && prefectureOptions.length > 0 ? (
            <label className="text-xs font-bold text-slate-600">
              エリア
              <select
                value={selectedPrefectures[0] ?? ""}
                onChange={(event) => {
                  setCurrentPage(1);
                  setSelectedPrefectures(
                    event.target.value
                      ? [event.target.value as EventPrefecture]
                      : [],
                  );
                }}
                data-filter-select="prefecture"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-900"
              >
                <option value="">全国</option>
                {prefectureOptions.map((prefecture) => (
                  <option key={prefecture.id} value={prefecture.id}>
                    {prefecture.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="text-xs font-bold text-slate-600">
            イベント種別
            <select
              value={selectedDiscoveryTypes[0] ?? ""}
              onChange={(event) => {
                setCurrentPage(1);
                setSelectedDiscoveryTypes(
                  event.target.value
                    ? [event.target.value as EventDiscoveryType]
                    : [],
                );
              }}
              data-filter-select="event-type"
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm font-normal text-slate-900"
            >
              <option value="">すべて</option>
              {DISCOVERY_TYPES.map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["weekend", "month"] as EventDatePreset[]).map((preset) => (
            <FilterButton
              key={preset}
              active={datePreset === preset}
              dataAttribute={`date-${preset}`}
              onClick={() => {
                setCurrentPage(1);
                setDateRange({ startDate: "", endDate: "" });
                setDatePresetReferenceDate(
                  getDateOnlyInTimeZone(new Date(), "Asia/Tokyo"),
                );
                setDatePreset(datePreset === preset ? null : preset);
              }}
            >
              {preset === "weekend" ? "今週末" : "今月"}
            </FilterButton>
          ))}
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
        </div>

        <details className="mt-3 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">
            日付・予約・「好き」の詳しい条件
          </summary>
          <div className="mt-4 grid gap-4">
            <EventDateReservationFilters
              dateRange={dateRange}
              datePreset={datePreset}
              reservation={reservation}
              onDateRangeChange={(range) => {
                setCurrentPage(1);
                setDateRange(range);
              }}
              onDatePresetChange={(preset) => {
                setCurrentPage(1);
                if (preset) {
                  setDatePresetReferenceDate(
                    getDateOnlyInTimeZone(new Date(), "Asia/Tokyo"),
                  );
                }
                setDatePreset(preset);
              }}
              onReservationChange={(nextReservation) => {
                setCurrentPage(1);
                setReservation(nextReservation);
              }}
            />
            {availableRecommendedTags.length > 0 ? (
              <div data-filter-group="recommended">
                <p className="mb-2 text-xs font-bold text-slate-500">好き</p>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            ) : null}
          </div>
        </details>
      </div>

      <div className="mb-4 flex items-end justify-between gap-3">
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
              : `${page.startNumber}〜${page.endNumber}件を表示`} / {countDenominator}
            {page.totalItems}件
          </p>
        </div>
      </div>

      {filteredViews.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          <p className="font-bold text-slate-800">条件に合うイベントはありません。</p>
          <p className="mt-2">キーワードや日付、エリアなどの条件を変更してください。</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {page.items.map((view) => (
            <EventCard
              key={view.event.id}
              view={view}
              showPrefecture={showPrefectureOnCard}
              anchorId={getEventAnchorId(view.event.id)}
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
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            前へ
          </button>
          <p aria-live="polite" aria-current="page" data-event-page className="min-w-24 text-center text-sm font-bold text-slate-700">
            <span className="sr-only">現在 </span>
            {page.currentPage} / {page.totalPages}ページ
          </p>
          <button
            type="button"
            data-page-action="next"
            disabled={!page.hasNextPage}
            onClick={() => handlePageChange(page.currentPage + 1)}
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </nav>
      ) : null}
    </section>
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
  children: React.ReactNode;
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
          ? "inline-flex min-h-10 items-center justify-center rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-bold text-white"
          : "inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:border-brand hover:text-brand"
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
