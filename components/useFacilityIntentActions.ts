"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAuthDest, buildLoginRedirect, type AuthIntentType } from "@/lib/auth-dest";
import { createClient } from "@/lib/supabase/client";

type LoadState = "loading" | "guest" | "ready";

type Options = {
  facilityId?: number | string;
  facilitySlug: string;
  facilityName: string;
  loadWishlistState?: boolean;
};

type SessionUser = {
  id: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const INTENT_STORAGE_KEY = "memorip.intent";
let sessionUserPromise: Promise<SessionUser | null> | null = null;
let authCacheInvalidationStarted = false;

function isSupabaseAuthTokenKey(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

function hasStoredSupabaseSession() {
  if (typeof window === "undefined") return true;

  try {
    if (Object.keys(window.localStorage).some(isSupabaseAuthTokenKey)) return true;
  } catch {
    // Fall back to cookies below.
  }

  return document.cookie
    .split(";")
    .some((part) => isSupabaseAuthTokenKey(part.trim().split("=")[0] ?? ""));
}

function ensureAuthCacheInvalidation(supabase: ReturnType<typeof createClient>) {
  if (authCacheInvalidationStarted) return;
  authCacheInvalidationStarted = true;
  supabase.auth.onAuthStateChange(() => {
    sessionUserPromise = null;
  });
}

function getCachedSessionUser(supabase: ReturnType<typeof createClient>) {
  ensureAuthCacheInvalidation(supabase);
  if (!hasStoredSupabaseSession()) return Promise.resolve(null);

  if (!sessionUserPromise) {
    sessionUserPromise = supabase.auth
      .getSession()
      .then(({ data: { session } }) => session?.user ?? null)
      .catch((error) => {
        sessionUserPromise = null;
        throw error;
      });
  }
  return sessionUserPromise;
}

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
  loadWishlistState = false,
}: Options) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let active = true;
    async function init() {
      const supabase = createClient();
      const user = await getCachedSessionUser(supabase);
      if (!active) return;
      if (!user) {
        setUserId(null);
        setWishlistId(null);
        setWishlisted(false);
        setLoadState("guest");
        return;
      }

      setUserId(user.id);
      if (loadWishlistState) {
        const { data } = await supabase
          .from("wishlists")
          .select("id")
          .eq("user_id", user.id)
          .eq("facility_slug", facilitySlug)
          .maybeSingle();
        if (!active) return;
        setWishlistId(data?.id ?? null);
        setWishlisted(!!data?.id);
      } else {
        setWishlistId(null);
        setWishlisted(false);
      }
      setLoadState("ready");
    }
    init();
    return () => {
      active = false;
    };
  }, [facilitySlug, loadWishlistState]);

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
      requireLogin(dest);
      return;
    }
    router.push(dest);
  }, [facilityId, facilityName, facilitySlug, loadState, requireLogin, router]);

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
    const supabase = createClient();
    if (loadWishlistState && wishlistId) {
      const { error } = await supabase.from("wishlists").delete().eq("id", wishlistId);
      if (error) {
        window.alert(error.message);
        setToggling(false);
        return;
      }
      setWishlistId(null);
      setWishlisted(false);
      setToggling(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        user_id: userId,
        facility_slug: facilitySlug,
        facility_name: facilityName,
      })
      .select("id")
      .single();

    if (error && error.code !== "23505") {
      window.alert(error.message);
      setToggling(false);
      return;
    }

    if (data?.id) setWishlistId(data.id);
    setWishlisted(true);
    setToggling(false);
  }, [
    facilityId,
    facilityName,
    facilitySlug,
    loadState,
    loadWishlistState,
    requireLogin,
    toggling,
    userId,
    wishlistId,
  ]);

  return {
    handleRecord,
    handleWishlist,
    isWishlisted: loadState === "ready" && wishlisted,
    loadState,
    toggling,
  };
}
