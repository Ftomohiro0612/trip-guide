"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import EventCard from "@/components/EventCard";
import {
  EVENT_PAGE_SIZE,
  paginateEventViews,
} from "@/lib/event-filter";
import type {
  EventPrefecture,
  EventView,
  SummerEventType,
} from "@/lib/events";
import { getSummerEventAnchorId } from "@/lib/summer-event-hub";
import {
  getSummerEventIdFromHash,
  getSummerEventPageForHash,
  getSummerStaticAnchorTargetId,
  getSummerEventTypePage,
} from "@/lib/summer-event-pagination";

type QuickFilter = "weekend" | "free" | "noReservation";

interface SummerEventExplorerProps {
  views: EventView[];
  initialType?: SummerEventType;
  initialQuickFilter?: QuickFilter;
}

interface SummerAnchorTarget {
  elementId: string;
  page: number;
}

const PREFECTURES: { id: EventPrefecture; label: string }[] = [
  { id: "tokyo", label: "東京" },
  { id: "kanagawa", label: "神奈川" },
  { id: "chiba", label: "千葉" },
  { id: "saitama", label: "埼玉" },
  { id: "yamanashi", label: "山梨" },
  { id: "shizuoka", label: "静岡" },
  { id: "nagano", label: "長野" },
  { id: "ibaraki", label: "茨城" },
  { id: "tochigi", label: "栃木" },
  { id: "gunma", label: "群馬" },
  { id: "niigata", label: "新潟" },
  { id: "aichi", label: "愛知" },
  { id: "kyoto", label: "京都" },
  { id: "osaka", label: "大阪" },
  { id: "hyogo", label: "兵庫" },
  { id: "hiroshima", label: "広島" },
  { id: "fukuoka", label: "福岡" },
  { id: "okayama", label: "岡山" },
  { id: "kagawa", label: "香川" },
  { id: "kumamoto", label: "熊本" },
  { id: "nagasaki", label: "長崎" },
  { id: "oita", label: "大分" },
  { id: "kagoshima", label: "鹿児島" },
  { id: "saga", label: "佐賀" },
  { id: "miyazaki", label: "宮崎" },
  { id: "ehime", label: "愛媛" },
  { id: "tokushima", label: "徳島" },
  { id: "kochi", label: "高知" },
  { id: "hokkaido", label: "北海道" },
  { id: "aomori", label: "青森" },
  { id: "akita", label: "秋田" },
  { id: "miyagi", label: "宮城" },
  { id: "iwate", label: "岩手" },
  { id: "yamagata", label: "山形" },
  { id: "fukushima", label: "福島" },
  { id: "mie", label: "三重" },
  { id: "gifu", label: "岐阜" },
  { id: "toyama", label: "富山" },
  { id: "ishikawa", label: "石川" },
  { id: "fukui", label: "福井" },
  { id: "shiga", label: "滋賀" },
  { id: "nara", label: "奈良" },
  { id: "wakayama", label: "和歌山" },
  { id: "tottori", label: "鳥取" },
  { id: "shimane", label: "島根" },
  { id: "yamaguchi", label: "山口" },
  { id: "okinawa", label: "沖縄" },
];

const EVENT_TYPES: {
  id: SummerEventType;
  label: string;
  heading: string;
  description: string;
}[] = [
  {
    id: "fireworks",
    label: "花火大会",
    heading: "花火大会",
    description: "実際の屋外打上花火を主目的、または主プログラムとする催しです。",
  },
  {
    id: "summer_festival",
    label: "夏祭り・盆踊り",
    heading: "夏祭り・盆踊り",
    description: "地域の祭礼、盆踊り、七夕、阿波踊りなどを掲載しています。",
  },
  {
    id: "summer_tradition",
    label: "縁日・灯籠・風鈴",
    heading: "縁日・灯籠・風鈴",
    description: "灯籠や風鈴など、夏の伝統的な風景を楽しむ催しです。",
  },
  {
    id: "night_outing",
    label: "夜のおでかけ",
    heading: "夜のおでかけ",
    description:
      "動物園・水族館などの夜間開園です。花火大会・夏祭りとは別の補助枠として掲載しています。",
  },
];

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "weekend", label: "今週末" },
  { id: "free", label: "無料" },
  { id: "noReservation", label: "予約不要" },
];

