import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "メモリップの利用規約。アカウント、禁止事項、コンテンツの取り扱い、施設情報、免責、準拠法・管轄について説明します。",
  alternates: { canonical: "/terms" },
};

const h2Class = "scroll-mt-24 text-xl font-bold leading-snug text-slate-900";
const listClass =
  "legal-list mt-3 space-y-2.5 list-disc marker:text-slate-400";

const termsToc = [
  { id: "scope", label: "適用" },
  { id: "account", label: "アカウント" },
  { id: "prohibited", label: "禁止事項" },
  { id: "content", label: "コンテンツの取り扱い" },
  { id: "facility-info", label: "施設情報について" },
  { id: "service-changes", label: "サービスの変更・停止" },
  { id: "disclaimer", label: "免責" },
  { id: "revisions", label: "規約の改定" },
  { id: "governing-law", label: "準拠法・管轄" },
];

export default function TermsPage() {
  return (
    <LegalDocument title="利用規約" tableOfContents={termsToc}>
      <section>
        <h2 id="scope" className={h2Class}>1. 適用</h2>
        <p className="mt-3">
          本規約は、メモリップ（以下「本サービス」）の利用に関する条件を定めるものです。
        </p>
      </section>

      <section>
        <h2 id="account" className={h2Class}>2. アカウント</h2>
        <ul className={listClass}>
          <li>登録は無料です。アカウントは保護者など成人の方が作成してください。</li>
          <li>認証情報の管理はユーザーの責任とします。</li>
        </ul>
      </section>

      <section>
        <h2 id="prohibited" className={h2Class}>3. 禁止事項</h2>
        <ul className={listClass}>
          <li>他人になりすます行為、他人の個人情報を本人の同意なく登録する行為</li>
          <li>
            第三者（他の家族・他人の子ども）の写真を、撮影対象者（保護者）の同意なくアップロードする行為
          </li>
          <li>公序良俗に反する内容・違法な内容の投稿</li>
          <li>本サービスの運営を妨害する行為（不正アクセス・過度なリクエスト等）</li>
          <li>施設に対する誹謗中傷を目的とした利用</li>
        </ul>
      </section>

      <section>
        <h2 id="content" className={h2Class}>4. コンテンツの取り扱い</h2>
        <ul className={listClass}>
          <li>ユーザーが登録した記録・写真の権利はユーザーに帰属します。</li>
          <li>
            当社は、サービス提供および第4条（プライバシーポリシー）に定める匿名集計の目的に限り、登録された情報を利用します。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="facility-info" className={h2Class}>5. 施設情報について（免責）</h2>
        <ul className={listClass}>
          <li>
            掲載している施設情報（料金・営業時間・設備等）は変更される場合があります。<strong>おでかけ前に各施設の公式サイト等で最新情報をご確認ください。</strong>
          </li>
          <li>施設情報の正確性・完全性について、当社は保証しません。</li>
        </ul>
      </section>

      <section>
        <h2 id="service-changes" className={h2Class}>6. サービスの変更・停止</h2>
        <ul className={listClass}>
          <li>当社は、事前の告知なくサービス内容を変更・一時停止することがあります。</li>
          <li>
            長期の停止・終了の場合は、合理的な期間をもって告知し、データのエクスポートまたは削除の機会を提供するよう努めます。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="disclaimer" className={h2Class}>7. 免責</h2>
        <ul className={listClass}>
          <li>
            当社は、本サービスの利用により生じた損害について、当社の故意または重過失による場合を除き、責任を負いません。
          </li>
          <li>おでかけ先での事故・トラブルについて、当社は責任を負いません。</li>
        </ul>
      </section>

      <section>
        <h2 id="revisions" className={h2Class}>8. 規約の改定</h2>
        <p className="mt-3">本規約を改定する場合は、サイト上で告知します。</p>
      </section>

      <section>
        <h2 id="governing-law" className={h2Class}>9. 準拠法・管轄</h2>
        <p className="mt-3">
          本規約は日本法に準拠し、紛争が生じた場合は横浜地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </section>
    </LegalDocument>
  );
}
