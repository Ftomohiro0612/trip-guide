"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafbfc",
          color: "#1a2332",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🌧️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            予期しないエラーが発生しました
          </h1>
          <p style={{ color: "#64748b", margin: "0 0 24px" }}>
            ページを再読み込みしてください。
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "monospace",
                margin: "0 0 16px",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "#0ea5e9",
              color: "white",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ホームに戻る
          </a>
        </div>
      </body>
    </html>
  );
}
