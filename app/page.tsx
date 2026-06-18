import Image from "next/image";
import Link from "next/link";
import FacilityCard from "@/components/FacilityCard";
import HeroSearch from "@/components/HeroSearch";
import { JsonLd } from "@/components/JsonLd";
import MapViewClient from "@/components/MapViewClient";
import QuickFilter from "@/components/QuickFilter";
import { FEATURED_FACILITY_IDS } from "@/lib/config";
import {
  categories,
  getFacilitiesByCategory,
  getFacilitiesByPrefecture,
  prefectures,
  visibleFacilities,
} from "@/lib/facilities";
import { categoryIcon, prefectureIconImages } from "@/lib/icons";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type {
  Facility,
  FacilityTag,
  RecommendedForTag,
} from "@/types/facility";

function HeroBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.13]"
        viewBox="0 0 1200 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-60 510 C120 430 210 470 330 390 S560 250 720 290 940 220 1260 80"
          stroke="white"
          strokeWidth="4"
          strokeDasharray="10 16"
          strokeLinecap="round"
        />
        <path
          d="M214 408 C204 408 196 416 196 427 C196 440 214 463 214 463 S232 440 232 427 C232 416 224 408 214 408Z"
          fill="white"
        />
        <circle cx="214" cy="427" r="6" fill="#38bdf8" opacity="0.45" />
        <path
          d="M626 252 C616 252 608 260 608 271 C608 284 626 307 626 307 S644 284 644 271 C644 260 636 252 626 252Z"
          fill="white"
        />
        <circle cx="626" cy="271" r="6" fill="#10b981" opacity="0.45" />
        <path
          d="M996 160 C986 160 978 168 978 179 C978 192 996 215 996 215 S1014 192 1014 179 C1014 168 1006 160 996 160Z"
          fill="white"
        />
        <circle cx="996" cy="179" r="6" fill="#06b6d4" opacity="0.45" />
        <path
          d="M596 310 C596 286 610 272 626 272 C642 272 656 286 656 310"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M626 311 C626 291 614 286 602 283 C606 298 614 306 626 311Z"
          fill="white"
        />
        <path
          d="M626 309 C627 288 640 282 654 278 C651 295 641 305 626 309Z"
          fill="white"
          opacity="0.75"
        />
        <path
          d="M1055 128 L1058 140 L1071 143 L1058 146 L1055 158 L1052 146 L1039 143 L1052 140Z"
          fill="white"
        />
        <path
          d="M452 160 L454 168 L462 170 L454 172 L452 180 L450 172 L442 170 L450 168Z"
          fill="white"
          opacity="0.85"
        />
        <g opacity="0.9">
          <ellipse
            cx="112"
            cy="286"
            rx="17"
            ry="10"
            transform="rotate(-28 112 286)"
            fill="white"
          />
          <ellipse
            cx="154"
            cy="309"
            rx="17"
            ry="10"
            transform="rotate(-28 154 309)"
            fill="white"
          />
          <ellipse
            cx="127"
            cy="337"
            rx="10"
            ry="6"
            transform="rotate(-28 127 337)"
            fill="white"
            opacity="0.78"
          />
          <ellipse
            cx="151"
            cy="351"
            rx="10"
            ry="6"
            transform="rotate(-28 151 351)"
            fill="white"
            opacity="0.78"
          />
        </g>
        <g opacity="0.72">
          <ellipse
            cx="830"
            cy="478"
            rx="16"
            ry="9"
            transform="rotate(18 830 478)"
            fill="white"
          />
          <ellipse
            cx="872"
            cy="464"
            rx="16"
            ry="9"
            transform="rotate(18 872 464)"
            fill="white"
          />
          <ellipse
            cx="884"
            cy="504"
            rx="9"
            ry="5.5"
            transform="rotate(18 884 504)"
            fill="white"
            opacity="0.8"
          />
          <ellipse
            cx="909"
            cy="496"
            rx="9"
            ry="5.5"
            transform="rotate(18 909 496)"
            fill="white"
            opacity="0.8"
          />
        </g>
        <path
          d="M820 610 C900 560 980 560 1060 610 M790 570 C900 500 1020 500 1130 570 M770 530 C900 440 1040 440 1170 530 M760 490 C900 380 1060 390 1210 490"
          stroke="white"
          strokeWidth="2"
          opacity="0.45"
        />
        <path
          d="M40 130 H220 M60 170 H260 M20 210 H200"
          stroke="white"
          strokeWidth="1.5"
          opacity="0.35"
        />
      </svg>
    </div>
  );
}

