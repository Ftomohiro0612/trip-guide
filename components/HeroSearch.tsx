"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type FacilitySuggestion = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

export default function HeroSearch() {
  const router = useRouter();
  const listboxId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const shouldOpenSuggestionsRef = useRef(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FacilitySuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/facilities/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          results?: FacilitySuggestion[];
        };
        const results = data.results ?? [];
        setSuggestions(results);
        setActiveIndex(-1);
        setSuggestionsOpen(results.length > 0 && shouldOpenSuggestionsRef.current);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setSuggestions([]);
          setSuggestionsOpen(false);
          setActiveIndex(-1);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !formRef.current?.contains(event.target)
      ) {
        shouldOpenSuggestionsRef.current = false;
        setSuggestionsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!suggestionsOpen) return;

    function updateDropdownMaxHeight() {
      const formRect = formRef.current?.getBoundingClientRect();
      if (!formRect) return;

      const availableHeight = window.innerHeight - formRect.bottom - 24;
      setDropdownMaxHeight(Math.max(120, Math.min(288, availableHeight)));
    }

    const frame = window.requestAnimationFrame(updateDropdownMaxHeight);
    window.addEventListener("resize", updateDropdownMaxHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateDropdownMaxHeight);
    };
  }, [suggestionsOpen, suggestions.length]);

  function navigateToFacility(suggestion: FacilitySuggestion) {
    setSuggestionsOpen(false);
    setActiveIndex(-1);
    router.push(`/facilities/${encodeURIComponent(suggestion.slug)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      shouldOpenSuggestionsRef.current = false;
      setSuggestionsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      const activeSuggestion = suggestions[activeIndex];
      if (suggestionsOpen && activeSuggestion) {
        event.preventDefault();
        navigateToFacility(activeSuggestion);
      }
      return;
    }

    if (suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    }
  }

  return (
    <form
      ref={formRef}
      action="/facilities"
      className="relative mx-auto mt-6 w-full max-w-sm lg:mx-0"
    >
      <div className="flex w-full overflow-hidden rounded-full bg-white p-1.5 shadow-lg">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            shouldOpenSuggestionsRef.current = true;
            setQuery(nextQuery);
            setSuggestions([]);
            setSuggestionsOpen(false);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            shouldOpenSuggestionsRef.current = true;
            if (suggestions.length > 0) {
              setSuggestionsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestionsOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          placeholder="キーワードで検索（施設名・地域・カテゴリ・特徴など）"
          className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          🔍 検索
        </button>
      </div>

      {suggestionsOpen && suggestions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          style={
            dropdownMaxHeight === null
              ? undefined
              : { maxHeight: dropdownMaxHeight }
          }
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-y-auto rounded-lg border border-slate-200 bg-white py-2 text-left shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <button
              id={`${listboxId}-${index}`}
              key={suggestion.slug}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => navigateToFacility(suggestion)}
              className={`w-full px-3 py-2 text-left transition-colors ${
                activeIndex === index ? "bg-slate-50" : "hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-medium text-slate-800">
                {suggestion.name}
              </span>
              <span className="block text-xs text-slate-400">
                {suggestion.prefecture} / {suggestion.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
