# ブランド・ドメイン戦略書

> 作成: 2026-06-09 | ステータス: ブランド名確定・実装場所は検討中

---

## 確定事項

| 項目 | 内容 |
|---|---|
| サービス名（日本語） | **メモリップ** |
| サービス名（英語） | **Memorips** |
| ドメイン | **memorips.com**（取得済み ✅） |
| 語源 | Memory + Trips |
| コンセプト | 家族のおでかけ・旅・遊び場の記録がたまり、子どもの"好き"や成長が見えてくるサービス |

---

## 1. サービス名「メモリップ / Memorips」の位置づけ

### ブランドの意味

> **Memory × Trips** = 「おでかけの記録・思い出」という意味を自然に含む造語

- 記録・思い出（Memory）という意味と旅・おでかけ（Trips）を組み合わせた独自ブランド
- 英語圏でも発音しやすく、アプリストアでの検索・記憶に強い
- 「遊び場検索」だけでなく、ホテル・体験・旅行記録にも自然に拡張できる

### ブランドが伝えたいこと

施設の口コミや検索サービスではなく、**家族の記録が資産になるプラットフォーム**。

```
Before（Trip Guide）: 「子どもの遊び場を探すサイト」
After（メモリップ）:  「子どもの"好き"が見える、おでかけ記録サービス」
```

---

## 2. タグライン

### 日本語（優先候補）

| タグライン | トーン |
|---|---|
| **子どもの"好き"が見える、おでかけ記録サービス** | 機能訴求。最も内容が伝わる（推奨） |
| 家族のおでかけを、思い出と発見に変える | 情緒訴求。少しポエティック |
| 行った場所が、子どもの"好き"に変わる | コンパクト・SNS 向け |
| 家族のおでかけを、記録して、次に活かす | 機能訴求。実利派向け |

### 英語

| タグライン | 用途 |
|---|---|
| **Family trips, beautifully remembered.** | ブランド LP・App Store（推奨） |
| Remember the places your kids loved. | SNS・アプリ紹介 |
| Discover, save, and remember family-friendly places. | 機能説明向け |

---

## 3. Trip Guide との関係整理

### 役割分担（初期段階）

| サービス | 役割 | ドメイン |
|---|---|---|
| Trip Guide | 子どもの遊び場検索・施設 DB（968 施設・9県） | `trip-guide.net` |
| メモリップ | 家族のおでかけ記録・マイページ・分析機能 | MVP は `trip-guide.net/mypage/` or `memorips.com` |
| memorips.com | 将来の本体ブランド、または初期 LP・事前登録 | `memorips.com` |

### 関係性のポジショニング

初期段階の表記案:

- **メモリップ by Trip Guide** — 既存ユーザーに Trip Guide との継続性を伝える
- **Memorips（Trip Guide の新機能）** — 既存ユーザーへの告知時
- **メモリップ** 単独 — 新規ユーザー向け・アプリ化後

**施設検索と記録機能は共存する。** Trip Guide の遊び場データが、メモリップの「記録先」として機能する。

---

## 4. 実装場所の比較（MVP の構築場所）

ブランド名「メモリップ」は確定。MVP をどこで作るかは以下の観点で比較する。

### Option 1: trip-guide.net 上でMVPを作る（推奨）

**URL 例**: `trip-guide.net/mypage/`, `trip-guide.net/memorips/`

| 観点 | 評価 |
|---|---|
| 施設データの流用 | **◎** — 既存 JSON（968 施設）をそのまま使える |
| 開発速度 | **◎** — 既存 Next.js・Vercel・Supabase 環境に追加するだけ |
| SEO への影響 | **◎** — 既存施設ページに影響なし |
| ブランド表現 | △ — URL が trip-guide.net のため、メモリップ感は薄い |
| 将来の移行 | △ — 後から memorips.com へ移行する作業が発生する |
| コスト | **◎** — Vercel 無料枠のまま |

**メリット**: 最速で PMF を検証できる。既存 968 施設・施設ページ・SEO を失わない。

**デメリット**: MVP の URL がブランドを体現しない。将来の移行コストが発生する。

---

### Option 2: memorips.com を本体として新規構築

**URL 例**: `memorips.com/facilities/`, `memorips.com/mypage/`

| 観点 | 評価 |
|---|---|
| 施設データの流用 | △ — JSON を新リポジトリにコピーする作業が必要 |
| 開発速度 | △ — 新規環境構築・DNS 設定・Vercel プロジェクト新設が必要 |
| SEO への影響 | **要注意** — 施設ページの URL が変わる。301 リダイレクト必須 |
| ブランド表現 | **◎** — 最初からメモリップのブランド URL になる |
| 将来の移行 | **◎** — 移行作業不要 |
| コスト | △ — 新規 Vercel プロジェクト・ドメイン費用 |

