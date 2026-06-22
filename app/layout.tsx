import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trip-guide.net"),
  title: {
    default: "メモリップ | 子どもの\"好き\"が見える、おでかけ記録サービス",
    template: "%s | メモリップ",
  },
  description:
    "関東甲信越11県・1,000施設超から子どもの遊び場を探して、行った思い出と子どもの反応を記録。記録がたまるほど、子どもの\"好き\"と成長が見えてきます。",
  applicationName: "メモリップ",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192.png",
  },
  authors: [{ name: "FIC" }],
  keywords: [
    "子供",
    "遊び場",
    "静岡",
    "長野",
    "山梨",
    "東京",
    "栃木",
    "埼玉",
    "新潟",
    "千葉",
    "神奈川",
    "茨城",
    "群馬",
    "関東甲信越",
    "雨の日",
    "無料",
    "0-3歳",
    "子連れ",
    "ファミリー",
    "おでかけ記録",
    "メモリップ",
    "子どもの成長記録",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "メモリップ",
    title: "メモリップ | 子どもの\"好き\"が見える、おでかけ記録サービス",
    description:
      "関東甲信越11県・1,000施設超から子どもの遊び場を探して、行った思い出と子どもの反応を記録。記録がたまるほど、子どもの\"好き\"と成長が見えてきます。",
  },
  twitter: {
    card: "summary_large_image",
    title: "メモリップ | 子どもの\"好き\"が見える、おでかけ記録サービス",
    description:
      "関東甲信越11県・1,000施設超から子どもの遊び場を探して、行った思い出と子どもの反応を記録。記録がたまるほど、子どもの\"好き\"と成長が見えてきます。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  formatDetection: { telephone: false },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a href="#main-content" className="skip-link">
          メインコンテンツへスキップ
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
