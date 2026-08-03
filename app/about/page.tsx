import type { Metadata } from "next";
import Link from "next/link";
import {
  getFacilitiesByPrefecture,
  prefectures,
  visibleFacilities,
} from "@/lib/facilities";

export const metadata: Metadata = {
  title: "サイトについて",
  description: `メモリップは、全国${prefectures.length}都府県の親子で行ける子供向け遊び場を順次追加・更新中の検索サイトです。「今日どこ行く？」をすばやく解決します。`,
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
            子育て世代のための、子供向け遊び場検索サイト
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
          現在は全国{prefectures.length}都府県の {visibleFacilities.length}{" "}
          施設を掲載しています。
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
          FIC（FIC投資研究所）が運営しています。
          施設情報の追加・修正、感想などのフィードバックを歓迎しています。
        </p>

        <div className="mt-10 p-5 bg-sky-50 border border-sky-200 rounded-2xl">
          <h3 className="font-bold text-slate-900 mb-2">まずはここから</h3>
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
