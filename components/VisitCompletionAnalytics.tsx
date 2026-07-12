"use client";

import Link from "next/link";
import { useEffect } from "react";

export type VisitCompletionEntryMethod = "standard" | "photo_publish";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const viewedInThisDocument = new Set<string>();
const clickedInThisDocument = new Set<string>();

function sendEvent(
  eventName: "visit_completion_view" | "visit_another_start",
  entryMethod: VisitCompletionEntryMethod,
) {
  try {
    window.gtag?.("event", eventName, { entry_method: entryMethod });
  } catch {
    // Analytics is diagnostic only. It must never block saving or navigation.
  }
}

export function VisitCompletionViewEvent({
  visitId,
  entryMethod,
}: {
  visitId: string;
  entryMethod: VisitCompletionEntryMethod;
}) {
  useEffect(() => {
    const key = `memorip:visit-completion-view:${visitId}`;
    if (viewedInThisDocument.has(key)) return;
    viewedInThisDocument.add(key);
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // The document-level guard still prevents duplicate React effects.
    }
    sendEvent("visit_completion_view", entryMethod);
  }, [entryMethod, visitId]);

  return null;
}

export function TrackedAnotherVisitLink({
  href,
  visitId,
  entryMethod,
  onNavigate,
  children,
  className,
}: {
  href: string;
  visitId: string;
  entryMethod: VisitCompletionEntryMethod;
  onNavigate?: () => void;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        onNavigate?.();
        const key = `memorip:visit-another-start:${visitId}`;
        if (clickedInThisDocument.has(key)) return;
        clickedInThisDocument.add(key);
        try {
          if (window.sessionStorage.getItem(key)) return;
          window.sessionStorage.setItem(key, "1");
        } catch {
          // The document-level guard still prevents rapid duplicate clicks.
        }
        sendEvent("visit_another_start", entryMethod);
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
