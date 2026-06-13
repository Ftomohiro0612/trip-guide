import { ImageResponse } from "next/og";
import { getFacilityBySlug, isFacilityVisible } from "@/lib/facilities";
import { categoryIcon } from "@/lib/icons";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  PREF_GRADIENTS,
  renderOgImage,
} from "@/lib/og-renderer";

export const alt = "trip-guide.net";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const facility = getFacilityBySlug(slug);

  if (!isFacilityVisible(facility)) {
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

  const badges = [];
  if (facility.is_free) {
    badges.push({ label: "🆓 無料で遊べる", bg: "#10b981" });
  }
  if (facility.rain_friendly === "◎") {
    badges.push({ label: "☂️ 雨でも遊べる" });
  }
  badges.push({ label: `👶 ${facility.target_age}` });

  return renderOgImage({
    emoji: categoryIcon(facility.category_id),
    eyebrow: `${facility.prefecture} · ${facility.category}`,
    title: facility.name,
    badges,
    gradient: PREF_GRADIENTS[facility.prefecture_id],
  });
}
