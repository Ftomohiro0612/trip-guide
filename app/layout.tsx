import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import ValueCommerceLinkSwitch from "@/components/ValueCommerceLinkSwitch";
import { WishlistProvider } from "@/components/WishlistProvider";
import { SERVICE } from "@/lib/config";
import {
  getFeatureHubVisibilityScript,
  SUMMER_2026_HUB_CONFIG,
} from "@/lib/feature-hubs";
import { prefectures, visibleFacilities } from "@/lib/facilities";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const siteDescription = `全国${prefectures.length}都道府県・${visibleFacilities.length.toLocaleString("ja-JP")}施設から子どもの遊び場を探して、行った思い出と子どもの反応を記録。記録がたまるほど、子どもの"好き"と成長が見えてきます。`;

const cloudflareStaticNavigationScript = `(() => {
  const nativeFetch = window.fetch.bind(window);
  const isDirectStaticRoute = (pathname) =>
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/guide" ||
    pathname === "/map" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/try" ||
    /^\\/facilities\\/facility-\\d+\\/?$/.test(pathname) ||
    /^\\/events(?:\\/[a-z-]+)?\\/?$/.test(pathname) ||
    /^\\/prefecture\\/[a-z-]+(?:\\/category\\/[a-z-]+)?\\/?$/.test(pathname) ||
    /^\\/legal\\/(?:privacy|terms)\\/?$/.test(pathname);

  window.fetch = (input, init) => {
    const rawUrl = typeof input === "string" || input instanceof URL ? input : input.url;
    const url = new URL(rawUrl, window.location.href);
    if (
      url.origin === window.location.origin &&
      url.searchParams.has("_rsc") &&
      isDirectStaticRoute(url.pathname)
    ) {
      return Promise.reject(new DOMException("Static route prefetch skipped", "AbortError"));
    }
    return nativeFetch(input, init);
  };

  document.addEventListener(
    "click",
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!isDirectStaticRoute(url.pathname)) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash
      ) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(url.href);
    },
    true,
  );
})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SERVICE.baseUrl),
  title: {
    default: "メモリップ | 子どもの\"好き\"が見える、おでかけ記録サービス",
    template: "%s | メモリップ",
  },
  description: siteDescription,
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
    "大阪",
    "兵庫",
    "関西",
    "近畿",
    "沖縄",
    "鹿児島",
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
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "メモリップ | 子どもの\"好き\"が見える、おでかけ記録サービス",
    description: siteDescription,
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
        <WishlistProvider>
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </WishlistProvider>
        <Analytics />
        <ValueCommerceLinkSwitch />
        {process.env.NEXT_PUBLIC_CLOUDFLARE_STATIC_NAVIGATION === "true" && (
          <Script
            id="cloudflare-static-navigation"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: cloudflareStaticNavigationScript,
            }}
          />
        )}
        <Script
          id="summer-2026-runtime-visibility"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: getFeatureHubVisibilityScript(SUMMER_2026_HUB_CONFIG),
          }}
        />
      </body>
    </html>
  );
}
