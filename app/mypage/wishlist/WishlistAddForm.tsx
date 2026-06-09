"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FacilitySuggestion = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

export default function WishlistAddForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FacilitySuggestion[]>([]);
  const [selected, setSelected] = useState<FacilitySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/facilities/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          results?: FacilitySuggestion[];
        };
        setSuggestions(data.results ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function addToWishlist() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("ログインが必要です");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("wishlists").insert({
      user_id: user.id,
      facility_slug: selected.slug,
      facility_name: selected.name,
    });

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "すでに行きたいリストに登録されています"
          : insertError.message,
      );
      setSaving(false);
      return;
    }

    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-3">
      <div>
        <h2 className="font-bold text-slate-800 text-sm">施設を検索して追加</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          登録済み施設から選択してください。
        </p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setError(null);
          if (selected && selected.name !== nextQuery.trim()) {
            setSelected(null);
          }
          if (nextQuery.trim().length < 2) {
            setSuggestions([]);
            setLoading(false);
          }
        }}
        placeholder="施設名を入力"
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
      />

      {query.trim().length >= 2 && !selected && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <p className="px-3 py-2 text-xs text-slate-400">検索中...</p>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.slug}
                type="button"
                onClick={() => {
                  setSelected(suggestion);
                  setQuery(suggestion.name);
                  setSuggestions([]);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <span className="block text-sm font-medium text-slate-800">
                  {suggestion.name}
                </span>
                <span className="block text-xs text-slate-400">
                  {suggestion.prefecture} / {suggestion.category}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-400">
              該当する施設がありません
            </p>
          )}
        </div>
      )}

      {selected && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
          選択中: {selected.name}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={addToWishlist}
        disabled={!selected || saving}
        className="w-full py-2.5 bg-brand text-white font-bold rounded-lg text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:hover:bg-brand"
      >
        {saving ? "追加中..." : "行きたいリストに追加"}
      </button>
    </section>
  );
}
