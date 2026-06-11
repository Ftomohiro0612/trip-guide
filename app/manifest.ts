import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "メモリップ by Trip Guide",
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
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
