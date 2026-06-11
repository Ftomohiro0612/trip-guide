import Link from "next/link";
import Image from "next/image";
import HeaderAuthButton from "@/components/HeaderAuthButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo/logo-ja-header.png"
            alt="メモリップ"
            width={122}
            height={32}
            priority
            className="h-8 w-auto"
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
          </nav>
          <HeaderAuthButton />
        </div>
      </div>
    </header>
  );
}
