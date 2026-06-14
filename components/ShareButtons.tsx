"use client";

import { useEffect, useState } from "react";

interface Props {
  url: string;
  title: string;
  prefecture?: string;
  thingsToDo?: string[];
}

const BRAND_LINE =
  "メモリップ | 子どもの“好き”が見える、おでかけ記録サービス";
const X_TEXT_LIMIT = 250;

function getShareThings(thingsToDo: string[] | undefined, maxItems: number) {
  return Array.isArray(thingsToDo)
    ? thingsToDo
        .map((thing) => (typeof thing === "string" ? thing.trim() : ""))
        .filter((thing) => thing.length > 0)
        .slice(0, maxItems)
    : [];
}

function buildShareLead(title: string, prefecture: string | undefined) {
  const trimmedPrefecture =
    typeof prefecture === "string" ? prefecture.trim() : "";

  return trimmedPrefecture ? `${trimmedPrefecture}｜${title}` : title;
}

function buildShareText(
  title: string,
  prefecture: string | undefined,
  things: string[],
) {
  const lead = buildShareLead(title, prefecture);
  const thingsBlock =
    things.length > 0
      ? `\n\n楽しめそうなこと：\n${things.map((thing) => `・${thing}`).join("\n")}`
      : "";

  return `${lead}${thingsBlock}\n\n${BRAND_LINE}`;
}

function buildXShareText(
  title: string,
  prefecture: string | undefined,
  thingsToDo: string[] | undefined,
) {
  const fullThings = getShareThings(thingsToDo, 5);
  const fullText = buildShareText(title, prefecture, fullThings);

  if (fullText.length <= X_TEXT_LIMIT || fullThings.length <= 3) {
    return fullText;
  }

  const reducedThings = fullThings.slice(0, 3);
  const reducedText = buildShareText(title, prefecture, reducedThings);

  if (reducedText.length <= X_TEXT_LIMIT || reducedThings.length === 0) {
    return reducedText;
  }

  const lastIndex = reducedThings.length - 1;
  const withoutLast = buildShareText(
    title,
    prefecture,
    reducedThings.slice(0, lastIndex),
  );
  const bulletPrefixLength = "\n・".length;
  const availableLastLength =
    X_TEXT_LIMIT - withoutLast.length - bulletPrefixLength;
  const ellipsis = "…";
  const truncatedLast =
    availableLastLength > ellipsis.length
      ? `${reducedThings[lastIndex].slice(0, availableLastLength - ellipsis.length)}${ellipsis}`
      : ellipsis;

  return buildShareText(title, prefecture, [
    ...reducedThings.slice(0, lastIndex),
    truncatedLast,
  ]);
}

export default function ShareButtons({
  url,
  title,
  prefecture,
  thingsToDo,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `https://trip-guide.net${url}`;
  const lineShareText = buildShareText(
    title,
    prefecture,
    getShareThings(thingsToDo, 5),
  );
  const xShareText = buildXShareText(title, prefecture, thingsToDo);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanNativeShare("share" in navigator);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // older browsers fallback
      const t = document.createElement("textarea");
      t.value = fullUrl;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({ title, text: lineShareText, url: fullUrl })
        .catch(() => {});
    }
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xShareText)}&url=${encodeURIComponent(fullUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(lineShareText)}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">シェア:</span>
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Xでシェア"
        title="Xでシェア"
        className="w-9 h-9 grid place-items-center rounded-full bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
      >
        𝕏
      </a>
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LINEでシェア"
        title="LINEでシェア"
        className="w-9 h-9 grid place-items-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
      >
        LINE
      </a>
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebookでシェア"
        title="Facebookでシェア"
        className="w-9 h-9 grid place-items-center rounded-full bg-[#1877f2] hover:opacity-90 text-white text-xs font-bold transition-colors"
      >
        f
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label="リンクをコピー"
        title={copied ? "コピーしました" : "リンクをコピー"}
        className={`h-9 px-3 grid place-items-center rounded-full border text-xs font-medium transition-colors ${
          copied
            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
        }`}
      >
        {copied ? "✓ コピーしました" : "🔗 リンク"}
      </button>
      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="OS のシェアメニュー"
          title="OS のシェアメニュー"
          className="w-9 h-9 grid place-items-center rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
        >
          <span aria-hidden>↗</span>
        </button>
      )}
    </div>
  );
}
