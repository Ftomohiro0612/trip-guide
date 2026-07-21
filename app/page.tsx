import Image from "next/image";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityCard from "@/components/FacilityCard";
import HeroSearch from "@/components/HeroSearch";
import { JsonLd } from "@/components/JsonLd";
import MapViewClient from "@/components/MapViewClient";
import SummerSeasonalCta from "@/components/SummerSeasonalCta";
import {
  PreferenceRankingMiniExample,
  RecommendationMiniExample,
  StepOutingIcon,
  StepRecordIcon,
  StepSearchIcon,
} from "@/components/MemoripFlowFigures";
import { FEATURED_FACILITY_IDS } from "@/lib/config";
import {
  categories,
  getFacilitiesByCategory,
  getFacilitiesByPrefecture,
  prefectures,
  visibleFacilities,
} from "@/lib/facilities";
import { prefectureIconImages } from "@/lib/icons";
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

function HeroMemoryCardCluster() {
  return (
    // W5: 薄いスマホ画面風コンテナ。検索導線が主役のまま、PC幅は抑える。
    <div
      className="relative mx-auto w-full max-w-[19.5rem] rounded-[2rem] border border-white/65 bg-white/28 p-2.5 text-slate-900 shadow-lg shadow-sky-900/10 backdrop-blur-md lg:mx-0 lg:max-w-[18.5rem] xl:max-w-[19rem]"
      aria-label="メモリップに家族の記録がたまっていくスマホ画面風コンテナ"
    >
      <div className="overflow-hidden rounded-[1.55rem] border border-slate-900/10 bg-sky-50/95 shadow-sm shadow-slate-900/5">
        <div className="border-b border-slate-200/80 bg-white/92 px-4 pb-3 pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold tracking-normal text-slate-900">
              メモリップ
            </p>
            <div
              className="flex items-center gap-1.5 text-slate-400"
              aria-hidden
            >
              <span className="h-1.5 w-5 rounded-full bg-slate-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5" aria-hidden>
            <span className="h-1 rounded-full bg-sky-300/80 w-12" />
            <span className="h-1 rounded-full bg-emerald-300/80 w-8" />
            <span className="h-1 rounded-full bg-slate-200 w-16" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3">
          <div className="col-span-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm shadow-sky-900/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-sky-500">最近の記録</p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  📍 こども自然公園
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  水遊びに夢中 · また行きたい
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                24件
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm shadow-sky-900/5">
            <p className="text-xs font-bold text-emerald-600">好きTOP3</p>
            <div className="mt-3 space-y-2">
              {[
                ["水遊び", "w-full"],
                ["大型遊具", "w-3/4"],
                ["動物", "w-1/2"],
              ].map(([label, width]) => (
                <div key={label}>
                  <div className="mb-1 text-[11px] font-bold text-slate-700">
                    {label}
                  </div>
                  <div className="h-2 rounded-full bg-emerald-50">
                    <div
                      className={`h-2 rounded-full bg-emerald-400 ${width}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-sm shadow-sky-900/5">
            <Image
              src="/guide/photo-now-lookback.png"
              alt=""
              width={1448}
              height={1086}
              className="aspect-[4/3] w-full rounded-xl object-cover"
              sizes="152px"
              aria-hidden
            />
            <p className="mt-2 px-1 text-xs font-bold text-slate-700">
              写真も一緒に
            </p>
          </div>

          <div className="col-span-2 grid grid-cols-[0.82fr_1.18fr] gap-2.5">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-sm shadow-sky-900/5">
              <Image
                src="/guide/photo-now-record.png"
                alt=""
                width={1448}
                height={1086}
                className="aspect-square w-full rounded-xl object-cover"
                sizes="110px"
                aria-hidden
              />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm shadow-sky-900/5">
              <p className="text-xs font-bold text-cyan-600">行った場所</p>
              <div className="mt-3 space-y-2 text-xs font-bold text-slate-700">
                <p>6月 じゃぶじゃぶ池</p>
                <p>5月 科学館</p>
                <p>4月 大きな公園</p>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      ? `${(
          Math.floor(visibleFacilities.length / 100) * 100
        ).toLocaleString("ja-JP")}施設超`
      : `${visibleFacilities.length}施設`;
  const totalFacilityCountLabel =
    visibleFacilities.length.toLocaleString("ja-JP");
  const primaryPrefecture =
    prefectures.find((prefecture) => prefecture.name === "東京都") ??
    prefectures[0];
  const heroQuickLinks = [
    { label: "現在地から探す", icon: "📍", href: "/facilities" },
    { label: "雨の日でも遊べる", icon: "☔", href: "/tag/rainy-day" },
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
      label: "雨の日でも遊べる",
      icon: "☔",
      href: "/tag/rainy-day",
      count: visibleFacilities.filter((f) => f.rain_friendly === "◎").length,
      bg: "bg-sky-50",
      border: "border-sky-200",
      hoverBorder: "hover:border-sky-400 focus-visible:border-sky-400",
      focusRing: "focus-visible:ring-sky-200",
    },
    {
      label: "入場無料",
      icon: "🆓",
      href: "/tag/free",
      count: countByFacilityTag("無料"),
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      hoverBorder: "hover:border-emerald-400 focus-visible:border-emerald-400",
      focusRing: "focus-visible:ring-emerald-200",
    },
    {
      label: "水遊び",
      icon: RECOMMENDED_FOR_TAG_META.water_play.icon,
      href: "/facilities?recommended_tag=water_play",
      count: countByRecommendedTag("water_play"),
      bg: "bg-violet-50",
      border: "border-violet-200",
      hoverBorder: "hover:border-violet-400 focus-visible:border-violet-400",
      focusRing: "focus-visible:ring-violet-200",
    },
    {
      label: "大型遊具",
      icon: RECOMMENDED_FOR_TAG_META.playground.icon,
      href: "/facilities?recommended_tag=playground",
      count: countByRecommendedTag("playground"),
      bg: "bg-amber-50",
      border: "border-amber-200",
      hoverBorder: "hover:border-amber-400 focus-visible:border-amber-400",
      focusRing: "focus-visible:ring-amber-200",
    },
    {
      label: "0〜3歳",
      icon: "👶",
      href: "/tag/kids-0-3",
      count: countByFacilityTag("0-3歳OK"),
      bg: "bg-pink-50",
      border: "border-pink-200",
      hoverBorder: "hover:border-pink-400 focus-visible:border-pink-400",
      focusRing: "focus-visible:ring-pink-200",
    },
    {
      label: "小学生向け",
      icon: "🧒",
      href: "/tag/elementary",
      count: countByFacilityTag("小学生向け"),
      bg: "bg-orange-50",
      border: "border-orange-200",
      hoverBorder: "hover:border-orange-400 focus-visible:border-orange-400",
      focusRing: "focus-visible:ring-orange-200",
    },
  ];
  const featured = FEATURED_FACILITY_IDS.map((id) =>
    visibleFacilities.find((facility) => facility.id === id),
  ).filter((facility): facility is Facility => Boolean(facility));

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "メモリップ",
    alternateName: "Memorips",
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

        <div className="relative mx-auto max-w-6xl px-4 py-10 text-white sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="flex flex-col text-center lg:text-left">
              <p className="mb-4 inline-flex items-center self-center rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm sm:text-sm lg:self-start">
                <span aria-hidden>📍</span>
                <span className="ml-1">
                  {`無料で遊び場検索｜全国${prefectures.length}都府県・${facilityCountLabel}掲載中`}
                </span>
              </p>
              <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight drop-shadow-sm text-balance sm:text-5xl lg:mx-0 lg:text-[3rem]">
                <span className="inline-block">子どもと行ける場所を、</span>
                <br className="hidden sm:block" />
                <span className="inline-block">近くから探す。</span>
              </h1>
              <p className="sr-only">子どもと行ける場所を探せるメモリップ</p>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg lg:mx-0">
                雨の日、無料、水遊び、遊具、近くの施設。行った場所を記録すると、子どもの“好き”も少しずつ見えてきます。
              </p>

              <div className="mx-auto mt-7 w-full max-w-2xl lg:mx-0">
                <HeroSearch />
              </div>

              <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2 lg:mx-0 lg:justify-start">
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

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/facilities"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-2xl sm:text-base"
                >
                  <span aria-hidden>📋</span>
                  一覧から探す
                </Link>
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/70 bg-white/20 px-6 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/30 sm:text-base"
                >
                  <span aria-hidden>🎪</span>
                  イベントを探す
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:text-base"
                >
                  <span aria-hidden>✨</span>
                  メモリップでできること
                </Link>
              </div>
              <p className="mt-2 text-xs font-medium text-white/85">
                登録なしで、無料で遊び場を探せます。
              </p>
              <Link
                href="/auth/register"
                className="mt-3 text-xs font-bold text-white/90 underline decoration-white/60 underline-offset-4 transition-colors hover:text-sky-50 lg:self-start"
              >
                家族の記録をはじめる（無料）→
              </Link>
            </div>

            <div className="flex justify-center lg:justify-end">
              <HeroMemoryCardCluster />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col px-4">
        <SummerSeasonalCta />

        <section
          className="order-1 mt-8"
          aria-labelledby="map-heading"
        >
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

        <section
          className="order-2 mt-8 lg:mt-14"
          aria-labelledby="tag-heading"
        >
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {themeLinks.map((theme) => (
              <Link
                key={theme.href}
                href={theme.href}
                className={`group flex items-center gap-3 rounded-2xl border ${theme.border} ${theme.bg} p-3 shadow-sm transition-all ${theme.hoverBorder} hover:shadow-md focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 ${theme.focusRing}`}
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

        <section
          className="order-4 mt-14 lg:order-4"
          aria-labelledby="category-heading"
        >
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-brand hover:shadow-md"
              >
                <CategoryIcon
                  categoryId={category.id}
                  width={64}
                  height={64}
                  className="h-10 w-10 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105"
                />
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

        <section
          className="order-5 mt-14 lg:order-5"
          aria-labelledby="area-heading"
        >
          <div className="mb-6 text-center">
            <h2 id="area-heading" className="text-2xl font-bold text-slate-900">
              エリアで探す
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              全国{prefectures.length}都府県・
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

        <section
          className="order-6 mt-14 lg:order-6"
          aria-labelledby="featured-heading"
        >
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
          className="order-7 my-14 rounded-3xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/50 p-6 shadow-sm shadow-emerald-100/50 sm:p-8 lg:order-7"
          aria-labelledby="record-value-heading"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="record-value-heading"
              className="text-balance text-2xl font-bold text-slate-900 sm:text-3xl"
            >
              記録すると、次のおでかけが見つけやすくなる
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              行った場所と子どもの反応を少し残しておくと、あとから“この子は何が好きだったか”を振り返れます。記録が増えるほど、次に行きたい場所も見つけやすくなります。
            </p>
          </div>
          <div
            className="mt-7 grid grid-cols-1 gap-3 lg:grid-cols-[0.54fr_auto_0.54fr_auto_1.08fr_auto_1.18fr] lg:items-stretch"
            aria-label="記録から次のおでかけにつながる4ステップ"
          >
            {[
              {
                label: "探す",
                icon: StepSearchIcon,
                step: "STEP 01",
                iconShellClass: "bg-sky-50 ring-sky-100",
                stepClass: "text-sky-500",
              },
              {
                label: "行く",
                icon: StepOutingIcon,
                step: "STEP 02",
                iconShellClass: "bg-cyan-50 ring-cyan-100",
                stepClass: "text-cyan-500",
              },
            ].map((item, index) => (
              <div key={item.label} className="contents">
                <div className="flex min-h-16 items-center justify-center gap-3 rounded-full border border-emerald-100 bg-white/85 px-4 py-3 text-center shadow-sm shadow-emerald-100/40 lg:min-h-32 lg:flex-col lg:rounded-2xl lg:p-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 lg:h-14 lg:w-14 ${item.iconShellClass}`}
                  >
                    <item.icon />
                  </span>
                  <div>
                    <p
                      className={`text-[10px] font-bold lg:text-xs ${item.stepClass}`}
                    >
                      {item.step}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold text-slate-900 lg:mt-1">
                      {item.label}
                    </h3>
                  </div>
                </div>

                {index < 1 && (
                  <div
                    className="hidden items-center justify-center text-xl font-bold text-emerald-400 lg:flex lg:px-1"
                    aria-hidden
                  >
                    →
                  </div>
                )}
              </div>
            ))}

            <div
              className="hidden items-center justify-center text-xl font-bold text-emerald-400 lg:flex lg:px-1"
              aria-hidden
            >
              →
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm shadow-emerald-100/40 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 lg:h-14 lg:w-14">
                  <StepRecordIcon />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-emerald-500 lg:text-xs">
                    STEP 03
                  </p>
                  <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                    記録がたまると、“好き”が見えてくる
                  </h3>
                </div>
              </div>
              <PreferenceRankingMiniExample compact />
            </div>

            <div
              className="hidden items-center justify-center text-xl font-bold text-emerald-400 lg:flex lg:px-1"
              aria-hidden
            >
              →
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm shadow-amber-100/40 sm:p-5">
              <p className="text-xs font-bold text-amber-500">STEP 04</p>
              <h3 className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">
                好きから、次の候補が見つかる
              </h3>
              <RecommendationMiniExample compact />
            </div>
          </div>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 sm:text-base"
            >
              遊び場を探す
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center justify-center px-3 py-3 text-sm font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition-colors hover:text-emerald-800 sm:text-base"
            >
              メモリップでできることを見る →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
