import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { SERVICE } from "@/lib/config";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "メモリップのプライバシーポリシー。取得する情報、利用目的、匿名集計、写真の取り扱い、第三者提供の方針について説明します。",
  alternates: { canonical: "/privacy" },
};

const h2Class = "scroll-mt-24 text-xl font-bold leading-snug text-slate-900";
const h3Class =
  "mt-7 scroll-mt-24 text-lg font-bold leading-snug text-slate-900";
const listClass =
  "legal-list mt-3 space-y-2.5 list-disc marker:text-slate-400";
const orderedListClass =
  "legal-list mt-3 space-y-2.5 list-decimal marker:text-slate-400";

const privacyToc = [
  { id: "operator", label: "事業者情報" },
  { id: "users", label: "本サービスの利用者について" },
  { id: "collected-info", label: "取得する情報" },
  { id: "purposes", label: "利用目的" },
  { id: "aggregate", label: "匿名集計について" },
  { id: "photos", label: "写真の取り扱い" },
  { id: "third-party", label: "第三者提供" },
  { id: "processors", label: "委託先・外部サービス" },
  { id: "cookies", label: "Cookie 等の利用" },
  { id: "retention", label: "保存期間" },
  { id: "deletion", label: "データの削除" },
  { id: "security", label: "安全管理" },
  { id: "revisions", label: "改定" },
];

