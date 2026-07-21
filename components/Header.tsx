import Link from "next/link";
import Image from "next/image";
import HeaderAuthButton from "@/components/HeaderAuthButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/logo-ja-header.png"
            alt="メモリップ"
            width={243}
            height={64}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="hidden sm:flex items-center gap-1 sm:gap-4 text-sm font-medium">
            <Link
              href="/facilities"
              className="px-2 sm:px-3 py-1.5 rounded-md hover:bg-sky-50 hover:text-brand transition-colors"
            >
              施設一覧
            </Link>
            <Link
              href="/tag/rainy-day"
              className="px-2 sm:px-3 py-1.5 rounded-md hover:bg-sky-50 hover:text-brand transition-colors"
            >
              <span aria-hidden>☂️ </span>雨の日
            </Link>
            <Link
              href="/tag/free"
              className="px-2 sm:px-3 py-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <span aria-hidden>🆓 </span>無料で遊べる
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center rounded-md px-2 py-1.5 transition-colors hover:bg-violet-50 hover:text-violet-600 sm:px-3"
            >
              <span aria-hidden>🎪 </span>イベント一覧
            </Link>
            <Link
              href="/events/summer"
              data-seasonal-hub="summer-2026"
              data-seasonal-layout="inline-flex"
              className="items-center rounded-md bg-indigo-50 px-2 py-1.5 font-bold text-indigo-700 transition-colors hover:bg-indigo-100 sm:px-3"
            >
              🎆 夏祭り・花火
            </Link>
          </nav>
          <HeaderAuthButton />
        </div>
      </div>
      <nav
        aria-label="イベント特集"
        data-mobile-seasonal-navigation
        className="flex gap-2 px-3 pb-2 sm:hidden"
      >
        <Link
          href="/events/summer"
          data-seasonal-hub="summer-2026"
          data-seasonal-layout="inline-flex"
          className="min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700"
        >
          🎆 夏祭り・花火
        </Link>
        <Link
          href="/events"
          className="inline-flex min-h-10 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700"
        >
          🎪 すべてのイベント
        </Link>
      </nav>
    </header>
  );
}
