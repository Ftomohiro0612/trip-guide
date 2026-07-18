import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "メモリップ",
    short_name: "メモリップ",
    description:
      "全国19都府県・2,000施設超から子どもの遊び場を探して、行った思い出と子どもの反応を記録。記録がたまるほど、子どもの\"好き\"と成長が見えてきます。",
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
