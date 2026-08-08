"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildFacilityPageHref,
  type FacilityPage,
} from "@/lib/facility-pagination";

const FOCUS_MARKER_KEY = "facility-pagination:focus-target";

export type FacilityPageSummary = Pick<
  FacilityPage<unknown>,
  "currentPage" | "totalPages" | "totalItems" | "rangeStart" | "rangeEnd"
>;

export function FacilityPaginationSummary({
  page,
}: {
  page: FacilityPageSummary;
}) {
  return (
    <div
      className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
      data-facility-page-summary
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="font-semibold text-slate-800">
        {page.totalItems === 0
          ? "0施設"
          : `${page.totalItems}施設中${page.rangeStart}〜${page.rangeEnd}施設を表示`}
      </p>
      <p className="font-bold text-slate-700" data-facility-page-status>
        {page.currentPage} / {page.totalPages}ページ
      </p>
    </div>
  );
}

export function FacilityPaginationControls({
  page,
  focusTargetId = "facility-results-heading",
}: {
  page: FacilityPageSummary;
  focusTargetId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeKey = pathname + ":" + focusTargetId;

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(FOCUS_MARKER_KEY) !== routeKey) return;
      window.sessionStorage.removeItem(FOCUS_MARKER_KEY);
    } catch {
      return;
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(focusTargetId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus({ preventScroll: true });
    });
  }, [focusTargetId, routeKey, searchParams]);

  function goToPage(nextPage: number) {
    try {
      window.sessionStorage.setItem(FOCUS_MARKER_KEY, routeKey);
    } catch {
      // Navigation and URL state still work when storage is unavailable.
    }
    router.push(
      buildFacilityPageHref(pathname, searchParams.toString(), nextPage),
      { scroll: false },
    );
  }

  if (page.totalPages <= 1) return null;

  return (
    <nav
      aria-label="施設一覧のページ"
      data-facility-pagination
      className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:gap-5 sm:p-3"
    >
      <button
        type="button"
        data-page-action="previous"
        disabled={page.currentPage <= 1}
        onClick={() => goToPage(page.currentPage - 1)}
        className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-20 sm:px-4"
      >
        前へ
      </button>
      <p
        aria-live="polite"
        aria-atomic="true"
        aria-current="page"
        className="min-w-20 text-center text-sm font-bold text-slate-700 sm:min-w-24"
      >
        <span className="sr-only">現在 </span>
        {page.currentPage} / {page.totalPages}ページ
      </p>
      <button
        type="button"
        data-page-action="next"
        disabled={page.currentPage >= page.totalPages}
        onClick={() => goToPage(page.currentPage + 1)}
        className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-20 sm:px-4"
      >
        次へ
      </button>
    </nav>
  );
}
