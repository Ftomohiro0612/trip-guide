import Link from "next/link";
import QuickFilter from "@/components/QuickFilter";
import FacilityCard from "@/components/FacilityCard";
import MapViewClient from "@/components/MapViewClient";
import { JsonLd } from "@/components/JsonLd";
import { categories, facilities, prefectures } from "@/lib/facilities";
import { categoryIcon, prefectureEmoji, prefectureGradients } from "@/lib/icons";
import { TAG_META } from "@/lib/tags";

export default function HomePage() {
  const featured = facilities
    .filter((f) => f.rain_friendly === "◎" || f.is_free)
    .slice(0, 6);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "trip-guide.net",
    url: "https://trip-guide.net",
    inLanguage: "ja",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://trip-guide.net/facilities?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <JsonLd data={websiteJsonLd} />
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.3),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20 text-center text-white">
          <p className="text-sm sm:text-base font-medium opacity-90 mb-3">
            🗻 静岡 · 🏔️ 長野 · 🍇 山梨 / 全 {facilities.length} 施設
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4 drop-shadow-sm">
            子供が楽しめる遊び場が、
            <br className="hidden sm:block" />
            すぐ見つかる！
          </h1>
          <p className="text-base sm:text-lg opacity-95 mb-8 max-w-2xl mx-auto">
            「今日どこ行く？」を3秒で解決。雨の日も、無料も、年齢別も、ここから。
          </p>
          <form action="/facilities" className="max-w-xl mx-auto">
            <div className="flex bg-white rounded-full shadow-xl overflow-hidden p-1.5">
              <input
                type="search"
                name="q"
                placeholder="施設名・地域・カテゴリで検索"
                className="flex-1 px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none text-sm sm:text-base"
              />
              <button
                type="submit"
                className="bg-brand hover:bg-brand-dark text-white font-bold px-5 sm:px-6 py-2.5 rounded-full transition-colors text-sm sm:text-base"
              >
                🔍 検索
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="mt-8" aria-labelledby="map-heading">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 id="map-heading" className="text-2xl font-bold text-slate-900">
                地図から探す
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                マーカーをクリックすると詳細ページへ。県の絞り込みもできます。
              </p>
            </div>
          </div>
          <MapViewClient facilities={facilities} height={520} />
        </section>

        <QuickFilter />

        <section className="mt-14" aria-labelledby="area-heading">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 id="area-heading" className="text-2xl font-bold text-slate-900">
                エリアから探す
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                3県151施設をエリア別にチェック
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {prefectures.map((p) => (
              <Link
                key={p.id}
                href={`/prefecture/${p.id}`}
                className="group relative rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[3/4] shadow-md hover:shadow-xl transition-all"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${prefectureGradients[p.id]} group-hover:scale-105 transition-transform duration-500`}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="relative h-full p-6 flex flex-col justify-between text-white">
                  <span className="text-5xl drop-shadow" aria-hidden>
                    {prefectureEmoji[p.id]}
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold drop-shadow">{p.name}</h3>
                    <p className="text-sm opacity-95 mt-1">
                      {p.count} 施設 / 詳細を見る →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="category-heading">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2
                id="category-heading"
                className="text-2xl font-bold text-slate-900"
              >
                カテゴリから探す
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                目的にあった遊び場をピンポイントで
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.id}`}
                className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-brand hover:shadow-md rounded-2xl p-3 transition-all"
              >
                <span className="text-3xl shrink-0" aria-hidden>
                  {categoryIcon(c.id)}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 group-hover:text-brand line-clamp-1">
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-500">{c.count} 施設</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 mb-4" aria-labelledby="featured-heading">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2
                id="featured-heading"
                className="text-2xl font-bold text-slate-900"
              >
                ピックアップ
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                雨の日OK・無料で遊べるおすすめ施設
              </p>
            </div>
            <Link
              href="/facilities"
              className="text-sm font-medium text-brand hover:text-brand-dark"
            >
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((f) => (
              <FacilityCard key={f.id} facility={f} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
