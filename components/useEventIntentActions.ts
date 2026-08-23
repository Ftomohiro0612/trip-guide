"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/components/WishlistProvider";
import { buildEventAuthDest, buildLoginRedirect } from "@/lib/auth-dest";

const INTENT_STORAGE_KEY = "memorip.intent";

function rememberIntent(dest: string) {
  try {
    window.sessionStorage.setItem(INTENT_STORAGE_KEY, dest);
  } catch {
    // URL is the source of truth; storage is only a same-tab backup.
  }
}

export function useEventIntentActions(eventId: string) {
  const router = useRouter();
  const { loadState } = useWishlist();

  const handleRecordEvent = useCallback(() => {
    if (loadState === "loading") return;

    const dest = buildEventAuthDest(eventId);
    if (typeof window.gtag === "function") {
      window.gtag("event", "record_cta_click", {
        event_id: eventId,
        intent_type: "record_event",
      });
    }

    if (loadState === "guest") {
      rememberIntent(dest);
      router.push(buildLoginRedirect(dest));
      return;
    }

    router.push(dest);
  }, [eventId, loadState, router]);

  return {
    handleRecordEvent,
    loading: loadState === "loading",
  };
}