**メリット**: 最初からブランドとして純粋。将来の移行コストが不要。

**デメリット**: 施設データの移行・SEO のリダイレクト対応・環境構築の初期コストがかかる。  
特に施設ページの検索流入が一時的に下がるリスクがある（リダイレクト対応で 6〜12ヶ月かかる場合あり）。

---

### Option 3: 併用（段階的移行）

**構成**:
- `trip-guide.net` — 施設検索・施設 DB・マイページ（MVP 段階）
- `memorips.com` — ブランド LP・事前登録・将来の本体

| フェーズ | trip-guide.net | memorips.com |
|---|---|---|
| MVP（今） | 施設検索 + マイページ | LP・事前登録ページ |
| PMF 確認後 | 施設検索（維持） | 記録サービス本体に昇格 |
| ブランド確立後 | 施設 DB として維持 or 移行 | 本体（施設検索 + 記録） |

**メリット**: Option 1 の速度と Option 2 のブランド価値を両立。

**デメリット**: 2 ドメイン管理。ユーザーがどちらを使えばいいか混乱しないよう導線設計が必要。

---

### 現時点の推奨

> **Option 1（trip-guide.net でMVP） + Option 3（memorips.com を LP として先行公開）** の組み合わせ。

1. ~~`memorips.com` ドメインを取得する~~ → **取得済み ✅（2026-06-09）**
2. `trip-guide.net/mypage/` に Supabase を使って MVP を構築
3. 施設ページに「メモリップで記録する」ボタンを追加
4. `memorips.com` にはブランド LP + 事前登録ページを公開（ブランドを先行発信）
5. PMF 確認後に `memorips.com` を本体にする判断をする

---

## 5. 既存施設データの活かし方

### MVP では JSON をそのまま使う

`data/facilities_data.json`（968 施設）は、`visits.facility_slug` を通じてメモリップの記録と紐付く。  
施設ページから「メモリップで記録する」ボタンをタップすると、施設情報が自動セットされる。

### memorips.com に移行するとき

```
Step 1: facilities_data.json を新リポジトリにコピー（最速・0コスト）
Step 2: 施設ページの URL を memorips.com/facilities/* に変更
Step 3: trip-guide.net/facilities/* → memorips.com/facilities/* の 301 リダイレクト設定
Step 4: Google Search Console でドメイン変更を申請
```

施設スラグ（`facility-001` 等）は変えない。URL の先頭ドメインだけを変える。

---

## 6. SEO・リダイレクト・URL 設計の注意点

### 施設ページ（SEO 資産あり）

- 現在 `trip-guide.net/facilities/[slug]` でインデックス済み
- スラグを変えずに移行すれば、301 リダイレクトで評価を引き継ぎやすい
- 完全な SEO 回復まで 3〜12ヶ月かかる場合があるため、移行タイミングは慎重に

### マイページ（SEO 不要）

- `/mypage/*` は認証必須 → 検索エンジンにインデックスされない
- マイページの URL は SEO を気にせず設計してよい
- `trip-guide.net/mypage/` でも `memorips.com/mypage/` でも機能上は同等

### URL 設計の原則

```
施設スラグは変えない
  ○ trip-guide.net/facilities/shinagawa-park-001
  ○ memorips.com/facilities/shinagawa-park-001（移行後）
  ✕ memorips.com/places/shinagawa-park-001（slug まで変えると SEO リセット）
```

---

## 7. サービス名を後から管理しやすくする実装方針

### `lib/site-config.ts` に一箇所でまとめる

```typescript
// lib/site-config.ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'メモリップ',
  nameEn: process.env.NEXT_PUBLIC_SITE_NAME_EN ?? 'Memorips',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE ?? '子どもの"好き"が見える、おでかけ記録サービス',
  taglineEn: 'Family trips, beautifully remembered.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trip-guide.net',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'mail@memorips.com',
  ogImage: '/og-default.png',
}
```

環境変数で上書きできるため、`memorips.com` への移行時はサーバー設定を変えるだけで全ページが切り替わる。

### ハードコード禁止リスト

| 項目 | 対応方針 |
|---|---|
| `<title>` / OGP タイトル | `siteConfig.name` を使う |
| フッターの著作権表示 | `siteConfig.name` を使う |
| ヘッダーロゴのテキスト | `siteConfig.name` + `siteConfig.nameEn` |
| 確認メール・パスワードリセットメールの送信者名 | Supabase Auth テンプレートで環境変数参照 |
| 利用規約・プライバシーポリシーのサービス名 | コンポーネントまたは CMS で管理 |
| マイページのウェルカムメッセージ | `siteConfig.name` を使う |
| メタディスクリプション | `siteConfig.tagline` を使う |

### Supabase Auth のメールテンプレート

Supabase ダッシュボードのメールテンプレートで、サービス名を変数として差し込む:

