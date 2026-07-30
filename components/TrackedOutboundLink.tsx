"use client";

import type { ReactNode } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type OutboundIntent =
  | "event_detail"
  | "event_pdf"
  | "reservation"
  | "facility_detail";

export default function TrackedOutboundLink({
  href,
  contentType,
  contentId,
  intentType,
  linkLocation,
  children,
  className,
}: {
  href: string;
  contentType: "event" | "facility";
  contentId: string;
  intentType: OutboundIntent;
  linkLocation: "event_card" | "facility_sidebar";
  children: ReactNode;
  className: string;
}) {
  function trackOutboundIntent() {
    try {
      const destinationHost = new URL(href).hostname.replace(/^www\./, "");
      window.gtag?.("event", "outbound_intent_click", {
        content_type: contentType,
        content_id: contentId,
        intent_type: intentType,
        link_location: linkLocation,
        destination_host: destinationHost,
      });
    } catch {
      // Analytics must never block the external destination.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackOutboundIntent}
      className={className}
    >
      {children}
    </a>
  );
}
