import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "trip-guide.net | 静岡・長野・山梨の子供向け遊び場検索",
    short_name: "メモリップ",
    description:
      "静岡・長野・山梨の子供と楽しめる遊び場を簡単検索。雨の日OK・無料・年齢別など、目的にあわせてすぐ見つかる！",
    start_url: "/",
    display: "standalone",
    background_color: "#fafbfc",
    theme_color: "#0ea5e9",
    lang: "ja",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
