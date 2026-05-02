import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from "@/lib/og-renderer";
import { facilities } from "@/lib/facilities";

export const alt = "trip-guide.net | 静岡・長野・山梨の子供向け遊び場検索";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    emoji: "🎈",
    eyebrow: "静岡 · 長野 · 山梨",
    title: "子供が楽しめる遊び場が、すぐ見つかる！",
    subtitle: `全 ${facilities.length} 施設掲載`,
    badges: [
      { label: "☂️ 雨の日OK" },
      { label: "🆓 無料" },
      { label: "👶 0-3歳〜小学生" },
    ],
  });
}
