import Link from "next/link";
import QuickFilter from "@/components/QuickFilter";
import FacilityCard from "@/components/FacilityCard";
import MapViewClient from "@/components/MapViewClient";
import { JsonLd } from "@/components/JsonLd";
import { categories, facilities, prefectures } from "@/lib/facilities";
import { categoryIcon, prefectureEmoji, prefectureGradients } from "@/lib/icons";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

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
    <div className="relative mx-auto w-[min(100%,20rem)] pb-8 pt-3 lg:mx-0">
      <div className="absolute -right-3 top-8 h-[86%] w-[92%] rotate-6 rounded-[2rem] border border-white/70 bg-white/45 shadow-xl backdrop-blur-sm" />
      <div className="absolute -right-1 top-2 h-[86%] w-[92%] rotate-3 rounded-[2rem] border border-white/80 bg-white/65 shadow-xl backdrop-blur-sm" />

      <div className="relative rotate-1 rounded-[2rem] border border-white/80 bg-white p-4 text-slate-900 shadow-2xl sm:rotate-2 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-2xl">
              🌸
            </div>
            <div>
              <p className="text-sm font-bold">ゆいちゃん (7歳)</p>
              <p className="text-xs text-slate-400">おでかけ記録</p>
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold text-emerald-600">今月</p>
            <p className="text-sm font-bold text-emerald-700">3回</p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">
                最近の記録
              </p>
              <p className="mt-1 text-sm font-bold">📍 よこはまこどもの国</p>
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

        <div className="mt-4">
          <p className="text-sm font-bold">ゆいちゃんの&quot;好き&quot; TOP3</p>
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

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-600">
            📸 写真もまとめて思い出に
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

function StepSearchIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <path
        d="M8 34 Q12 26 20 20"
        stroke="#38bdf8"
        strokeWidth="1.7"
        strokeDasharray="2 3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 6 C15.5 6 11 10 11 15.5 C11 22 20 32 20 32 S29 22 29 15.5 C29 10 24.5 6 20 6Z"
        fill="#38bdf8"
      />
      <circle cx="20" cy="15.5" r="4.2" fill="white" />
      <path
        d="M32 10 L32.8 12.8 L36 13.5 L32.8 14.2 L32 17 L31.2 14.2 L28 13.5 L31.2 12.8Z"
        fill="#34d399"
        opacity="0.9"
      />
    </svg>
  );
}

function StepRecordIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <rect
        x="9"
        y="7"
        width="20"
        height="25"
        rx="3"
        fill="#06b6d4"
        opacity="0.12"
      />
      <rect
        x="9"
        y="7"
        width="20"
        height="25"
        rx="3"
        stroke="#06b6d4"
        strokeWidth="1.7"
      />
      <line
        x1="14"
        y1="14"
        x2="26"
        y2="14"
        stroke="#06b6d4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="19"
        x2="22"
        y2="19"
        stroke="#06b6d4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M14 24.5 L17 27.5 L23 22"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M31 10 L31.6 12.4 L34 13 L31.6 13.6 L31 16 L30.4 13.6 L28 13 L30.4 12.4Z"
        fill="#38bdf8"
        opacity="0.9"
      />
    </svg>
  );
}

function StepGrowthIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <path
        d="M20 34 L20 20"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 26 Q13 21 10 13 Q17 12 20 20"
        fill="#34d399"
        opacity="0.75"
      />
      <path
        d="M20 23 Q27 18 30 10 Q23 9 20 17"
        fill="#34d399"
        opacity="0.55"
      />
      <path
        d="M29 30 L29.7 32.8 L33 33.5 L29.7 34.2 L29 37 L28.3 34.2 L25 33.5 L28.3 32.8Z"
        fill="#38bdf8"
        opacity="0.9"
      />
      <path
        d="M10 26 L10.5 28 L13 28.5 L10.5 29 L10 31 L9.5 29 L7 28.5 L9.5 28Z"
        fill="#06b6d4"
        opacity="0.7"
      />
      <rect
        x="14"
        y="34"
        width="12"
        height="4.5"
        rx="2.25"
        fill="#34d399"
        opacity="0.2"
      />
      <rect
        x="14"
        y="34"
        width="12"
        height="4.5"
        rx="2.25"
        stroke="#34d399"
        strokeWidth="1"
      />
    </svg>
  );
}

