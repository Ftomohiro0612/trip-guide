// サービス設定 — memorips.com 移行時はここだけ変更する
export const SERVICE = {
  name: "メモリップ",
  nameEn: "Memorips",
  tagline: '子どもの"好き"が見える、おでかけ記録サービス',
  // 本番移行時: process.env.NEXT_PUBLIC_SITE_URL を "https://memorips.com" に変更
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://trip-guide.net",
  mypageBase: "/mypage",
  authBase: "/auth",
  operatorName: "合同会社F&IC",
  supportEmail: "mail@memorips.com",
} as const;

// 写真 Phase C 完了までは本番ユーザーにアップロードUIを出さない。
// 公開するときはここを true に切り替える。
export const PHOTO_UPLOAD_ENABLED: boolean = true;

// トップ「おすすめ施設」の固定キュレーション（並び順は表示順）。
// 非表示施設は page.tsx 側で visibleFacilities から探すため自動除外される。
export const FEATURED_FACILITY_IDS: number[] = [801, 675, 245, 782, 518, 136];
