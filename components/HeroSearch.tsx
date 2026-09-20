"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { buildQueryString, type FilterParams } from "@/lib/filter";
import { parseNaturalLanguageQuery } from "@/lib/natural-language-query";

type FacilitySuggestion = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

// ブラウザ標準の Web Speech API。型定義は next/dom に無いため最小限を自前で持つ。
// 外部AI API・LLM・vector DBへは一切送信しない(ブラウザ内蔵の音声認識のみ使用)。
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ブラウザのSpeechRecognition対応状況はマウント後に変わらないため、購読は不要な
// 無変化ストアとして useSyncExternalStore に載せる。サーバー(window無し)では常に
// false を返し、クライアントでの実値とのハイドレーション不一致を避ける。
function subscribeNoop() {
  return () => {};
}
function getSpeechSupportedSnapshot() {
  return getSpeechRecognitionConstructor() !== null;
}
function getSpeechSupportedServerSnapshot() {
  return false;
}

function navigateToFacilitiesSearch(
  router: ReturnType<typeof useRouter>,
  query: string,
) {
  const parsed = parseNaturalLanguageQuery(query);
  const filters: FilterParams = {
    prefectures: parsed.prefectures,
    categories: parsed.categories,
    indoor: parsed.indoor,
    rain: parsed.rain,
    fee: parsed.fee,
    tags: parsed.tags,
    q: parsed.q,
    sort: "recommend",
    bbox: null,
  };
  const destination = `/facilities${buildQueryString(filters)}`;
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_STATIC_NAVIGATION === "true") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(destination);
    return;
  }
  router.push(destination);
}

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
  const [listening, setListening] = useState(false);
  const speechSupported = useSyncExternalStore(
    subscribeNoop,
    getSpeechSupportedSnapshot,
    getSpeechSupportedServerSnapshot,
  );
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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
    const destination = `/facilities/${encodeURIComponent(suggestion.slug)}`;
    if (process.env.NEXT_PUBLIC_CLOUDFLARE_STATIC_NAVIGATION === "true") {
      // Cloudflare serves this SSG document directly, without an RSC payload.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(destination);
      return;
    }
    router.push(destination);
  }

  function handleMicClick() {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        shouldOpenSuggestionsRef.current = false;
        setSuggestionsOpen(false);
        setQuery((current) => (current ? `${current}${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSuggestionsOpen(false);
    navigateToFacilitiesSearch(router, trimmed);
  }

  return (
    <form
      ref={formRef}
      action="/facilities"
      onSubmit={handleSubmit}
      className="relative mx-auto w-full max-w-xl lg:mx-0"
      aria-label="施設名・エリア・条件や文章、音声で施設を探す"
    >
      <div className="flex w-full items-center overflow-hidden rounded-full bg-white p-1.5 shadow-lg">
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
          placeholder="施設名・エリア、文章も"
          className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {speechSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            aria-pressed={listening}
            aria-label={listening ? "音声入力を停止" : "音声入力を開始"}
            className={`ml-1 shrink-0 rounded-full p-2.5 text-base transition-colors ${
              listening
                ? "bg-rose-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span aria-hidden>{listening ? "⏺️" : "🎤"}</span>
          </button>
        )}
        <button
          type="submit"
          className="ml-1 shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
