"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAuthDest, buildLoginRedirect, type AuthIntentType } from "@/lib/auth-dest";
import { useWishlist } from "@/components/WishlistProvider";

type Options = {
  facilityId?: number | string;
  facilitySlug: string;
  facilityName: string;
  loadWishlistState?: boolean;
  onGuestRecord?: () => void;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const INTENT_STORAGE_KEY = "memorip.intent";

function trackIntentClick(
  facilityId: number | string | undefined,
  intentType: AuthIntentType,
) {
  if (!facilityId || typeof window.gtag !== "function") return;
  window.gtag("event", "record_cta_click", {
    facility_id: String(facilityId),
    intent_type: intentType,
  });
}

function rememberIntent(dest: string) {
  try {
    window.sessionStorage.setItem(INTENT_STORAGE_KEY, dest);
  } catch {
    // URL is the source of truth; storage is only a same-tab backup.
  }
}

export function useFacilityIntentActions({
  facilityId,
  facilitySlug,
  facilityName,
  onGuestRecord,
}: Options) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const { add, isWishlisted, loadState, remove, userId } = useWishlist();
  const wishlisted = isWishlisted(facilitySlug);

  const requireLogin = useCallback(
    (dest: string) => {
      rememberIntent(dest);
      router.push(buildLoginRedirect(dest));
    },
    [router],
  );

  const handleRecord = useCallback(() => {
    if (loadState === "loading") return;
    const dest = buildAuthDest("record", facilitySlug, facilityName);
    trackIntentClick(facilityId, "record");
    if (loadState === "guest") {
      onGuestRecord?.();
      return;
    }
    router.push(dest);
  }, [facilityId, facilityName, facilitySlug, loadState, onGuestRecord, router]);

  const handleWishlist = useCallback(async () => {
    if (loadState === "loading" || toggling) return;

    const dest = buildAuthDest("wishlist", facilitySlug, facilityName);
    trackIntentClick(facilityId, "wishlist");
    if (loadState === "guest") {
      requireLogin(dest);
      return;
    }
    if (!userId) return;

    setToggling(true);
    try {
      if (wishlisted) {
        await remove(facilitySlug);
      } else {
        await add(facilitySlug, facilityName);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "行きたいリストの更新に失敗しました");
    } finally {
      setToggling(false);
    }
  }, [
    add,
    facilityId,
    facilityName,
    facilitySlug,
    loadState,
    remove,
    requireLogin,
    toggling,
    userId,
    wishlisted,
  ]);

  return {
    handleRecord,
    handleWishlist,
    isWishlisted: loadState === "ready" && wishlisted,
    loadState,
    toggling,
  };
}
