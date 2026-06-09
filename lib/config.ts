// サービス設定 — memorips.com 移行時はここだけ変更する
export const SERVICE = {
  name: "メモリップ",
  nameEn: "Memorips",
  tagline: '子どもの"好き"が見える、おでかけ記録サービス',
  // 本番移行時: process.env.NEXT_PUBLIC_SITE_URL を "https://memorips.com" に変更
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://trip-guide.net",
  mypageBase: "/mypage",
  authBase: "/auth",
  supportEmail: "info@fic-investment.biz",
} as const;