export default function PrivacyPage() {
  return (
    <LegalDocument title="プライバシーポリシー" tableOfContents={privacyToc}>
      <section>
        <h2 id="operator" className={h2Class}>1. 事業者情報</h2>
        <ul className={listClass}>
          <li>サービス名: メモリップ（trip-guide.net 上で提供）</li>
          <li>運営者: {SERVICE.operatorName}</li>
          <li>問い合わせ先: {SERVICE.supportEmail}</li>
        </ul>
      </section>

      <section>
        <h2 id="users" className={h2Class}>1-2. 本サービスの利用者について</h2>
        <p className="mt-3">
          本サービスは、<strong>保護者の方がご家庭のおでかけ記録を管理するためのサービス</strong>です。お子さまご本人による単独でのご利用は想定していません。アカウントの作成・記録の入力は保護者など成人の方が行ってください。
        </p>
      </section>

      <section>
        <h2 id="collected-info" className={h2Class}>2. 取得する情報</h2>
        <h3 className={h3Class}>2.1 アカウント情報</h3>
        <ul className={listClass}>
          <li>
            メールアドレス、表示名、認証情報（Google ログインの場合は Google
            アカウントの基本情報）
          </li>
        </ul>

        <h3 className={h3Class}>2.2 お子さまに関する情報（保護者が任意で登録）</h3>
        <ul className={listClass}>
          <li>ニックネーム、生年月（年齢計算のため）、プロフィール画像（任意）</li>
          <li>
            <strong>本サービスはお子さまご本人ではなく、保護者が自身の記録のために入力する情報を扱います。お子さまの氏名（フルネーム）の登録は不要であり、ニックネームでの登録を推奨します。</strong>
          </li>
        </ul>

        <h3 className={h3Class}>2.3 おでかけ記録</h3>
        <ul className={listClass}>
          <li>
            訪問した施設、訪問日、同行したお子さま、お子さまの反応タグ、満足度、また行きたいか、保護者の疲労度、自由メモ、その他任意項目（天気・混雑・滞在時間・食事など）
          </li>
        </ul>

        <h3 className={h3Class}>2.4 写真（写真機能の提供開始後）</h3>
        <ul className={listClass}>
          <li>訪問記録に添付される写真</li>
          <li>
            <strong>写真はアップロード前に位置情報（GPS）・撮影機材情報などのメタデータ（EXIF）を端末上で削除した上で保存されます。当社は写真の位置情報を取得・保存しません。</strong>（撮影日の日付のみ、記録の整理のために保存する場合があります）
          </li>
        </ul>

        <h3 className={h3Class}>2.5 利用状況</h3>
        <ul className={listClass}>
          <li>アクセスログ、Cookie、Google Analytics による利用統計</li>
        </ul>
      </section>

      <section>
        <h2 id="purposes" className={h2Class}>3. 利用目的</h2>
        <ol className={orderedListClass}>
          <li>サービスの提供（記録の保存・表示・振り返り機能）</li>
          <li>お子さまの反応の集計など、ご自身の家族向け分析機能の提供</li>
          <li>
            <strong>匿名化された統計情報の作成・表示</strong>（第4条）
          </li>
          <li>サービス改善・不具合対応</li>
          <li>重要なお知らせの連絡</li>
        </ol>
      </section>

      <section>
        <h2 id="aggregate" className={h2Class}>4. 匿名集計について</h2>
        <ul className={listClass}>
          <li>
            当社は、訪問記録のうち<strong>構造化された項目</strong>（反応タグ・満足度・また行きたい・滞在時間・お子さまの年齢帯など）を、<strong>個人を特定できない形に集計</strong>した上で、施設ページ等に「みんなの記録」として表示することがあります。
          </li>
          <li>
            匿名集計には<strong>個人名・お子さまのニックネーム・自由メモ・写真は一切含まれません</strong>。
          </li>
          <li>
            集計は<strong>一定件数以上の記録が集まった場合にのみ</strong>表示され、年齢は年齢帯（例: 3〜5歳）に丸められます。
          </li>
          <li>
            個人や特定のご家族が推測されにくいよう、<strong>割合の丸め・表示への反映タイミングの調整</strong>などの安全処理を行うことがあります。
          </li>
          <li>
            匿名集計への提供の停止をご希望の場合は、<strong>問い合わせ先までご連絡ください</strong>。今後、設定画面から停止できる機能の提供を予定しています。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="photos" className={h2Class}>5. 写真の取り扱い（写真機能の提供開始後）</h2>
        <ul className={listClass}>
          <li>
            写真は<strong>非公開</strong>で保存され、ご本人（アカウント所有者）のみが閲覧できます。
          </li>
          <li>
            <strong>施設ページ・検索結果などの公開面に写真が表示されることはありません。</strong>
          </li>
          <li>
            写真はいつでも削除できます。削除された写真は直ちに閲覧できない状態にし、保存領域からの削除処理を行います。
          </li>
          <li>
            <strong>他のご家族・第三者のお子さまが写る写真</strong>をアップロードする場合は、必要な同意を得たうえで行ってください。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="third-party" className={h2Class}>6. 第三者提供</h2>
        <ul className={listClass}>
          <li>法令に基づく場合を除き、個人情報を第三者に提供しません。</li>
          <li>
            将来、匿名化された統計情報（第4条の集計値）を施設運営者等に提供する場合があります。その場合も、個人や特定のご家族を識別できる情報は含まれません。提供を開始する際は、<strong>提供内容・目的・範囲を明確にしたうえで本ポリシーを改定し、事前に告知します</strong>。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="processors" className={h2Class}>7. 委託先・外部サービス</h2>
        <ul className={listClass}>
          <li>データ保管: Supabase（データベース・ストレージ）</li>
          <li>ホスティング: Vercel</li>
          <li>アクセス解析: Google Analytics</li>
          <li>認証: Google（Google ログイン利用時）</li>
        </ul>
      </section>

      <section>
        <h2 id="cookies" className={h2Class}>7-2. Cookie 等の利用</h2>
        <ul className={listClass}>
          <li>
            本サービスは、ログイン状態の維持・利用状況の分析（Google
            Analytics）のために Cookie 等を利用します。
          </li>
          <li>
            Cookie
            はブラウザの設定により無効化できます。ただし、無効化した場合はログイン等の一部機能が利用できなくなる可能性があります。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="retention" className={h2Class}>7-3. 保存期間</h2>
        <ul className={listClass}>
          <li>
            おでかけ記録・写真・お子さま情報は、<strong>ユーザーご自身が削除するまで</strong>（または退会まで）保存されます。
          </li>
          <li>
            アクセスログ等の運営記録は、不正利用の防止・障害対応など運営上必要な範囲で一定期間保存される場合があります。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="deletion" className={h2Class}>8. データの削除</h2>
        <ul className={listClass}>
          <li>記録・写真・お子さま情報は、ユーザー自身がいつでも削除できます。</li>
          <li>退会時には、アカウントに紐づく記録・写真・お子さま情報を削除します。</li>
          <li>削除のご依頼・ご質問は問い合わせ先までご連絡ください。</li>
        </ul>
      </section>

      <section>
        <h2 id="security" className={h2Class}>9. 安全管理</h2>
        <ul className={listClass}>
          <li>通信は SSL/TLS で暗号化されます。</li>
          <li>
            記録・写真へのアクセスはアカウント所有者本人に限定する技術的制御（行レベルセキュリティ）を実施しています。
          </li>
        </ul>
      </section>

      <section>
        <h2 id="revisions" className={h2Class}>10. 改定</h2>
        <ul className={listClass}>
          <li>
            本ポリシーを改定する場合は、サイト上で告知します。重要な変更（匿名集計の範囲拡大・第三者提供の開始等）は事前に告知します。
          </li>
        </ul>
      </section>
    </LegalDocument>
  );
}