function countByFacilityTag(tag: FacilityTag) {
  return visibleFacilities.filter((facility) => facility.tags.includes(tag))
    .length;
}

function countByRecommendedTag(tag: RecommendedForTag) {
  return visibleFacilities.filter((facility) =>
    (facility.recommended_for_tags ?? []).includes(tag),
  ).length;
}

export default function HomePage() {
  const facilityCountLabel =
    visibleFacilities.length >= 1000
      ? "1,000施設超"
      : `${visibleFacilities.length}施設`;
  const totalFacilityCountLabel =
    visibleFacilities.length.toLocaleString("ja-JP");
  const primaryPrefecture =
    prefectures.find((prefecture) => prefecture.name === "東京都") ??
    prefectures[0];
  const heroQuickLinks = [
    { label: "現在地から探す", icon: "📍", href: "/facilities" },
    { label: "雨の日OK", icon: "☔", href: "/tag/rainy-day" },
    { label: "無料", icon: "🆓", href: "/tag/free" },
    {
      label: primaryPrefecture.name,
      icon: "🗾",
      href: `/prefecture/${primaryPrefecture.id}`,
    },
    {
      label: "水遊び",
      icon: RECOMMENDED_FOR_TAG_META.water_play.icon,
      href: "/facilities?recommended_tag=water_play",
    },
  ];
  const themeLinks = [
    {
      label: "雨の日OK",
      icon: "☔",
      href: "/tag/rainy-day",
      count: countByFacilityTag("雨の日OK"),
    },
    {
      label: "無料",
      icon: "🆓",
      href: "/tag/free",
      count: countByFacilityTag("無料"),
    },
    {
      label: "水遊び",
      icon: RECOMMENDED_FOR_TAG_META.water_play.icon,
      href: "/facilities?recommended_tag=water_play",
      count: countByRecommendedTag("water_play"),
    },
    {
      label: "大型遊具",
      icon: RECOMMENDED_FOR_TAG_META.playground.icon,
      href: "/facilities?recommended_tag=playground",
      count: countByRecommendedTag("playground"),
    },
    {
      label: "0〜3歳",
      icon: "👶",
      href: "/tag/kids-0-3",
      count: countByFacilityTag("0-3歳OK"),
    },
    {
      label: "小学生向け",
      icon: "🧒",
      href: "/tag/elementary",
      count: countByFacilityTag("小学生向け"),
    },
  ];
  const recordTeaserItems = [
    "行った場所を残せる",
    "子どもの反応が見える",
    "次のおでかけ候補が見つかる",
  ];
  const featured = FEATURED_FACILITY_IDS.map((id) =>
    visibleFacilities.find((facility) => facility.id === id),
  ).filter((facility): facility is Facility => Boolean(facility));

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "メモリップ",
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.42),transparent_45%),radial-gradient(circle_at_82%_86%,rgba(255,255,255,0.28),transparent_44%)]" />
        <HeroBackground />

        <div className="relative mx-auto max-w-6xl px-4 py-10 text-center text-white sm:py-12 lg:py-16">
          <p className="mb-4 inline-flex items-center rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm sm:text-sm">
            <span aria-hidden>📍</span>
            <span className="ml-1">
              関東甲信越{prefectures.length}県 · {facilityCountLabel}掲載中
            </span>
          </p>
          <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight drop-shadow-sm text-balance sm:text-5xl lg:text-[3.35rem]">
            子どもと行ける場所を、近くから探す。
          </h1>
          <p className="sr-only">子どもと行ける場所を探せるメモリップ</p>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg">
            雨の日、無料、水遊び、遊具、近くの施設。行った場所を記録すると、子どもの“好き”も少しずつ見えてきます。
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-2xl sm:text-base"
            >
              <span aria-hidden>🗺️</span>
              遊び場を探す
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:text-base"
            >
              <span aria-hidden>✨</span>
              家族の記録をはじめる
            </Link>
          </div>
          <p className="mt-3 text-xs font-medium text-white/85">
            掲載エリアは順次追加・更新中
          </p>

          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
            {heroQuickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-white/18 px-3 py-2 text-xs font-bold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/28 sm:text-sm"
              >
                <span aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mx-auto mt-7 max-w-2xl">
            <HeroSearch />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <section className="mt-8" aria-labelledby="map-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="map-heading"
                className="text-2xl font-bold text-slate-900"
              >
                地図で探す
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                現在地・県・カテゴリから、近くの遊び場を見つけられます。
              </p>
            </div>
            <Link
              href="/map"
              className="text-sm font-medium text-brand hover:text-brand-dark"
            >
              大きな地図で見る →
            </Link>
          </div>
          <MapViewClient
            facilities={visibleFacilities}
            height={520}
            storageKey="home"
          />
        </section>

        <section className="mt-14" aria-labelledby="tag-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="tag-heading"
                className="text-2xl font-bold text-slate-900"
              >
                テーマで探す
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                雨の日・無料・水遊びなど、今日の条件から選べます。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {themeLinks.map((theme) => (
              <Link
                key={theme.href}
                href={theme.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-sky-400 hover:shadow-md"
              >
                <span className="shrink-0 text-2xl" aria-hidden>
                  {theme.icon}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-sky-600">
                    {theme.label}
                  </p>
                  <p className="text-xs text-slate-500">{theme.count} 施設</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <QuickFilter />

        <section className="mt-14" aria-labelledby="category-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="category-heading"
                className="text-2xl font-bold text-slate-900"
              >
                カテゴリから探す
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                目的にあった遊び場をピンポイントで。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-brand hover:shadow-md"
              >
                <span className="shrink-0 text-3xl" aria-hidden>
                  {categoryIcon(category.id)}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-brand">
                    {category.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {getFacilitiesByCategory(category.id).length} 施設
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="area-heading">
          <div className="mb-6 text-center">
            <h2 id="area-heading" className="text-2xl font-bold text-slate-900">
              エリアで探す
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              関東甲信越{prefectures.length}県・
              {totalFacilityCountLabel}施設を掲載中（順次追加・更新中）
            </p>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-9 sm:gap-x-4">
            {prefectures.map((prefecture) => (
              <Link
                key={prefecture.id}
                href={`/prefecture/${prefecture.id}`}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-2 text-center transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                aria-label={`${prefecture.name}の遊び場を探す`}
              >
                <Image
                  src={prefectureIconImages[prefecture.id]}
                  alt=""
                  width={64}
                  height={64}
                  className="h-12 w-12 object-contain drop-shadow-sm transition-transform group-hover:scale-105 sm:h-14 sm:w-14"
                  aria-hidden
                />
                <span className="text-sm font-bold leading-tight text-slate-800 group-hover:text-brand">
                  {prefecture.name}
                </span>
                <span className="text-[11px] leading-none text-slate-400">
                  {getFacilitiesByPrefecture(prefecture.id).length}施設
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="featured-heading">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="featured-heading"
                className="text-2xl font-bold text-slate-900"
              >
                おすすめの遊び場
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                大型公園・自然・科学館など、定番スポットをピックアップ。
              </p>
            </div>
            <Link
              href="/facilities"
              className="text-sm font-medium text-brand hover:text-brand-dark"
            >
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((facility) => (
              <FacilityCard key={facility.id} facility={facility} />
            ))}
          </div>
        </section>

        <section
          className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          aria-labelledby="record-teaser-heading"
        >
          <h2
            id="record-teaser-heading"
            className="text-2xl font-bold text-slate-900"
          >
            メモリップで記録するとできること
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            行った場所を記録すると、子どもの“好き”や次に行きたい場所が見えてきます。
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recordTeaserItems.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
          <Link
            href="/guide"
            className="mt-5 inline-flex text-sm font-bold text-brand hover:text-brand-dark"
          >
            メモリップでできること →
          </Link>
        </section>

        <section className="mt-14 mb-8 rounded-3xl bg-slate-900 px-6 py-10 text-center text-white sm:px-8">
          <h2 className="text-2xl font-bold text-balance sm:text-3xl">
            次のおでかけ先を探す
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            近くの遊び場から、雨の日・無料・水遊びまで。家族に合う場所を見つけましょう。
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-sky-50 sm:text-base"
            >
              遊び場を探す
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:text-base"
            >
              家族の記録をはじめる
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
