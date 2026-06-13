import { ImageResponse } from "next/og";
import { getPrefectureMeta, getFacilitiesByPrefecture } from "@/lib/facilities";
import { prefectureEmoji } from "@/lib/icons";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  PREF_GRADIENTS,
  renderOgImage,
} from "@/lib/og-renderer";
import type { PrefectureId } from "@/types/facility";

export const alt = "trip-guide.net";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = getPrefectureMeta(id as PrefectureId);
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
            background: "#0ea5e9",
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

  const list = getFacilitiesByPrefecture(meta.id);
  const rain = list.filter((f) => f.rain_friendly === "◎").length;
  const free = list.filter((f) => f.is_free).length;

  return renderOgImage({
    emoji: prefectureEmoji[meta.id],
    eyebrow: "エリア特集",
    title: `${meta.name}の子供向け遊び場 ${list.length}選`,
    badges: [
      { label: `🎈 全 ${list.length} 施設` },
      { label: `☂️ 雨の日OK ${rain} 件` },
      { label: `🆓 無料 ${free} 件`, bg: "#10b981" },
    ],
    gradient: PREF_GRADIENTS[meta.id],
  });
}