function HowSection({ facilityCountLabel }: { facilityCountLabel: string }) {
  const steps = [
    {
      number: "01",
      labelClass: "text-sky-400",
      numberClass: "text-sky-100",
      iconClass: "bg-sky-50",
      icon: <StepSearchIcon />,
      title: "遊び場を探す",
      body: "年齢・エリア・遊びのタグから、今の家族に合う場所を見つけます。",
      note: `${facilityCountLabel} / 年齢・雨の日・無料で絞り込み`,
    },
    {
      number: "02",
      labelClass: "text-cyan-400",
      numberClass: "text-cyan-100",
      iconClass: "bg-cyan-50",
      icon: <StepRecordIcon />,
      title: "おでかけを記録する",
      body: "行ったあとに、子どもの反応・満足度・また行きたい気持ちを残します。",
      note: "ワンタップの反応タグで、入力は30秒",
    },
    {
      number: "03",
      labelClass: "text-emerald-400",
      numberClass: "text-emerald-100",
      iconClass: "bg-emerald-50",
      icon: <StepGrowthIcon />,
      title: "好きが見える",
      body: "記録がたまるほど、子どもの好きな遊びや成長の変化が見えてきます。",
      note: "タグが集計されて\"好き\"ランキングに",
    },
  ];

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 py-16 sm:py-20"
      aria-labelledby="how-heading"
    >
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden
      >
        <svg
          className="absolute left-0 top-0 h-full w-full opacity-[0.045]"
          viewBox="0 0 1200 500"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M0 380 Q200 320 400 260 Q600 200 800 240 Q1000 280 1200 200"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="6 8"
            fill="none"
          />
          <path
            d="M0 100 Q300 160 600 120 Q900 80 1200 140"
            stroke="#34d399"
            strokeWidth="1.5"
            strokeDasharray="4 10"
            fill="none"
          />
          <path
            d="M120 180 C116 180 112 184 112 189 C112 195 120 204 120 204 S128 195 128 189 C128 184 124 180 120 180Z"
            fill="#38bdf8"
          />
          <circle cx="120" cy="189" r="2.5" fill="white" />
          <path
            d="M580 80 C576 80 572 84 572 89 C572 95 580 104 580 104 S588 95 588 89 C588 84 584 80 580 80Z"
            fill="#34d399"
          />
          <circle cx="580" cy="89" r="2.5" fill="white" />
          <path
            d="M980 300 C976 300 972 304 972 309 C972 315 980 324 980 324 S988 315 988 309 C988 304 984 300 980 300Z"
            fill="#06b6d4"
          />
          <circle cx="980" cy="309" r="2.5" fill="white" />
          <path
            d="M200 60 L201.5 65 L207 66 L201.5 67.5 L200 72 L198.5 67.5 L193 66 L198.5 65Z"
            fill="#38bdf8"
          />
          <path
            d="M800 120 L801 124 L805 124.5 L801 125.5 L800 130 L799 125.5 L795 124.5 L799 124Z"
            fill="#34d399"
          />
          <path
            d="M1100 380 L1101 384 L1105 384.5 L1101 385.5 L1100 390 L1099 385.5 L1095 384.5 L1099 384Z"
            fill="#06b6d4"
          />
          <ellipse
            cx="350"
            cy="420"
            rx="5"
            ry="3"
            transform="rotate(-20 350 420)"
            fill="#38bdf8"
          />
          <ellipse
            cx="362"
            cy="428"
            rx="5"
            ry="3"
            transform="rotate(-20 362 428)"
            fill="#38bdf8"
          />
          <ellipse
            cx="750"
            cy="450"
            rx="4"
            ry="2.5"
            transform="rotate(15 750 450)"
            fill="#34d399"
          />
          <ellipse
            cx="762"
            cy="442"
            rx="4"
            ry="2.5"
            transform="rotate(15 762 442)"
            fill="#34d399"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl"
          >
            メモリップの使い方
          </h2>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            探して、行って、記録する。
            <br className="hidden sm:block" />
            おでかけのたびに、子どもの&quot;好き&quot;が少しずつ見えてきます。
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          <div className="absolute left-[calc(33.3%-1rem)] right-[calc(33.3%-1rem)] top-12 z-0 hidden h-px border-t-2 border-dashed border-sky-200 md:block" />

          {steps.map((step) => (
            <div
              key={step.number}
              className="relative z-10 rounded-3xl border border-slate-100 bg-white p-7 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-8"
            >
              <div className="mb-6 flex items-baseline gap-1">
                <span
                  className={`text-[10px] font-bold tracking-[0.2em] ${step.labelClass}`}
                >
                  STEP
                </span>
                <span
                  className={`select-none text-4xl font-bold leading-none ${step.numberClass}`}
                >
                  {step.number}
                </span>
              </div>
              <div
                className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${step.iconClass}`}
              >
                {step.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {step.body}
              </p>
              <p className="mt-4 text-xs font-medium text-slate-400">
                {step.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValueProofSection() {
  const values = [
    {
      icon: "🌱",
      title: "成長が見える",
      body: "「去年は怖がってた滑り台、今年はひとりで！」",
    },
    {
      icon: "🗺️",
      title: "思い出が地図に",
      body: "行った場所がマップにたまっていく",
    },
    {
      icon: "📊",
      title: "\"好き\"がわかる",
      body: "反応タグから子どもの興味ランキング",
    },
  ];

  return (
    <section
      className="bg-slate-50 pb-12 sm:pb-16"
      aria-labelledby="value-proof-heading"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="value-proof-heading"
          className="text-center text-xl font-bold text-slate-900 sm:text-2xl"
        >
          記録がたまると、こんなことが見えてきます
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
            >
              <span className="text-2xl" aria-hidden>
                {value.icon}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {value.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {value.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const facilityCountLabel =
    facilities.length >= 1000 ? "1,000施設超" : `${facilities.length}施設`;
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

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-9 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
            <div className="text-center text-white lg:text-left">
              <p className="mb-4 inline-flex items-center rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm sm:text-sm">
                <span aria-hidden>📍</span>
                <span className="ml-1">
                  関東甲信越9県 · {facilityCountLabel}
                </span>
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight drop-shadow-sm sm:text-5xl lg:text-[3.35rem]">
                子どもの&quot;好き&quot;が、
                <br />
                地図になっていく。
              </h1>
              <p className="sr-only">
                子どもの&quot;好き&quot;が見える、おでかけ記録サービス
              </p>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg lg:mx-0">
                遊び場を探して、おでかけして、子どもの反応をワンタップで記録。
                記録がたまるほど「うちの子はこれが好き」が見えてきます。
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-2xl sm:text-base"
                >
                  <span aria-hidden>✨</span>
                  家族の記録をはじめる
                </Link>
                <Link
                  href="/facilities"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/55 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:text-base"
                >
                  <span aria-hidden>🗺️</span>
                  遊び場を探す
                </Link>
              </div>
              <p className="mt-3 text-xs font-medium text-white/85">
                登録は無料・記録は30秒で完了
              </p>

              <form
                action="/facilities"
                className="mx-auto mt-6 w-full max-w-sm lg:mx-0"
              >
                <div className="flex w-full overflow-hidden rounded-full bg-white p-1.5 shadow-lg">
                  <input
                    type="search"
                    name="q"
                    placeholder="施設名・地域・カテゴリで検索"
                    className="min-w-0 flex-1 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    🔍 検索
                  </button>
                </div>
              </form>
            </div>

            <div className="flex justify-center lg:justify-end">
              <MemoryPreviewCard />
            </div>
          </div>
        </div>
      </section>

      <HowSection facilityCountLabel={facilityCountLabel} />
      <ValueProofSection />

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
