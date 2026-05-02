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
    default: "trip-guide.net | 静岡・長野・山梨の子供向け遊び場検索",
    template: "%s | trip-guide.net",
  },
  description:
    "静岡・長野・山梨の子供と楽しめる遊び場を簡単検索。雨の日OK・無料・年齢別など、目的にあわせてすぐ見つかる！",
  applicationName: "trip-guide.net",
  authors: [{ name: "FIC" }],
  keywords: [
    "子供",
    "遊び場",
    "静岡",
    "長野",
    "山梨",
    "雨の日",
    "無料",
    "0-3歳",
    "子連れ",
    "ファミリー",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "trip-guide.net",
  },
  twitter: {
    card: "summary_large_image",
    title: "trip-guide.net | 静岡・長野・山梨の子供向け遊び場検索",
    description:
      "静岡・長野・山梨の子供と楽しめる遊び場を簡単検索。雨の日OK・無料・年齢別など、目的にあわせてすぐ見つかる！",
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
