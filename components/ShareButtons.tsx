"use client";

import { useState } from "react";

interface Props {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `https://trip-guide.net${url}`;
  const text = `${title} | trip-guide.net`;

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
      navigator.share({ title, text, url: fullUrl }).catch(() => {});
    }
  }

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(text)}`;
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
      {typeof window !== "undefined" && "share" in navigator && (
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
