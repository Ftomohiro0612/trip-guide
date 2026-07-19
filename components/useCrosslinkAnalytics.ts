"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CROSSLINK_CLICK_ANALYTICS_EVENT,
  CROSSLINK_VIEW_ANALYTICS_EVENT,
  buildCrosslinkClickAnalyticsPayload,
  buildCrosslinkViewAnalyticsPayload,
  type CrosslinkDirection,
} from "@/lib/event-facility-crosslinks";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function useCrosslinkAnalytics(
  direction: CrosslinkDirection,
  itemCount: number,
) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewSentRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || viewSentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          viewSentRef.current ||
          !entries.some((entry) => entry.isIntersecting)
        ) {
          return;
        }
        viewSentRef.current = true;
        window.gtag?.(
          "event",
          CROSSLINK_VIEW_ANALYTICS_EVENT,
          buildCrosslinkViewAnalyticsPayload(direction, itemCount),
        );
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [direction, itemCount]);

  const trackClick = useCallback(
    (position: number) => {
      window.gtag?.(
        "event",
        CROSSLINK_CLICK_ANALYTICS_EVENT,
        buildCrosslinkClickAnalyticsPayload(direction, position),
      );
    },
    [direction],
  );

  return { sectionRef, trackClick };
}
