"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buildQueryString, type FilterParams } from "@/lib/filter";
import { parseNaturalLanguageQuery } from "@/lib/natural-language-query";

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
  };
  const destination = `/facilities${buildQueryString(filters)}`;
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_STATIC_NAVIGATION === "true") {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(destination);
    return;
  }
  router.push(destination);
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

export default function NaturalLanguageSearch() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
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
        setText((current) =>
          current ? `${current}${transcript}` : transcript,
        );
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    navigateToFacilitiesSearch(router, trimmed);
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex items-center gap-1.5 self-center text-xs font-bold text-white/90 underline decoration-white/60 underline-offset-4 transition-colors hover:text-sky-50 lg:self-start"
      >
        <span aria-hidden>💬</span>
        文章や声で条件を伝えて探す →
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mx-auto mt-3 w-full max-w-xl lg:mx-0"
      aria-label="文章や声で施設を探す"
    >
      <div className="rounded-2xl bg-white/95 p-3 shadow-lg">
        <label htmlFor="nl-search-input" className="mb-1.5 block text-xs font-bold text-slate-500">
          今日の条件を文章で(例: 「雨だから豊洲の近くで3歳でも遊べて無料のところ」)
        </label>
        <div className="flex items-start gap-2">
          <textarea
            id="nl-search-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            placeholder="今日雨だから、近くで無料の屋内施設…"
            className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand"
          />
          {speechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              aria-pressed={listening}
              aria-label={listening ? "音声入力を停止" : "音声入力を開始"}
              className={`shrink-0 rounded-full p-2.5 text-lg transition-colors ${
                listening
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span aria-hidden>{listening ? "⏺️" : "🎤"}</span>
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            閉じる
          </button>
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            🔍 この条件で探す
          </button>
        </div>
      </div>
    </form>
  );
}
