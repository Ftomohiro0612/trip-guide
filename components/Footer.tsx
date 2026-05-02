import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🎈</span>
            <span className="font-bold">
              trip-guide<span className="text-brand">.net</span>
            </span>
          </Link>
          <p className="mt-2 text-slate-500 leading-relaxed">
            静岡・長野・山梨の、子供と楽しめる遊び場検索サイト。
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">エリアから探す</h3>
          <ul className="space-y-1 text-slate-600">
            <li>
              <Link href="/prefecture/shizuoka" className="hover:text-brand">
                静岡県
              </Link>
            </li>
            <li>
              <Link href="/prefecture/nagano" className="hover:text-brand">
                長野県
              </Link>
            </li>
            <li>
              <Link href="/prefecture/yamanashi" className="hover:text-brand">
                山梨県
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">テーマから探す</h3>
          <ul className="space-y-1 text-slate-600">
            <li>
              <Link href="/tag/rainy-day" className="hover:text-brand">
                ☂️ 雨の日OK
              </Link>
            </li>
            <li>
              <Link href="/tag/free" className="hover:text-emerald-600">
                🆓 無料で遊べる
              </Link>
            </li>
            <li>
              <Link href="/tag/kids-0-3" className="hover:text-brand">
                👶 0-3歳と
              </Link>
            </li>
            <li>
              <Link href="/tag/elementary" className="hover:text-brand">
                🧒 小学生と
              </Link>
            </li>
            <li>
              <Link href="/tag/winter" className="hover:text-brand">
                ⛄ 冬の雪遊び
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} trip-guide.net / FIC</span>
          <span>※ 料金・営業情報は変更されることがあります。各施設の公式サイトもご確認ください。</span>
        </div>
      </div>
    </footer>
  );
}
