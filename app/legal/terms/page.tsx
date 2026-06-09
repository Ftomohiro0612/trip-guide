import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "メモリップ (Memorips) の利用規約。禁止事項、免責事項、写真投稿時の注意事項について説明します。",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 prose prose-slate">
      <h1 className="text-3xl font-bold text-slate-900">利用規約</h1>
      <p className="text-slate-700 leading-relaxed">
        この利用規約は、メモリップ (Memorips) の利用条件を定めるものです。利用者は、本サービスを利用することで本規約に同意したものとみなされます。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        サービスの内容
      </h2>
      <p className="text-slate-700 leading-relaxed">
        本サービスは、子どもとのおでかけ記録、施設情報の閲覧、体験内容の保存などを支援するためのサービスです。掲載情報は正確性の維持に努めますが、最新性や完全性を保証するものではありません。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">禁止事項</h2>
      <ul className="mt-2 space-y-1.5 text-slate-700 list-disc list-inside">
        <li>法令または公序良俗に反する行為</li>
        <li>第三者の権利、プライバシー、名誉を侵害する行為</li>
        <li>虚偽、不正確、または誤解を招く情報の投稿</li>
        <li>本サービスの運営を妨害する行為</li>
        <li>不正アクセス、過度な負荷をかける行為、データの不正取得</li>
      </ul>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        写真投稿について
      </h2>
      <p className="text-slate-700 leading-relaxed">
        利用者は、投稿する写真について必要な著作権、肖像権、その他の権利処理を自身の責任で行うものとします。第三者や他の子どもが写る写真を投稿する場合は、事前に必要な許可を得てください。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">免責事項</h2>
      <p className="text-slate-700 leading-relaxed">
        本サービスの利用により発生した損害について、運営者は故意または重大な過失がある場合を除き責任を負いません。施設の営業状況、料金、設備、混雑状況などは変更される場合があるため、訪問前に公式情報をご確認ください。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        規約の変更
      </h2>
      <p className="text-slate-700 leading-relaxed">
        運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に掲載された時点で効力を生じます。
      </p>

      <h2 className="text-xl font-bold text-slate-900 mt-8">
        お問い合わせ
      </h2>
      <p className="text-slate-700 leading-relaxed">
        本規約に関するお問い合わせは、info@fic-investment.biz までご連絡ください。
      </p>
    </article>
  );
}
