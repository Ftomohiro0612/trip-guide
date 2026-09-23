import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE } from "@/lib/config";
import {
  getFacilitiesByPrefecture,
  prefectures,
  discoverableFacilities,
} from "@/lib/facilities";

export const metadata: Metadata = {
  title: "サイトについて",
  description: `メモリップは、全国${prefectures.length}都道府県の遊び場探しを入口に、思い出と子どもの反応を記録するサービスです。記録から子どもの「好き」を見つけ、次のおでかけにつなげます。`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 text-center">
          <p className="text-3xl mb-3" aria-hidden>
            🎈
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold drop-shadow tracking-tight">
            メモリップについて
          </h1>
          <p className="mt-3 opacity-95">
            遊び場を探して、思い出を記録。子どもの「好き」から、次のおでかけへ。
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
        <h2 className="text-xl font-bold text-slate-900 mt-2">
          サイトの目的
        </h2>
        <p className="text-slate-700 leading-relaxed">
          「今日どこ行こう？」「雨だけど楽しめる場所はある？」「無料で遊べる施設は？」
          こんな日常的な疑問に、3秒で答えを返すことを目指しています。
          現在は全国{prefectures.length}都道府県の {discoverableFacilities.length}{" "}
          施設を掲載しています。
        </p>
        <p className="mt-3 text-slate-700 leading-relaxed">
          メモリップは、遊び場探しを入口にした家族のおでかけ記録サービスです。
          行った場所と思い出、子どもの反応を残すと、この子の「好き」が見えてきます。
          記録を振り返り、その好みに合う次のおでかけへつなげていきます。
          写真のない日も、ひとことと反応から記録を始められます。
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">
          こんな時に役立ちます
        </h2>
        <ul className="mt-2 space-y-1.5 text-slate-700 list-disc list-inside">
          <li>急に時間ができた、子供が退屈してる時の行き先探し</li>
          <li>雨の日でも楽しめる屋内施設を素早く見つけたい</li>
          <li>0-3歳のベビー連れ／小学生など年齢に合った施設を探したい</li>
          <li>無料で遊べる公園・施設をまとめてチェックしたい</li>
          <li>家族旅行の行き先候補をエリア別にざっくり知りたい</li>
          <li>おでかけの思い出や子どもの反応を残して、あとから見返したい</li>
          <li>記録から子どもの「好き」を知り、次の行き先を見つけたい</li>
        </ul>

        <h2 className="text-xl font-bold text-slate-900 mt-8">
          掲載エリア
        </h2>
        <p className="text-slate-700 leading-relaxed">
          {prefectures
            .map((p) => `${p.name}（${getFacilitiesByPrefecture(p.id).length}施設）`)
            .join(" / ")}
          。順次、対象エリアを拡大していく予定です。
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">
          情報の正確性について
        </h2>
        <p className="text-slate-700 leading-relaxed">
          掲載している料金・営業時間・対象年齢・天候対応情報は、各施設の公式サイトを参照して取りまとめたものです。
          シーズンや改装等で変更されることがあります。お出かけ前に
          <strong>必ず公式サイトで最新情報をご確認ください</strong>。
          各施設詳細ページの「公式サイトを見る」ボタンから直接アクセスできます。
        </p>

        <h2 className="text-xl font-bold text-slate-900 mt-8">
          運営
        </h2>
        <p className="text-slate-700 leading-relaxed">
          {SERVICE.operatorName}が運営しています。
          施設情報の追加・修正、感想などのフィードバックを歓迎しています。
        </p>

        <div className="mt-10 p-5 bg-sky-50 border border-sky-200 rounded-2xl">
          <h3 className="font-bold text-slate-900 mb-2">まずはここから</h3>
          <Link href="/try" className="mb-3 block rounded-full bg-slate-950 px-4 py-4 text-center font-bold text-white hover:bg-slate-800">
            登録なしで、思い出を1件つくる →
          </Link>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white hover:bg-brand hover:text-white border border-sky-200 hover:border-brand rounded-lg px-4 py-3 transition-colors"
            >
              <span aria-hidden>🗺️</span>
              <span className="font-medium">地図から探す</span>
            </Link>
            <Link
              href="/facilities"
              className="flex items-center gap-2 bg-white hover:bg-brand hover:text-white border border-sky-200 hover:border-brand rounded-lg px-4 py-3 transition-colors"
            >
              <span aria-hidden>🔍</span>
              <span className="font-medium">条件から絞り込む</span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