```
件名: {{ .SiteURL }} へのご登録確認
本文: {{.SiteName}} をご利用いただきありがとうございます。
```

`SiteURL`・`SiteName` は Supabase の設定画面から変更できる。

---

## 8. ブランド表記ルール

### 正式表記

| 場面 | 表記 |
|---|---|
| 日本語 UI | メモリップ |
| 英語 UI・グローバル | Memorips |
| URL・スラグ | `memorips`（小文字） |
| ハッシュタグ | `#メモリップ` / `#Memorips` |
| 正式名称（日英併記） | メモリップ / Memorips |

### Trip Guide との表記

| 場面 | 表記 |
|---|---|
| 既存ユーザーへの告知 | メモリップ（Trip Guide の新機能） |
| 新規ユーザー向け | メモリップ |
| サービス名単体 | メモリップ |
| 副題・補足 | Memorips by Trip Guide |
| フッターの法的表記 | 運営: Trip Guide（または Memorips） |

---

## 9. memorips.com LP の内容案（先行公開時）

```
ファーストビュー:
  「メモリップ」
  子どもの"好き"が見える、おでかけ記録サービス
  Family trips, beautifully remembered.
  [今すぐ無料で始める] または [事前登録する]

What is Memorips?（サービス紹介）
  行った場所を記録 → 子どもの好みが見える → 次のおでかけに活かせる

3ステップで使える
  1. 行きたい施設を見つける（Trip Guide の 968 施設から）
  2. 行ったら「記録する」をタップ
  3. 子どもの反応をボタンで選ぶ（30秒）

こんな気づきが生まれます
  「うちの子は水遊びが得意」
  「動物園は長男◎、次男は怖がった」
  「この公園、3回目でもリピートしたい」

[無料で始める]
```

---

## 10. 将来的な memorips.com への移行手順（フルフロー）

```
Phase 0（今すぐ）:
  1. memorips.com ドメインを取得・仮押さえ

MVP〜PMF 確認（Phase 1〜4）:
  2. trip-guide.net/mypage/ にメモリップ機能を構築
  3. memorips.com に LP を公開（ブランド先行発信）
  4. ユーザー基盤・データ蓄積・PMF の確認

移行判断（Phase 4〜5 以降）:
  5. ブランド移行の最終決定
  6. memorips.com に Vercel プロジェクトを新設
  7. facilities_data.json・Supabase 設定を移行
  8. trip-guide.net/facilities/* → memorips.com/facilities/* の 301 リダイレクト設定
  9. trip-guide.net/mypage/* → memorips.com/mypage/* のリダイレクト設定
  10. Google Search Console でドメイン変更申請
  11. サイトマップを memorips.com で再提出
  12. Supabase Auth の URL 設定を memorips.com に変更
  13. Vercel 環境変数の NEXT_PUBLIC_SITE_URL を memorips.com に変更
```

---

## 11. 確定方針（2026-06-09 オーナー承認）

### ドメイン役割分担（確定）

| ドメイン | 役割 | 状態 |
|---|---|---|
| `trip-guide.net` | 既存施設 DB・遊び場検索サイト（968施設・9県）として継続活用 | 稼働中 |
| `memorips.com` | 将来的な記録サービスブランドとして育てる | 取得済み・未公開 |

**MVP は `trip-guide.net` 上で構築**（`/mypage/*`）。  
`memorips.com` の具体的な使い方は下記の未決事項で判断する。

### memorips.com の URL 構成（要確認・未決）

以下の3つから選ぶ。**オーナーの確認が必要**。

| オプション | 構成 | メリット | デメリット |
|---|---|---|---|
| **A: LP のみ** | `memorips.com` = ブランド LP + 事前登録 | 最速・リスクゼロ | アプリ URL は trip-guide.net のまま |
| **B: サブドメイン** | `app.memorips.com` = 記録サービス本体 | ブランド URL を早期に確立 | Supabase Auth の URL 設定変更・Vercel 追加設定が必要 |
| **C: フル移行** | `memorips.com` = 施設検索 + 記録の全機能 | 最終形に最も近い | SEO リスク（施設ページの検索評価が一時下落） |

**現時点の暫定方針**: Option A（LP 先行）で進め、PMF 確認後に B or C を判断する。  
→ **最終決定はオーナーの確認が必要**。

---

## 12. 次にオーナーが判断すべきこと

| 優先度 | 判断事項 | タイミング |
|---|---|---|
| 高 | `memorips.com` を LP のみ / `app.memorips.com` / フル移行のどれにするか | Phase 1 開始前 |
| 中 | 「メモリップ by Trip Guide」 vs「メモリップ」単独 どちらで進めるか | Phase 1〜2 |
| 低 | memorips.com LP の公開タイミング | Phase 2 完了後 |

---

*最終更新: 2026-06-09 v2（オーナー方針確定）*
