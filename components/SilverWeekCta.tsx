import Link from "next/link";

export default function SilverWeekCta() {
  return (
    <section
      aria-labelledby="silver-week-cta-heading"
      className="order-0 mb-8 mt-6 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-orange-800 via-amber-700 to-rose-800 text-white shadow-xl shadow-amber-200/50 sm:mt-8 sm:rounded-3xl"
    >
      <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
        >
          <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/60" />
          <div className="absolute right-10 top-6 h-24 w-24 rounded-full border border-amber-200/80" />
          <div className="absolute bottom-2 left-1/3 h-16 w-16 rounded-full border border-orange-200/70" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2
              id="silver-week-cta-heading"
              className="text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            >
              🍂 シルバーウィークのおでかけ
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-50 sm:text-base">
              地域を選んで、この連休に行く理由がある候補をテーマ別に見つけられます。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
              <ShortcutLink href="/tag/rainy-day">雨でも遊べる</ShortcutLink>
              <ShortcutLink href="/events">イベントを探す</ShortcutLink>
              <ShortcutLink href="/tag/free">無料で遊べる</ShortcutLink>
              <ShortcutLink href="/facilities">近くから探す</ShortcutLink>
            </div>
          </div>
          <Link
            href="/events/silver-week"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-bold text-amber-950 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-amber-50 sm:w-auto"
          >
            地域別の特集を見る →
          </Link>
        </div>
      </div>
    </section>
  );
}

function ShortcutLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-full border border-white/30 bg-white/10 px-3 py-2 hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
