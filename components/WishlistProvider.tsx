"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type WishlistLoadState = "loading" | "guest" | "ready";

type WishlistContextValue = {
  loadState: WishlistLoadState;
  userId: string | null;
  isWishlisted: (facilitySlug: string) => boolean;
  add: (facilitySlug: string, facilityName: string) => Promise<void>;
  remove: (facilitySlug: string) => Promise<void>;
};

type WishlistRow = {
  facility_slug: string | null;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function normalizeSlug(slug: string) {
  return slug.trim();
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [loadState, setLoadState] = useState<WishlistLoadState>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlistSlugs, setWishlistSlugs] = useState<Set<string>>(
    () => new Set(),
  );

  const loadWishlist = useCallback(async () => {
    setLoadState("loading");
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      setUserId(null);
      setWishlistSlugs(new Set());
      setLoadState("guest");
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select("facility_slug")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    setUserId(user.id);
    setWishlistSlugs(
      new Set(
        ((data ?? []) as WishlistRow[])
          .map((row) =>
            typeof row.facility_slug === "string"
              ? normalizeSlug(row.facility_slug)
              : "",
          )
          .filter(Boolean),
      ),
    );
    setLoadState("ready");
  }, []);

  useEffect(() => {
    let active = true;

    const handleLoadError = () => {
      if (!active) return;
      setUserId(null);
      setWishlistSlugs(new Set());
      setLoadState("guest");
    };

    const initialLoadId = window.setTimeout(() => {
      loadWishlist().catch(handleLoadError);
    }, 0);

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;
      if (!active) return;
      loadWishlist().catch(handleLoadError);
    });

    return () => {
      active = false;
      window.clearTimeout(initialLoadId);
      subscription.unsubscribe();
    };
  }, [loadWishlist]);

  const isWishlisted = useCallback(
    (facilitySlug: string) => wishlistSlugs.has(normalizeSlug(facilitySlug)),
    [wishlistSlugs],
  );

  const add = useCallback(
    async (facilitySlug: string, facilityName: string) => {
      if (!userId) return;
      const slug = normalizeSlug(facilitySlug);
      const hadSlug = wishlistSlugs.has(slug);

      setWishlistSlugs((current) => {
        const next = new Set(current);
        next.add(slug);
        return next;
      });

      const supabase = createClient();
      const { error } = await supabase.from("wishlists").insert({
        user_id: userId,
        facility_slug: slug,
        facility_name: facilityName,
      });

      if (error && error.code !== "23505") {
        if (!hadSlug) {
          setWishlistSlugs((current) => {
            const next = new Set(current);
            next.delete(slug);
            return next;
          });
        }
        throw new Error(error.message);
      }
    },
    [userId, wishlistSlugs],
  );

  const remove = useCallback(
    async (facilitySlug: string) => {
      if (!userId) return;
      const slug = normalizeSlug(facilitySlug);
      const hadSlug = wishlistSlugs.has(slug);

      setWishlistSlugs((current) => {
        const next = new Set(current);
        next.delete(slug);
        return next;
      });

      const supabase = createClient();
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("user_id", userId)
        .eq("facility_slug", slug);

      if (error) {
        if (hadSlug) {
          setWishlistSlugs((current) => {
            const next = new Set(current);
            next.add(slug);
            return next;
          });
        }
        throw new Error(error.message);
      }
    },
    [userId, wishlistSlugs],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      loadState,
      userId,
      isWishlisted,
      add,
      remove,
    }),
    [add, isWishlisted, loadState, remove, userId],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}