export default function SummerEventExplorer({
  views,
  initialType,
  initialQuickFilter,
}: SummerEventExplorerProps) {
  const eventListHeadingRef = useRef<HTMLHeadingElement>(null);
  const filteredViewsRef = useRef<EventView[]>([]);
  const allOrderedViewsRef = useRef<EventView[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<SummerEventType[]>(
    initialType ? [initialType] : [],
  );
  const [selectedPrefectures, setSelectedPrefectures] = useState<
    EventPrefecture[]
  >([]);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    QuickFilter[]
  >(initialQuickFilter ? [initialQuickFilter] : []);

  const filteredViews = useMemo(
    () =>
      views.filter((view) => {
        const type = view.event.event_type;
        if (!type) return false;
        if (selectedTypes.length > 0 && !selectedTypes.includes(type)) {
          return false;
        }
        if (
          selectedPrefectures.length > 0 &&
          !selectedPrefectures.includes(view.event.prefecture)
        ) {
          return false;
        }
        return selectedQuickFilters.every((filter) =>
          matchesQuickFilter(view, filter),
        );
      }),
    [selectedPrefectures, selectedQuickFilters, selectedTypes, views],
  );
  const allOrderedViews = useMemo(
    () => orderViewsByEventType(views),
    [views],
  );
  const orderedFilteredViews = useMemo(
    () => orderViewsByEventType(filteredViews),
    [filteredViews],
  );
  const page = useMemo(
    () => paginateEventViews(orderedFilteredViews, currentPage),
    [currentPage, orderedFilteredViews],
  );

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedPrefectures.length > 0 ||
    selectedQuickFilters.length > 0;

  const revealHashTarget = useCallback((hash: string) => {
    const staticTargetId = getSummerStaticAnchorTargetId(hash);
    if (staticTargetId) {
      setPendingFocusId(staticTargetId);
      return;
    }

    let target = resolveSummerAnchorTarget(
      filteredViewsRef.current,
      hash,
    );

    if (!target) {
      target = resolveSummerAnchorTarget(allOrderedViewsRef.current, hash);
      if (!target) return;

      setSelectedTypes([]);
      setSelectedPrefectures([]);
      setSelectedQuickFilters([]);
    }

    setCurrentPage(target.page);
    setPendingFocusId(target.elementId);
  }, []);

  useEffect(() => {
    filteredViewsRef.current = orderedFilteredViews;
    allOrderedViewsRef.current = allOrderedViews;
  }, [allOrderedViews, orderedFilteredViews]);

  useEffect(() => {
    const handleHashNavigation = () => revealHashTarget(window.location.hash);

    handleHashNavigation();
    window.addEventListener("hashchange", handleHashNavigation);
    return () => window.removeEventListener("hashchange", handleHashNavigation);
  }, [revealHashTarget]);

  useEffect(() => {
    if (!pendingFocusId) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(pendingFocusId);
      if (!target) return;

      focusAndScrollTo(target);
      setPendingFocusId(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [page.currentPage, pendingFocusId]);

  function handlePageChange(nextPage: number) {
    const targetPage = Math.min(
      Math.max(nextPage, 1),
      Math.max(page.totalPages, 1),
    );
    if (targetPage === page.currentPage) return;

    setPendingFocusId(null);
    setCurrentPage(targetPage);
    window.requestAnimationFrame(() => {
      const heading = eventListHeadingRef.current;
      if (heading) focusAndScrollTo(heading);
    });
  }

  function clearFilters() {
    setCurrentPage(1);
    setSelectedTypes([]);
    setSelectedPrefectures([]);
    setSelectedQuickFilters([]);
  }

  return (
    <section
      id="summer-filters"
      aria-labelledby="summer-filter-heading"
      className="scroll-mt-24"
    >
      <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2
            id="summer-filter-heading"
            tabIndex={-1}
            className="scroll-mt-24 text-2xl font-bold text-slate-900"
          >
            条件から探す
          </h2>
          <button
            type="button"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
            data-summer-filter-clear
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            全解除
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <FilterGroup label="種類">
            {EVENT_TYPES.map((type) => (
              <FilterButton
                key={type.id}
                active={selectedTypes.includes(type.id)}
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedTypes((current) => toggle(current, type.id));
                }}
                dataFilter={`type:${type.id}`}
              >
                {type.label}
              </FilterButton>
            ))}
          </FilterGroup>
          <FilterGroup label="都県">
            {PREFECTURES.map((prefecture) => (
              <FilterButton
                key={prefecture.id}
                active={selectedPrefectures.includes(prefecture.id)}
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedPrefectures((current) =>
                    toggle(current, prefecture.id),
                  );
                }}
                dataFilter={`prefecture:${prefecture.id}`}
              >
                {prefecture.label}
              </FilterButton>
            ))}
          </FilterGroup>
          <FilterGroup label="条件">
            {QUICK_FILTERS.map((filter) => (
              <FilterButton
                key={filter.id}
                active={selectedQuickFilters.includes(filter.id)}
                onClick={() => {
                  setCurrentPage(1);
                  setSelectedQuickFilters((current) =>
                    toggle(current, filter.id),
                  );
                }}
                dataFilter={`quick:${filter.id}`}
              >
                {filter.label}
              </FilterButton>
            ))}
          </FilterGroup>
        </div>
      </div>

      <div className="mt-8">
        <h2
          id="summer-event-list-heading"
          ref={eventListHeadingRef}
          tabIndex={-1}
          className="scroll-mt-24 text-2xl font-bold text-slate-900 sm:text-3xl"
        >
          開催中・これからのイベント
        </h2>
        <p
          className="mt-1 text-sm text-slate-600"
          aria-live="polite"
          data-summer-event-count
        >
          {page.totalItems === 0
            ? "0件を表示"
            : `${page.startNumber}〜${page.endNumber}件を表示`}{" "}
          / 全{page.totalItems}件
        </p>
      </div>

      {page.totalItems === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          条件に合う、開催中・これからのイベントはありません。
        </div>
      ) : (
        <div className="mt-10 grid gap-12">
          {EVENT_TYPES.map((type) => {
            const group = page.items.filter(
              (view) => view.event.event_type === type.id,
            );
            if (group.length === 0) return null;
            return (
              <section
                key={type.id}
                id={`summer-${type.id}`}
                aria-labelledby={`summer-${type.id}-heading`}
                data-summer-event-group={type.id}
              >
                <div className="mb-5">
                  <div className="flex items-center gap-3">
                    <h2
                      id={`summer-${type.id}-heading`}
                      tabIndex={-1}
                      className="scroll-mt-24 text-2xl font-bold text-slate-900 sm:text-3xl"
                    >
                      {type.heading}
                    </h2>
                    <span
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"
                      data-summer-event-group-count
                    >
                      {group.length}件
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {type.description}
                  </p>
                </div>
                <div className="grid gap-4">
                  {group.map((view) => (
                    <EventCard
                      key={view.event.id}
                      view={view}
                      anchorId={getSummerEventAnchorId(view.event.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {page.totalPages > 1 ? (
        <nav
          aria-label="Summerイベント一覧のページ"
          data-summer-event-pagination
          className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:gap-5"
        >
          <button
            type="button"
            data-page-action="previous"
            disabled={!page.hasPreviousPage}
            onClick={() => handlePageChange(page.currentPage - 1)}
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            前へ
          </button>
          <p
            aria-live="polite"
            aria-atomic="true"
            aria-current="page"
            data-summer-event-page
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
            className="inline-flex min-h-11 min-w-20 items-center justify-center rounded-md border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function resolveSummerAnchorTarget(
  items: readonly EventView[],
  hash: string,
): SummerAnchorTarget | null {
  const eventId = getSummerEventIdFromHash(hash);
  if (eventId) {
    const page = getSummerEventPageForHash(items, hash, EVENT_PAGE_SIZE);
    return page
      ? { elementId: getSummerEventAnchorId(eventId), page }
      : null;
  }

  const eventType = getSummerEventTypeFromHeadingHash(hash);
  if (!eventType) return null;
  const page = getSummerEventTypePage(items, eventType, EVENT_PAGE_SIZE);
  return page
    ? { elementId: `summer-${eventType}-heading`, page }
    : null;
}

function getSummerEventTypeFromHeadingHash(
  hash: string,
): SummerEventType | null {
  const rawAnchor = hash.startsWith("#") ? hash.slice(1) : hash;
  let anchor: string;

  try {
    anchor = decodeURIComponent(rawAnchor);
  } catch {
    return null;
  }

  return (
    EVENT_TYPES.find((type) =>
      [
        `summer-${type.id}`,
        `summer-${type.id}-heading`,
      ].includes(anchor),
    )?.id ?? null
  );
}

function orderViewsByEventType(views: readonly EventView[]): EventView[] {
  return EVENT_TYPES.flatMap((type) =>
    views.filter((view) => view.event.event_type === type.id),
  );
}

function focusAndScrollTo(target: HTMLElement) {
  target.focus({ preventScroll: true });
  const top = window.scrollY + target.getBoundingClientRect().top - 80;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.scrollTo({
    top: Math.max(0, top),
    behavior: reduceMotion ? "auto" : "smooth",
  });
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
  dataFilter,
  children,
}: {
  active: boolean;
  onClick: () => void;
  dataFilter: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-summer-filter={dataFilter}
      onClick={onClick}
      className={
        active
          ? "min-h-10 rounded-full border border-indigo-700 bg-indigo-700 px-3 py-1.5 text-sm font-bold text-white"
          : "min-h-10 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700"
      }
    >
      {children}
    </button>
  );
}

function toggle<T>(current: T[], value: T): T[] {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function matchesQuickFilter(view: EventView, filter: QuickFilter): boolean {
  switch (filter) {
    case "weekend":
      return view.isThisWeekend;
    case "free":
      return view.event.is_free === true;
    case "noReservation":
      return view.event.reservation === "not_required";
  }
}
