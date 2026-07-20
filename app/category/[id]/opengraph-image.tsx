import { ImageResponse } from "next/og";
import { getCategoryMeta, getFacilitiesByCategory } from "@/lib/facilities";
import { categoryIcon } from "@/lib/icons";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from "@/lib/og-renderer";

export const alt = "trip-guide.net";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = getCategoryMeta(id);
  if (!meta) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fb923c",
            color: "white",
            fontSize: 64,
          }}
        >
          trip-guide.net
        </div>
      ),
      size,
    );
  }

  const list = getFacilitiesByCategory(meta.id);
  const rain = list.filter((f) => f.rain_friendly === "◎").length;
  const free = list.filter((f) => f.is_free).length;

  return renderOgImage({
    emoji: categoryIcon(meta.id),
    eyebrow: "カテゴリ特集",
    title: `${meta.name} ${list.length}選 (全国)`,
    badges: [
      { label: `🎈 全 ${list.length} 施設` },
      { label: `☂️ 雨でも快適 ${rain} 件` },
      { label: `🆓 無料 ${free} 件`, bg: "#10b981" },
    ],
    gradient:
      "linear-gradient(135deg, #fb923c 0%, #f59e0b 50%, #facc15 100%)",
  });
}
