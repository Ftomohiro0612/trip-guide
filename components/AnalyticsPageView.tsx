"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { maskAnalyticsPath, maskAnalyticsUrl } from "@/components/analytics-url";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __memoripGa4PageViewState?: {
      lastPageLocation?: string;
      lastPageViewKey?: string;
    };
  }
}

const MANUAL_PAGE_VIEW_MARKER = "1";

export default function AnalyticsPageView({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname ?? ""}?${searchParams?.toString() ?? ""}`;

  useEffect(() => {
    if (!gaId || typeof window === "undefined") return;

    const pageLocation = maskAnalyticsUrl(window.location.href, window.location.origin);
    if (!pageLocation) return;

    const state =
      window.__memoripGa4PageViewState ??
      (window.__memoripGa4PageViewState = {});
    if (state.lastPageViewKey === pageLocation) return;

    const pageReferrer =
      state.lastPageLocation ??
      maskAnalyticsUrl(document.referrer, window.location.origin);
    const pagePath = maskAnalyticsPath(window.location.href, window.location.origin);

    state.lastPageViewKey = pageLocation;
    state.lastPageLocation = pageLocation;

    try {
      window.gtag?.("set", {
        page_location: pageLocation,
        page_referrer: pageReferrer,
      });
      window.gtag?.("event", "page_view", {
        send_to: gaId,
        page_location: pageLocation,
        page_referrer: pageReferrer,
        page_path: pagePath,
        memorip_manual_page_view: MANUAL_PAGE_VIEW_MARKER,
      });
    } catch {
      // Analytics must never block page rendering or navigation.
    }
  }, [gaId, routeKey]);

  return null;
}
