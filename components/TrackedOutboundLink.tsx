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
  | "facility_detail"
  | "affiliate_experience";

type AnalyticsEvent =
  | "outbound_intent_click"
  | "affiliate_outbound_click";

export default function TrackedOutboundLink({
  href,
  contentType,
  contentId,
  intentType,
  linkLocation,
  analyticsEvent = "outbound_intent_click",
  partner,
  campaignId,
  sponsored = false,
  children,
  className,
}: {
  href: string;
  contentType: "event" | "facility" | "affiliate";
  contentId: string;
  intentType: OutboundIntent;
  linkLocation:
    | "event_card"
    | "facility_sidebar"
    | "events_index_affiliate"
    | "events_prefecture_affiliate"
    | "events_summer_affiliate"
    | "facility_asoview_affiliate";
  analyticsEvent?: AnalyticsEvent;
  partner?: string;
  campaignId?: string;
  sponsored?: boolean;
  children: ReactNode;
  className: string;
}) {
  function trackOutboundIntent() {
    try {
      const destinationHost = new URL(href).hostname.replace(/^www\./, "");
      window.gtag?.("event", analyticsEvent, {
        content_type: contentType,
        content_id: contentId,
        intent_type: intentType,
        link_location: linkLocation,
        destination_host: destinationHost,
        ...(partner ? { partner } : {}),
        ...(campaignId ? { campaign_id: campaignId } : {}),
      });
    } catch {
      // Analytics must never block the external destination.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={sponsored ? "sponsored noopener noreferrer" : "noopener noreferrer"}
      onClick={trackOutboundIntent}
      className={className}
    >
      {children}
    </a>
  );
}
