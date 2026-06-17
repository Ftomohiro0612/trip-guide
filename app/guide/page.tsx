import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "メモリップでできること",
  description:
    "子どものおでかけを、行った場所と子どもの反応で記録。写真があってもなくても、あとから家族の成長記録になります。いまできること・今後の構想・対象施設について。",
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
    body: "行った日と場所を家族の記録に。",
    image: "/guide/photo-now-record.png",
    imageAlt: "おでかけの記録を残す様子のイメージ",
  },
  {
    icon: "📸",
    title: "写真から記録を作れる",
    body: "写真と行った場所を選ぶだけで記録を作成。対応している写真では、撮影日なども手がかりにできます。",
    image: "/guide/photo-now-fromphoto.png",
    imageAlt: "写真から記録を作る様子のイメージ",
  },
  {
    icon: "😊",
    title: "子どもごとの反応・満足度を残せる",
    body: "「楽しんだ」「また行きたい」を子どもごとに。",
    image: "/guide/photo-now-reaction.png",
    imageAlt: "子どもの反応を記録する様子のイメージ",
  },
  {
    icon: "🗺️",
    title: "行った場所・行きたい場所を残せる",
    body: "訪問済みと、次の候補(行きたいリスト)を。",
    image: "/guide/photo-now-places.png",
    imageAlt: "行った場所や行きたい場所を残す様子のイメージ",
  },
  {
    icon: "🖼️",
    title: "写真と記録をあとから見返せる",
    body: "思い出として時系列で振り返り。",
    image: "/guide/photo-now-lookback.png",
    imageAlt: "写真と記録を見返す様子のイメージ",
  },
];

const storySections = [
  {
    icon: "/guide/icon-story-record.png",
    iconAlt: "記録を表す3Dアイコン",
    eyebrow: "A little record",
    title: "おでかけを、少しだけ記録に",
    body: "毎回きれいな文章を書かなくても大丈夫。写真がある日は写真を添えて、ない日は場所と子どもの反応だけでも。その日のおでかけが、あとから見返せる家族の記録になります。",
  },
  {
    icon: "/guide/icon-story-favorites.png",
    iconAlt: "好きなことを表す3Dアイコン",
    eyebrow: "Child's favorites",
    title: "子どもの“好き”が見えてくる",
    body: "反応タグ(遊具・水遊び・きょうだいで遊んだ…)、満足度、また行きたい度を子どもごとに記録。写真だけでは残りにくい“何に夢中だったか”が、記録として積み重なります。",
  },
  {
    icon: "/guide/icon-story-growth.png",
    iconAlt: "成長を表す3Dアイコン",
    eyebrow: "Growth record",
    title: "同じ場所で、成長を振り返る",
    body: "同じ施設に行くほど、その場所での記録がたまります。子どもの反応や“好き”の変化は、記録が増えるほど見えてきます。月に一度、少し見返すだけでも、家族の記録は続いていきます。",
  },
];

