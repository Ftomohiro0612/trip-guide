import Link from "next/link";
import Image from "next/image";
import QuickFilter from "@/components/QuickFilter";
import FacilityCard from "@/components/FacilityCard";
import HeroSearch from "@/components/HeroSearch";
import MapViewClient from "@/components/MapViewClient";
import { JsonLd } from "@/components/JsonLd";
import { categories, facilities, metadata, prefectures } from "@/lib/facilities";
import { categoryIcon, prefectureIconImages } from "@/lib/icons";
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
    <div className="relative mx-auto w-[min(100%,22.5rem)] pb-9 pt-3 lg:mx-0">
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
              <p className="mt-1 text-[15px] font-bold">📍 よこはまこどもの国</p>
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
          <p className="text-[15px] font-bold">ゆいちゃんの&quot;好き&quot; TOP3</p>
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
      cardClass: "border-sky-200/60 bg-sky-50 shadow-sky-100/50",
      labelClass: "text-sky-500",
      numberClass: "text-sky-200",
      iconClass: "bg-white/75 ring-1 ring-sky-100",
      icon: <StepSearchIcon />,
      title: "遊び場を探す",
      body: "年齢・エリア・遊びのタグから、今の家族に合う場所を見つけます。",
      note: `${facilityCountLabel} / 年齢・雨の日・無料で絞り込み`,
    },
    {
      number: "02",
      cardClass: "border-cyan-200/60 bg-cyan-50 shadow-cyan-100/50",
      labelClass: "text-cyan-500",
      numberClass: "text-cyan-200",
      iconClass: "bg-white/75 ring-1 ring-cyan-100",
      icon: <StepRecordIcon />,
      title: "おでかけを記録する",
      body: "行ったあとに、子どもの反応・満足度・また行きたい気持ちを残します。",
      note: "ワンタップの反応タグで、入力は30秒",
    },
    {
      number: "03",
      cardClass: "border-emerald-200/60 bg-emerald-50 shadow-emerald-100/50",
      labelClass: "text-emerald-500",
      numberClass: "text-emerald-200",
      iconClass: "bg-white/75 ring-1 ring-emerald-100",
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
              className={`relative z-10 rounded-3xl border p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md sm:p-8 ${step.cardClass}`}
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

function ValueGrowthIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <path
        d="M20 34 V19"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 27 Q13 22 11 15 Q18 14 20 22Z" fill="#6ee7b7" />
      <path d="M20 23 Q27 18 30 10 Q23 9 20 18Z" fill="#34d399" />
      <path
        d="M8 31 C14 30 26 30 32 31"
        stroke="#a7f3d0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M29 25 V12 M29 12 L24 17 M29 12 L34 17"
        stroke="#0ea5e9"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9 L12.7 11.6 L15.5 12.2 L12.7 12.8 L12 15.5 L11.3 12.8 L8.5 12.2 L11.3 11.6Z"
        fill="#38bdf8"
        opacity="0.9"
      />
    </svg>
  );
}

function ValueMapIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <path
        d="M7 12 L16 8 L25 12 L33 8 V29 L25 33 L16 29 L7 33Z"
        fill="#e0f2fe"
      />
      <path
        d="M16 8 V29 M25 12 V33"
        stroke="#bae6fd"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 26 C14 22 17 27 21 23 C25 19 27 23 31 17"
        stroke="#38bdf8"
        strokeWidth="1.8"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      <path
        d="M13 11 C10.8 11 9 12.8 9 15 C9 18 13 22.5 13 22.5 S17 18 17 15 C17 12.8 15.2 11 13 11Z"
        fill="#0ea5e9"
      />
      <circle cx="13" cy="15" r="1.5" fill="white" />
      <path
        d="M29 15 C26.8 15 25 16.8 25 19 C25 22 29 26.5 29 26.5 S33 22 33 19 C33 16.8 31.2 15 29 15Z"
        fill="#06b6d4"
      />
      <circle cx="29" cy="19" r="1.5" fill="white" />
      <path
        d="M21 20 C19 20 17.5 21.6 17.5 23.5 C17.5 26.1 21 30 21 30 S24.5 26.1 24.5 23.5 C24.5 21.6 23 20 21 20Z"
        fill="#34d399"
      />
      <circle cx="21" cy="23.5" r="1.3" fill="white" />
    </svg>
  );
}

function ValueRankingIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-10"
      aria-hidden
    >
      <rect x="9" y="12" width="22" height="4" rx="2" fill="#fbbf24" />
      <rect x="9" y="19" width="16" height="4" rx="2" fill="#fcd34d" />
      <rect x="9" y="26" width="11" height="4" rx="2" fill="#fde68a" />
      <circle cx="6" cy="14" r="1.6" fill="#f59e0b" />
      <circle cx="6" cy="21" r="1.6" fill="#f59e0b" opacity="0.72" />
      <circle cx="6" cy="28" r="1.6" fill="#f59e0b" opacity="0.48" />
      <path
        d="M31 5 L32.8 9 L37 9.4 L33.9 12.1 L34.8 16.3 L31 14.1 L27.2 16.3 L28.1 12.1 L25 9.4 L29.2 9Z"
        fill="#f59e0b"
      />
      <path
        d="M29 35 C32 34 34.5 32.5 36 30"
        stroke="#fbbf24"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreferenceRankingMiniExample() {
  const rankings = [
    ["1", "💧 水遊び", "8回", "100%"],
    ["2", "✂️ クラフト", "5回", "62.5%"],
    ["3", "🐾 動物ふれあい", "3回", "37.5%"],
  ];

  return (
    <div className="mt-5 space-y-3 rounded-2xl bg-white/75 p-3 shadow-sm shadow-emerald-100/50 ring-1 ring-emerald-200/60">
      {rankings.map(([rank, label, count, width]) => (
        <div key={rank}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 font-bold text-slate-700">
              {rank}. {label}
            </span>
            <span className="shrink-0 font-bold text-emerald-600">
              {count}
            </span>
          </div>
          <div
            className="rounded-full"
            style={{ height: 8, backgroundColor: "#d1fae5" }}
          >
            <div
              className="rounded-full"
              style={{ width, height: 8, backgroundColor: "#34d399" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniMapExample() {
  return (
    <div className="mt-5 rounded-2xl bg-white/75 p-3 shadow-sm shadow-sky-100/50 ring-1 ring-sky-200/60">
      <svg
        viewBox="0 0 220 112"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full"
        aria-hidden
      >
        <rect width="220" height="112" rx="18" fill="#f0f9ff" />
        <path d="M35 0 V112 M85 0 V112 M135 0 V112 M185 0 V112" stroke="#bae6fd" />
        <path d="M0 30 H220 M0 74 H220" stroke="#bae6fd" />
        <path
          d="M38 78 C70 45 95 91 125 58 C149 32 168 48 187 28"
          stroke="#0ea5e9"
          strokeWidth="3"
          strokeDasharray="5 7"
          strokeLinecap="round"
        />
        {[
          [42, 76, "#0ea5e9"],
          [124, 58, "#06b6d4"],
          [188, 28, "#34d399"],
        ].map(([x, y, color]) => (
          <g key={`${x}-${y}`}>
            <path
              d={`M${x} ${Number(y) - 20} C${Number(x) - 7} ${
                Number(y) - 20
              } ${Number(x) - 12} ${Number(y) - 15} ${Number(x) - 12} ${
                Number(y) - 8
              } C${Number(x) - 12} ${Number(y) + 1} ${x} ${
                Number(y) + 14
              } ${x} ${Number(y) + 14} S${Number(x) + 12} ${
                Number(y) + 1
              } ${Number(x) + 12} ${Number(y) - 8} C${Number(x) + 12} ${
                Number(y) - 15
              } ${Number(x) + 7} ${Number(y) - 20} ${x} ${
                Number(y) - 20
              }Z`}
              fill={String(color)}
            />
            <circle cx={Number(x)} cy={Number(y) - 8} r="4" fill="white" />
          </g>
        ))}
      </svg>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-sky-500 px-3 py-2 text-xs font-bold text-white">
        <span>今年のおでかけ</span>
        <span>12か所</span>
      </div>
    </div>
  );
}

function RecommendationMiniExample() {
  const recommendations = [
    ["01", "じゃぶじゃぶ池のある公園", "水遊びスポット"],
    ["02", "屋内プール", "雨の日も遊びやすい"],
  ];

  return (
    <div className="mt-5 space-y-3 rounded-2xl bg-white/75 p-3 shadow-sm shadow-amber-100/50 ring-1 ring-amber-200/60">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-100/80 px-3 py-2 text-xs font-bold text-amber-800">
        <span>💧 水遊びが好き</span>
        <span aria-hidden>→</span>
        <span>次の遊び場候補</span>
      </div>
      <div className="space-y-2">
        {recommendations.map(([number, title, tag]) => (
          <div
            key={number}
            className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">
              {number}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800">
                {title}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-amber-600">
                おすすめ: {tag}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueProofSection() {
  const values = [
    {
      icon: <ValueGrowthIcon />,
      title: '気づかなかった"好き"が見えてくる',
      body: '水遊びが多い、クラフトは長く集中する、動物とのふれあいが好き。記録を重ねるほど、子どもの"好き"や楽しみやすい遊びが見えてきます。',
      cardClass: "border-emerald-200/60 bg-emerald-50 shadow-emerald-100/50",
      iconClass: "bg-white/75 shadow-sm shadow-emerald-100/50 ring-1 ring-emerald-200/60",
      titleClass: "text-emerald-900",
      example: <PreferenceRankingMiniExample />,
    },
    {
      icon: <ValueMapIcon />,
      title: "わが家だけのおでかけ履歴が残る",
      body: "行った場所が家族だけの記録としてたまっていきます。「ここ行ったね」と見返す時間も、おでかけの楽しみのひとつになります。",
      cardClass: "border-sky-200/60 bg-sky-50 shadow-sky-100/50",
      iconClass: "bg-white/75 shadow-sm shadow-sky-100/50 ring-1 ring-sky-200/60",
      titleClass: "text-sky-900",
      example: <MiniMapExample />,
    },
    {
      icon: <ValueRankingIcon />,
      title: '"好き"に合う遊び場を見つけられる',
      body: '水遊びが好きなら水遊びスポット、クラフトが好きなら工作体験。記録で見えてきた"好き"に合わせて、次のおでかけ先を選びやすくなります。',
      cardClass: "border-amber-200/60 bg-amber-50 shadow-amber-100/50",
      iconClass: "bg-white/75 shadow-sm shadow-amber-100/50 ring-1 ring-amber-200/60",
      titleClass: "text-amber-900",
      example: <RecommendationMiniExample />,
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
          子どもの&quot;好き&quot;が見えると、おでかけがもっと楽になります
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
          記録は基本ワンタップ。たまっていくほど、家族のおでかけがもっと楽しく、もっとラクになります。
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {values.map((value) => (
            <div
              key={value.title}
              className={`rounded-3xl border p-5 shadow-sm ${value.cardClass}`}
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${value.iconClass}`}>
                {value.icon}
              </div>
              <p className={`text-base font-bold ${value.titleClass}`}>
                {value.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {value.body}
              </p>
              {value.example}
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
  const totalFacilityCountLabel = metadata.total_facilities.toLocaleString("ja-JP");
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
                遊び場を探して、行ったあとは子どもの反応を30秒で記録。記録がたまるほど、&quot;うちの子が好きな遊び&quot;と&quot;次に行きたい場所&quot;が見えてきます。
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
                  遊び場を見てみる
                </Link>
              </div>
              <p className="mt-3 text-xs font-medium text-white/85">
                登録は無料・基本の記録は30秒で完了
              </p>

              <HeroSearch />
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
                次のおでかけ先を地図から探す
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                気になる場所を見つけたら行きたいに保存。行ったあとは記録に残せます。
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
          <div className="mb-6 text-center">
            <h2 id="area-heading" className="text-2xl font-bold text-slate-900">
              エリアから遊び場を探す
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              関東甲信越{prefectures.length}県・{totalFacilityCountLabel}施設をチェック
            </p>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-9 sm:gap-x-4">
            {prefectures.map((p) => (
              <Link
                key={p.id}
                href={`/prefecture/${p.id}`}
                className="group flex min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-2 text-center transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                aria-label={`${p.name}の遊び場を探す`}
              >
                <Image
                  src={prefectureIconImages[p.id]}
                  alt=""
                  width={64}
                  height={64}
                  className="h-12 w-12 object-contain drop-shadow-sm transition-transform group-hover:scale-105 sm:h-14 sm:w-14"
                  aria-hidden
                />
                <span className="text-sm font-bold leading-tight text-slate-800 group-hover:text-brand">
                  {p.name}
                </span>
                <span className="text-[11px] leading-none text-slate-400">
                  {p.count}施設
                </span>
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
