import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "メモリップでできること",
  description:
    "子どものおでかけを記録して、“好き”と成長をあとから振り返りやすくする無料サービス。いまできること・これから広げたい機能・対象施設について。",
  alternates: { canonical: "/guide" },
  robots: {
    index: true,
    follow: true,
  },
};

const currentFeatures = [
  {
    icon: "📝",
    title: "おでかけを記録できる",
    body: "行った日や場所を、家族のおでかけ記録として残せます。",
  },
  {
    icon: "📸",
    title: "写真から記録を作れる",
    body: "写真をきっかけに、その日のおでかけを記録できます。",
  },
  {
    icon: "😊",
    title: "子どもごとの反応・満足度を残せる",
    body: "楽しかった気持ちやまた行きたい度を、子どもごとに残せます。",
  },
  {
    icon: "🗺️",
    title: "行った場所をあとから見返せる",
    body: "家族で訪れた場所を、あとから振り返りやすくします。",
  },
  {
    icon: "⭐",
    title: "施設を探して「行きたい」「行った」を残せる",
    body: "気になる施設を見つけて、次のおでかけ候補や行った記録にできます。",
  },
];

const futureIdeas = [
  "同じ施設での成長を振り返れるページ",
  "写真アルバム",
  "成長日記",
  "目的地までの途中で寄れる施設検索",
];

function GuideBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.14]"
        viewBox="0 0 1200 520"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-80 420 C130 330 260 390 430 285 S720 150 880 210 1030 160 1280 70"
          stroke="white"
          strokeWidth="4"
          strokeDasharray="10 16"
          strokeLinecap="round"
        />
        <path
          d="M230 342 C220 342 212 350 212 361 C212 374 230 397 230 397 S248 374 248 361 C248 350 240 342 230 342Z"
          fill="white"
        />
        <circle cx="230" cy="361" r="6" fill="#38bdf8" opacity="0.45" />
        <path
          d="M670 202 C660 202 652 210 652 221 C652 234 670 257 670 257 S688 234 688 221 C688 210 680 202 670 202Z"
          fill="white"
        />
        <circle cx="670" cy="221" r="6" fill="#10b981" opacity="0.45" />
        <path
          d="M980 130 L982 139 L992 141 L982 143 L980 152 L978 143 L968 141 L978 139Z"
          fill="white"
        />
        <path
          d="M430 104 L432 112 L440 114 L432 116 L430 124 L428 116 L420 114 L428 112Z"
          fill="white"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.42),transparent_45%),radial-gradient(circle_at_82%_86%,rgba(255,255,255,0.28),transparent_44%)]" />
        <GuideBackground />
        <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:py-18">
          <p className="mb-4 inline-flex items-center rounded-full border border-white/35 bg-white/20 px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-sm sm:text-sm">
            <span aria-hidden>✨</span>
            <span className="ml-1">メモリップでできること</span>
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight drop-shadow-sm sm:text-5xl">
            “行った”が、家族の記録になる。
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg">
            メモリップは、子どものおでかけを記録して、“好き”と成長をあとから振り返りやすくする無料サービスです。
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-slate-50 py-14 sm:py-16" aria-labelledby="current-features-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500">
              Available now
            </p>
            <h2 id="current-features-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
              いまできること
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {currentFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/60"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-2xl">
                  <span aria-hidden>{feature.icon}</span>
                </div>
                <h3 className="text-base font-bold leading-snug text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14 sm:py-16" aria-labelledby="future-ideas-heading">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-100/50 sm:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
              Future ideas
            </p>
            <h2 id="future-ideas-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
              これから広げたいこと
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              以下は構想中・順次追加予定の機能です（提供時期は未定）。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {futureIdeas.map((idea) => (
                <div
                  key={idea}
                  className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-emerald-600 shadow-sm">
                    構
                  </span>
                  <p className="text-sm font-bold leading-relaxed text-slate-800">
                    {idea}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16" aria-labelledby="facility-info-heading">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl ring-1 ring-amber-100">
            <span aria-hidden>📍</span>
          </div>
          <h2 id="facility-info-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
            施設情報について
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            関東甲信越を中心に、親子で行ける施設を順次追加・更新中です。完全網羅ではありませんが、少しずつ増やしています。
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 py-14 sm:py-16" aria-labelledby="guide-cta-heading">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 id="guide-cta-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
            家族のおでかけを、今日から記録に。
          </h2>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl sm:text-base"
            >
              <span aria-hidden>✨</span>
              無料で家族の記録をはじめる
            </Link>
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 sm:text-base"
            >
              <span aria-hidden>🗺️</span>
              遊び場を見てみる
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
