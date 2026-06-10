import Link from "next/link";
import QuickFilter from "@/components/QuickFilter";
import FacilityCard from "@/components/FacilityCard";
import MapViewClient from "@/components/MapViewClient";
import { JsonLd } from "@/components/JsonLd";
import { categories, facilities, prefectures } from "@/lib/facilities";
import { categoryIcon, prefectureEmoji, prefectureGradients } from "@/lib/icons";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

export default function HomePage() {
  const tagList = (
    Object.entries(RECOMMENDED_FOR_TAG_META) as [
      RecommendedForTag,
      (typeof RECOMMENDED_FOR_TAG_META)[RecommendedForTag],
    ][]
  )
    .map(([tag, meta]) => {
      const count = facilities.filter((facility) =>
        (facility.recommended_for_tags ?? []).includes(tag),
      ).length;

      return [tag, meta, count] as const;
    })
    .filter(([, , count]) => count > 0)
    .sort((a, b) => b[2] - a[2]);

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
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="text-white text-center lg:text-left">
              <p className="text-sm sm:text-base font-medium opacity-90 mb-3">
                関東甲信越9県 · {facilities.length}施設の子供向け遊び場
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4 drop-shadow-sm">
                子どもの&quot;好き&quot;が見える、
                <br />
                おでかけ記録サービス
              </h1>
              <p className="text-base opacity-95 mb-6 max-w-md mx-auto lg:mx-0">
                遊び場を探して、行きたい場所を保存。
                <br className="hidden sm:block" />
                行ったあとは、子どもの反応やまた行きたい場所を記録できます。
              </p>

              <p className="text-sm opacity-80 mb-2 font-medium">
                まずは遊び場を探す ↓
              </p>
              <form
                action="/facilities"
                className="max-w-md mx-auto lg:mx-0 mb-4"
              >
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

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/facilities"
                  className="inline-flex items-center justify-center gap-2 bg-white text-sky-600 hover:bg-sky-50 font-bold px-6 py-3 rounded-full shadow-md transition-colors text-sm sm:text-base"
                >
                  🗺️ 遊び場を探す
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/40 font-bold px-6 py-3 rounded-full transition-colors text-sm sm:text-base"
                >
                  ✨ メモリップをはじめる
                </Link>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-xs bg-white/15 lg:backdrop-blur-sm rounded-3xl p-5 border border-white/25 shadow-2xl text-white">
                <p className="text-xs font-semibold opacity-70 mb-4 flex items-center gap-1">
                  <span>📱</span> おでかけ記録プレビュー
                </p>

                <div className="flex gap-2 mb-4">
                  {[
                    ["12", "おでかけ"],
                    ["8", "施設"],
                    ["2", "こども"],
                  ].map(([number, label]) => (
                    <div
                      key={label}
                      className="flex-1 bg-white/20 rounded-xl py-2 text-center"
                    >
                      <div className="text-lg font-bold leading-none">
                        {number}
                      </div>
                      <div className="text-xs opacity-75 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/20 rounded-xl p-3 mb-3">
                  <p className="text-xs opacity-70 mb-1">📍 最近のおでかけ</p>
                  <p className="font-semibold text-sm">よこはまこどもの国</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">
                      😊 たのしかった
                    </span>
                    <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">
                      🔥 また行きたい
                    </span>
                  </div>
                </div>

                <div className="bg-white/20 rounded-xl p-3">
                  <p className="text-xs opacity-70 mb-2">
                    👧 ゆいちゃんの好き
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["🐾 動物", "🛝 遊具", "💧 水遊び", "🌲 自然"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-white/30 rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="bg-slate-50 border-b border-slate-100 py-10"
        aria-labelledby="steps-heading"
      >
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="steps-heading" className="sr-only">
            メモリップの使い方
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-2xl">
                🔍
              </div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">
                遊び場を探す
              </p>
              <p className="text-xs text-slate-500 hidden sm:block">
                条件・エリア・タグで検索
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-2xl">
                📝
              </div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">
                記録する
              </p>
              <p className="text-xs text-slate-500 hidden sm:block">
                感想・反応・また行くかを保存
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
                ✨
              </div>
              <p className="font-bold text-slate-900 text-sm sm:text-base">
                好きが見える
              </p>
              <p className="text-xs text-slate-500 hidden sm:block">
                子どもの興味・傾向がわかる
              </p>
            </div>
          </div>
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

        <section className="mt-14" aria-labelledby="tag-heading">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 id="tag-heading" className="text-2xl font-bold text-slate-900">
                こんな遊びが好きな子に
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                お子さんの「好き」から遊び場を探す
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tagList.map(([tag, meta, count]) => (
              <Link
                key={tag}
                href={`/facilities?recommended_tag=${tag}`}
                className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md rounded-2xl p-3 transition-all"
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {meta.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 group-hover:text-sky-600 line-clamp-1">
                    {meta.label}
                  </p>
                  <p className="text-xs text-slate-500">{count} 施設</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <QuickFilter />

        <section className="mt-14" aria-labelledby="area-heading">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 id="area-heading" className="text-2xl font-bold text-slate-900">
                エリアから探す
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {prefectures.length}県{facilities.length}施設をエリア別にチェック
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
