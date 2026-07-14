import Link from "next/link";
import { SUMMER_2026_HUB_CONFIG } from "@/lib/feature-hubs";

const panelClass =
  "overflow-hidden rounded-3xl border text-white shadow-xl sm:rounded-3xl";

export default function SummerSeasonalCta() {
  return (
    <div
      data-seasonal-slot="summer-2026"
      className="order-0 mt-6 grid sm:mt-8"
    >
      <section
        data-seasonal-panel="summer-2026"
        data-seasonal-hub="summer-2026"
        data-seasonal-layout="block"
        aria-labelledby="summer-seasonal-cta-heading"
        className={`${panelClass} border-indigo-200 bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 shadow-indigo-200/50`}
      >
        <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            aria-hidden
          >
            <div className="absolute -right-8 -top-12 h-48 w-48 rounded-full border border-white/60" />
            <div className="absolute right-10 top-6 h-24 w-24 rounded-full border border-amber-200/80" />
            <div className="absolute bottom-2 left-1/3 h-16 w-16 rounded-full border border-pink-200/70" />
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold text-amber-200">
                2026年夏・公式一次情報を確認
              </p>
              <h2
                id="summer-seasonal-cta-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
              >
                {SUMMER_2026_HUB_CONFIG.ctaTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-50 sm:text-base">
                東京・神奈川・千葉・埼玉の花火大会と夏祭りを、開催日の近い順から探せます。
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
                <ShortcutLink href="/events/summer?quick=weekend#summer-filters">
                  今週末
                </ShortcutLink>
                <ShortcutLink href="/events/summer?type=fireworks#summer-filters">
                  花火大会
                </ShortcutLink>
                <ShortcutLink href="/events/summer?type=summer_festival#summer-filters">
                  夏祭り・盆踊り
                </ShortcutLink>
              </div>
            </div>
            <Link
              href={SUMMER_2026_HUB_CONFIG.path}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-bold text-indigo-950 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-amber-50 sm:w-auto"
            >
              夏祭り・花火を探す →
            </Link>
          </div>
        </div>
      </section>

      <section
        data-seasonal-panel="summer-2026"
        data-seasonal-fallback="summer-2026"
        data-seasonal-layout="block"
        aria-labelledby="standard-event-cta-heading"
        className={`${panelClass} border-sky-200 bg-gradient-to-br from-sky-700 via-cyan-700 to-emerald-700 shadow-sky-200/50`}
      >
        <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-bold text-cyan-100">
                公式情報をもとに随時更新
              </p>
              <h2
                id="standard-event-cta-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl"
              >
                季節・週末のイベント
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cyan-50 sm:text-base">
                開催日が決まった親子向けイベントを、エリアや今週末の条件から探せます。
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
                <StandardShortcutLink href="/events/tokyo">
                  東京
                </StandardShortcutLink>
                <StandardShortcutLink href="/events/kanagawa">
                  神奈川
                </StandardShortcutLink>
                <StandardShortcutLink href="/events/chiba">
                  千葉
                </StandardShortcutLink>
              </div>
            </div>
            <Link
              href="/events"
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-base font-bold text-sky-900 shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-cyan-50 sm:w-auto"
            >
              週末のイベントを見る →
            </Link>
          </div>
        </div>
      </section>
    </div>
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
      className="rounded-full border border-white/30 bg-white/10 px-3 py-2 hover:bg-white/20"
    >
      {children}
    </Link>
  );
}

function StandardShortcutLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/30 bg-white/10 px-3 py-2 hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