const futureIdeas = [
  {
    title: "月ごとの思い出アルバム",
    body: "1か月のおでかけや写真・記録を自動でまとめて、家族で見返しやすい思い出アルバムに。毎月少し見返すだけで、家族の歩みが残っていきます。",
    icon: "/guide/icon-future-album.png",
    iconAlt: "月ごとの思い出アルバムを表す3Dアイコン",
  },
  {
    title: "子どもごとの成長日記",
    body: "子どもごとに「好き」や反応の変化を、時系列でやさしく振り返れるように。写真がなくても、行った場所と反応だけで成長が見えてきます。",
    icon: "/guide/icon-future-growth.png",
    iconAlt: "子どもごとの成長日記を表す3Dアイコン",
  },
  {
    title: "写真プリント・アルバム化",
    body: "デジタルの記録を、そのまま手元に残せる写真プリントやアルバムに。気に入った思い出を形にして残せるようにしたいと考えています。",
    icon: "/guide/icon-future-print.png",
    iconAlt: "写真プリントやアルバム化を表す3Dアイコン",
  },
  {
    title: "家族で見返せる思い出レポート",
    body: "よく行った場所やその月の思い出を、家族で見返しやすい形に整理。一年の歩みをふり返る時間につなげたいと考えています。",
    icon: "/guide/icon-future-report.png",
    iconAlt: "家族で見返せる思い出レポートを表す3Dアイコン",
  },
  {
    title: "将来的には家族向けの有料サービス",
    body: "記録が増えた家族向けに、より便利なまとめ機能や保存体験を。これらは将来的に検討している構想で、提供時期は未定です。",
    icon: "/guide/icon-future-premium.png",
    iconAlt: "家族向けの有料サービス構想を表す3Dアイコン",
  },
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
            行った場所が、家族の成長記録になる。
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/95 drop-shadow-sm sm:text-lg">
            写真があっても、なくても大丈夫。行った場所に、子どもの反応を少し添えるだけで、あとから“好き”と成長を見返せる思い出になります。
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-sky-50/60 py-8 sm:py-10" aria-label="中心メッセージ">
        <div className="mx-auto max-w-5xl px-4">
          <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 text-center shadow-sm shadow-sky-100/70 sm:p-8">
            <span
              className="absolute left-6 top-5 text-xl text-sky-300/80 sm:left-10 sm:text-2xl"
              aria-hidden
            >
              ♡
            </span>
            <span
              className="absolute right-8 top-7 text-xl text-emerald-300/80 sm:right-12 sm:text-2xl"
              aria-hidden
            >
              🌱
            </span>
            <span
              className="absolute bottom-5 left-1/2 text-lg text-cyan-300/70"
              aria-hidden
            >
              👣
            </span>
            <p className="relative mx-auto max-w-3xl text-lg font-bold leading-relaxed text-slate-900 sm:text-2xl">
              写真があっても、なくても大丈夫。行った場所と子どもの反応が少し残るだけで、あとから家族の成長記録になります。
            </p>
          </div>
        </div>
      </section>

      <section className="bg-sky-50/60 py-14 sm:py-16" aria-labelledby="memory-flow-heading">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-sm shadow-sky-100/70">
            <Image
              src="/guide/photo-problem.png"
              alt="家族で写真を見返している様子のイメージ"
              width={1448}
              height={1086}
              className="aspect-[4/3] w-full rounded-[1.35rem] object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
          <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm shadow-sky-100/60 sm:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500">
              Why Memorip
            </p>
            <h2 id="memory-flow-heading" className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
              写真はあるのに、思い出は流れていく
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-slate-700 sm:text-base">
              スマホには家族の写真がたくさん。でも、きちんと日記を書こうとすると続きません。そして“いつ・どこで・何に夢中だったか”は、時間がたつと思い出せなくなりがち。だからメモリップは、行った場所や写真をきっかけに、あとから少しずつ記録を足せる設計にしました。
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-sky-50/60 to-slate-50 py-14 sm:py-16" aria-labelledby="current-features-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-sky-500">
              Available now
            </p>
            <h2 id="current-features-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
              いまできること
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              メモリップで、今すぐできることです。
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/60"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-2xl">
                  <span aria-hidden>{feature.icon}</span>
                </div>
                <Image
                  src={feature.image}
                  alt={feature.imageAlt}
                  width={1448}
                  height={1086}
                  className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
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

      <section className="bg-white py-14 sm:py-16" aria-labelledby="recording-heading">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 lg:grid-cols-3">
            {storySections.map((section) => (
              <article
                key={section.title}
                className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm shadow-emerald-100/50"
              >
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                  <Image
                    src={section.icon}
                    alt={section.iconAlt}
                    width={1254}
                    height={1254}
                    className="h-14 w-14 object-contain"
                    sizes="56px"
                  />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
                  {section.eyebrow}
                </p>
                <h2
                  id={section.title === "おでかけを、少しだけ記録に" ? "recording-heading" : undefined}
                  className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl"
                >
                  {section.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {section.body}
                </p>
              </article>
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
              以下は今後広げたい構想です(提供時期は未定)。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {futureIdeas.map((idea, index) => (
                <div
                  key={idea.title}
                  className={`rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 ${
                    index === futureIdeas.length - 1 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
                      <Image
                        src={idea.icon}
                        alt={idea.iconAlt}
                        width={1254}
                        height={1254}
                        className="h-14 w-14 object-contain"
                        sizes="56px"
                      />
                    </div>
                    <div>
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-emerald-600 shadow-sm">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-3 text-base font-bold leading-snug text-slate-900">
                        {idea.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {idea.body}
                      </p>
                    </div>
                  </div>
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
            関東甲信越を中心に、親子で行ける施設を順次追加・更新中です。すべての施設を網羅しているものではなく、少しずつ増やしています。
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 py-14 sm:py-16" aria-labelledby="guide-cta-heading">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 id="guide-cta-heading" className="text-2xl font-bold text-slate-900 sm:text-3xl">
            おでかけを、家族の記録に。
          </h2>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-2xl sm:text-base"
            >
              <span aria-hidden>✨</span>
              家族の記録をはじめる
            </Link>
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 sm:text-base"
            >
              <span aria-hidden>🗺️</span>
              遊び場を探す
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
