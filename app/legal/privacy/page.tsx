import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "メモリップ (Memorips) のプライバシーポリシー。取得する情報、利用目的、第三者提供の方針について説明します。",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
      <h1 className="text-3xl font-bold text-slate-900">
        プライバシーポリシー
      </h1>
      <p className="text-slate-700 leading-relaxed">
        メモリップ (Memorips) は、子どもとのおでかけ記録を安心して残せるサービスとして、利用者のプライバシー保護を重視します。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        収集する情報
      </h2>
      <ul className="mt-2 space-y-1.5 text-slate-700 list-disc list-inside">
        <li>メールアドレス</li>
        <li>子どものニックネーム・生年月（年月のみ、日付は不要）</li>
        <li>おでかけ記録（施設名・訪問日・満足度など）</li>
        <li>任意で投稿された写真</li>
        <li>居住エリア（都道府県または市区町村レベルのみ）</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        収集しない情報
      </h2>
      <ul className="mt-2 space-y-1.5 text-slate-700 list-disc list-inside">
        <li>子どもの本名・生年月日（日付まで）</li>
        <li>学校名・園名</li>
        <li>正確な住所・番地</li>
        <li>写真に含まれる GPS 情報（アップロード時に自動除去）</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        データの閲覧範囲
      </h2>
      <p className="text-slate-700 leading-relaxed">
        おでかけ記録・子どもプロフィール・ウィッシュリストはすべて<strong>登録した本人のみ閲覧できます</strong>。
        他のユーザーがこれらの情報を閲覧・操作することはできません（Row Level Security により技術的に制御しています）。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        写真の取り扱い
      </h2>
      <ul className="mt-2 space-y-1.5 text-slate-700 list-disc list-inside">
        <li>写真はデフォルトで<strong>「家族だけ見る（非公開）」</strong>として保存されます。</li>
        <li>写真に含まれる GPS・撮影日時などの EXIF 情報は、アップロード時に自動的に除去されます。</li>
        <li>
          写真を施設紹介・サービスPR等に利用する場合は、利用者の<strong>明示的な同意</strong>と
          運営側の承認を個別に取得します。同意なく公開利用することはありません。
        </li>
        <li>顔が写っている写真の公開利用は、特別な確認フローを経てのみ行われます。</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        利用目的
      </h2>
      <p className="text-slate-700 leading-relaxed">
        取得した情報は、サービス提供、本人確認、記録管理、利便性向上、および個人を特定できない形での匿名集計や施設統計の作成に利用します。
        匿名集計データは施設ページの統計表示（例：年齢別満足度）に使用する場合があります。
        個別家族・個別ユーザーの情報を外部に提供することはありません。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        第三者提供
      </h2>
      <p className="text-slate-700 leading-relaxed">
        法令に基づく場合を除き、利用者の個人情報を第三者へ提供しません。ただし、個人を特定できない匿名集計データは、施設統計として利用または公開する場合があります。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        退会・データ削除
      </h2>
      <p className="text-slate-700 leading-relaxed">
        退会を希望される場合は、アカウント設定ページから削除申請を行うか、下記お問い合わせ先までご連絡ください。
        退会手続き完了後、登録情報およびおでかけ記録はすべて削除されます（法令に基づく保存義務がある情報を除く）。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        お問い合わせ
      </h2>
      <p className="text-slate-700 leading-relaxed">
        本ポリシーに関するお問い合わせは、info@fic-investment.biz までご連絡ください。
      </p>

      <p className="text-slate-400 text-sm mt-10">最終更新: 2026年6月9日</p>
    </article>
  );
}
