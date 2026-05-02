import { ImageResponse } from "next/og";
import { facilities } from "@/lib/facilities";
import { getTagMetaBySlug } from "@/lib/tags";
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getTagMetaBySlug(slug);
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

  const count = facilities.filter((f) => f.tags.includes(meta.tag)).length;

  return renderOgImage({
    emoji: meta.emoji,
    eyebrow: "テーマ特集",
    title: `${meta.title} ${count}選`,
    subtitle: meta.lead.length > 40 ? meta.lead.slice(0, 40) + "…" : meta.lead,
    badges: [
      { label: `🎈 ${count} 施設` },
      { label: "🗻 静岡 / 🏔️ 長野 / 🍇 山梨" },
    ],
  });
}
