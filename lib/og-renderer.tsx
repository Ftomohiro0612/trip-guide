import { ImageResponse } from "next/og";
import { getJpFontSubset } from "./og-font";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export interface OgRenderInput {
  emoji: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badges?: { label: string; bg?: string }[];
  gradient?: string;
}

const DEFAULT_GRADIENT =
  "linear-gradient(135deg, #38bdf8 0%, #22d3ee 50%, #34d399 100%)";

export async function renderOgImage(input: OgRenderInput) {
  const { emoji, eyebrow, title, subtitle, badges, gradient } = input;

  const fontText =
    `${title}${eyebrow}${subtitle ?? ""}` +
    (badges ?? []).map((b) => b.label).join("") +
    "trip-guide.net子供向け遊び場検索";

  const fontData = await getJpFontSubset(fontText);

  const truncatedTitle = title.length > 22 ? title.slice(0, 22) + "…" : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: gradient ?? DEFAULT_GRADIENT,
          display: "flex",
          flexDirection: "column",
          padding: "60px 70px",
          color: "white",
          fontFamily: fontData ? "NotoSansJP" : "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            opacity: 0.95,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 36 }}>🎈</span>
            <span style={{ fontWeight: 700 }}>trip-guide.net</span>
          </div>
          <div style={{ fontSize: 22, opacity: 0.85 }}>子供向け遊び場検索</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginTop: 50,
          }}
        >
          <div style={{ fontSize: 160, lineHeight: 1 }}>{emoji}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 24, opacity: 0.95, fontWeight: 700 }}>
              {eyebrow}
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1.15,
                marginTop: 8,
                letterSpacing: -1,
              }}
            >
              {truncatedTitle}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: 24,
                  marginTop: 12,
                  opacity: 0.92,
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {badges && badges.length > 0 && (
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            {badges.map((b, i) => (
              <div
                key={i}
                style={{
                  background: b.bg ?? "rgba(255,255,255,0.25)",
                  padding: "10px 22px",
                  borderRadius: 14,
                  fontSize: 26,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: fontData
        ? [
            {
              name: "NotoSansJP",
              data: fontData,
              style: "normal" as const,
              weight: 700 as const,
            },
          ]
        : undefined,
    },
  );
}

export const PREF_GRADIENTS: Record<string, string> = {
  shizuoka: "linear-gradient(135deg, #38bdf8 0%, #22d3ee 50%, #34d399 100%)",
  nagano: "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%)",
  yamanashi: "linear-gradient(135deg, #d946ef 0%, #8b5cf6 50%, #6366f1 100%)",
};
