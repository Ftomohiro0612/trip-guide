import Image from "next/image";
import Link from "next/link";
import FacilityCard from "@/components/FacilityCard";
import HeroSearch from "@/components/HeroSearch";
import { JsonLd } from "@/components/JsonLd";
import MapViewClient from "@/components/MapViewClient";
import {
  PreferenceRankingMiniExample,
  RecommendationMiniExample,
  StepOutingIcon,
  StepRecordIcon,
  StepSearchIcon,
} from "@/components/MemoripFlowFigures";
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

function MemoryPreviewCard() {
  return (
    <div className="relative mx-auto w-[min(100%,22.5rem)] pb-8 pt-2 lg:mx-0 lg:pb-9 lg:pt-3">
      <div className="absolute -right-3 top-8 h-[86%] w-[92%] rotate-6 rounded-[2rem] border border-white/70 bg-white/45 shadow-xl backdrop-blur-sm" />
      <div className="absolute -right-1 top-2 h-[86%] w-[92%] rotate-3 rounded-[2rem] border border-white/80 bg-white/65 shadow-xl backdrop-blur-sm" />

      <div className="relative rotate-1 rounded-[2rem] border border-white/80 bg-white p-5 text-slate-900 shadow-2xl sm:rotate-2 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-2xl">
              🌸
            </div>
            <div>
              <p className="text-[15px] font-bold">ゆいちゃん (7歳)</p>
              <p className="text-xs text-slate-400">おでかけ記録</p>
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3.5 py-2 text-right">
            <p className="text-[10px] font-bold text-emerald-600">今月</p>
            <p className="text-[15px] font-bold text-emerald-700">3回</p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                最近の記録
              </p>
              <p className="mt-1 text-[15px] font-bold">
                📍 よこはまこどもの国
              </p>
              <p className="mt-1 text-xs text-slate-500">6月8日 · ☀️</p>
            </div>
            <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-sky-600 shadow-sm">
              累計 24回
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
              😊 たのしかった
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
              🔥 また行きたい
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <span className="text-amber-400">★★★★</span>
            <span className="text-slate-300">★</span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[15px] font-bold">
            ゆいちゃんの&quot;好き&quot; TOP3
          </p>
          <div className="mt-3 space-y-3">
            {[
              ["1", "🐾 動物", "12回", "w-full"],
              ["2", "💧 水遊び", "8回", "w-2/3"],
              ["3", "🛝 遊具", "5回", "w-1/2"],
            ].map(([rank, label, count, width]) => (
              <div key={rank}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    {rank}. {label}
                  </span>
                  <span className="text-slate-400">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full bg-emerald-400 ${width}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-bold text-slate-600">
            📸 写真もまとめて思い出に（近日公開）
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-300">
              🖼️
            </div>
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-300">
              ✨
            </div>
          </div>
        </div>
      </div>

      <p className="relative mt-4 text-center text-xs font-medium text-white/85 drop-shadow-sm">
        あなたの家族の記録がここにたまっていきます
      </p>
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

        <div className="relative mx-auto max-w-6xl px-4 py-10 text-white sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
            <div className="flex flex-col text-center lg:text-left">
              <p className="mb-4 inline-flex items-center self-center rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm sm:text-sm lg:self-start">
                <span aria-hidden>📍</span>
                <span className="ml-1">
                  関東甲信越{prefectures.length}県 · {facilityCountLabel}掲載中
                </span>
              </p>
              <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight drop-shadow-sm text-balance sm:text-5xl lg:mx-0 lg:text-[3.35rem]">
                子どもと行ける場所を、近くから探す。
              </h1>
              <p className="sr-only">子どもと行ける場所を探せるメモリップ</p>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg lg:mx-0">
                雨の日、無料、水遊び、遊具、近くの施設。行った場所を記録すると、子どもの“好き”も少しずつ見えてきます。
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/facilities"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-2xl sm:text-base"
                >
                  <span aria-hidden>🗺️</span>
                  遊び場を探す
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:text-base"
                >
                  <span aria-hidden>✨</span>
                  メモリップでできること
                </Link>
              </div>
              <Link
                href="/auth/register"
                className="mt-3 text-xs font-bold text-white/90 underline decoration-white/60 underline-offset-4 transition-colors hover:text-sky-50 lg:self-start"
              >
                家族の記録をはじめる →
              </Link>

              <div className="order-5 mx-auto mt-7 w-full max-w-2xl lg:order-6 lg:mx-0">
                <HeroSearch />
              </div>

              <div className="order-6 mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2 lg:order-5 lg:mx-0 lg:justify-start">
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
            </div>

            <div className="flex justify-center lg:justify-end">
              <MemoryPreviewCard />
            </div>
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
          className="my-14 rounded-3xl border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/50 p-6 shadow-sm shadow-emerald-100/50 sm:p-8"
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
            className="mt-7 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.76fr)_auto_minmax(0,0.76fr)_auto_minmax(0,0.76fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1.2fr)] lg:items-stretch lg:gap-3"
            aria-label="記録から次のおでかけにつながる5段階フロー"
          >
            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-sky-100 bg-white/85 p-4 text-center shadow-sm shadow-emerald-100/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                <StepSearchIcon />
              </span>
              <p className="mt-3 text-xs font-bold text-sky-500">STEP 01</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">探す</h3>
            </div>

            <div className="flex items-center justify-center text-xl font-bold text-emerald-400 lg:px-1">
              <span className="hidden lg:inline" aria-hidden>
                →
              </span>
              <span className="lg:hidden" aria-hidden>
                ↓
              </span>
            </div>

            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-cyan-100 bg-white/85 p-4 text-center shadow-sm shadow-emerald-100/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 ring-1 ring-cyan-100">
                <StepOutingIcon />
              </span>
              <p className="mt-3 text-xs font-bold text-cyan-500">STEP 02</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">行く</h3>
            </div>

            <div className="flex items-center justify-center text-xl font-bold text-emerald-400 lg:px-1">
              <span className="hidden lg:inline" aria-hidden>
                →
              </span>
              <span className="lg:hidden" aria-hidden>
                ↓
              </span>
            </div>

            <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white/85 p-4 text-center shadow-sm shadow-emerald-100/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                <StepRecordIcon />
              </span>
              <p className="mt-3 text-xs font-bold text-emerald-500">STEP 03</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">
                記録する
              </h3>
            </div>

            <div className="flex items-center justify-center text-xl font-bold text-emerald-400 lg:px-1">
              <span className="hidden lg:inline" aria-hidden>
                →
              </span>
              <span className="lg:hidden" aria-hidden>
                ↓
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-sm shadow-emerald-100/40">
              <p className="text-xs font-bold text-emerald-500">STEP 04</p>
              <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                子どもの“好き”が見える
              </h3>
              <PreferenceRankingMiniExample />
            </div>

            <div className="flex items-center justify-center text-xl font-bold text-emerald-400 lg:px-1">
              <span className="hidden lg:inline" aria-hidden>
                →
              </span>
              <span className="lg:hidden" aria-hidden>
                ↓
              </span>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white/85 p-4 shadow-sm shadow-emerald-100/40">
              <p className="text-xs font-bold text-amber-500">STEP 05</p>
              <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
                次のおでかけにつながる
              </h3>
              <RecommendationMiniExample />
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
              className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50 sm:text-base"
            >
              メモリップでできることを見る
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
