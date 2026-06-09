# 写真提供・利用許諾 設計書

> 作成: 2026-06-09 | ステータス: 設計済み・MVP後フェーズ実装予定

---

## 1. フローの種類

メモリップでは、写真に関して2つの独立したフローを設計する。

| フロー | 対象者 | 会員登録 | 概要 |
|---|---|---|---|
| **A: 会員アップロード** | ログイン済みユーザー | 必要 | 訪問記録に写真を添付。公開範囲を自分で設定 |
| **B: 非会員写真提供** | X（Twitter）など SNS ユーザー | **不要** | 写真の利用許諾だけを取る。会員登録不要 |

このドキュメントは **フロー B（非会員写真提供）** を対象とする。  
フロー A（会員アップロード）は `mypage-data-design.md` の `visit_photos` テーブルを参照。

---

## 2. 非会員写真提供フローの目的

### なぜ必要か

施設ページの写真を充実させるには、会員ユーザーのアップロードだけでは数が足りない可能性がある。  
X・Instagram などで「#メモリップ」「#trip-guide」タグで投稿された写真を、  
**写真の権利者から許諾を取った上で** 施設ページに掲載できるようにする。

### 前提条件

- 提供者は会員登録不要
- 利用許諾（同意）は必ず取得する
- 子どもの顔が写っている写真は管理者が個別に判断する
- 掲載後も提供者が削除依頼できる仕組みを設ける

---

## 3. 提供フロー

### パターン 1: メモリップ側からのスカウト型

1. 管理者が X / Instagram などで施設に関する投稿を発見
2. 投稿者に DM または返信で「写真をサイトに掲載させてください」と連絡
3. 提供者が許諾フォームに回答（名前・SNS URL・利用範囲の同意）
4. 管理者が審査・承認
5. 施設ページに写真を掲載（クレジット表記つき）

### パターン 2: 提供者からの自発的申請型

1. 提供者がメモリップの「写真を提供する」フォームにアクセス
2. SNS URL・写真 URL・利用範囲への同意を入力して送信
3. 管理者が審査・承認
4. 施設ページに掲載

---

## 4. DB テーブル設計

### `photo_contributions`（非会員写真提供テーブル）

```sql
CREATE TYPE photo_usage_scope AS ENUM (
  'site_only',          -- メモリップサイト内での掲載のみ
  'site_and_social',    -- サイト掲載 + 公式 SNS でのシェア可
  'site_social_ads'     -- サイト・SNS・広告素材としての使用可
);

CREATE TYPE contribution_status AS ENUM (
  'pending',     -- 管理者審査待ち
  'approved',    -- 掲載承認済み
  'rejected',    -- 掲載不可（審査落ち）
  'removed'      -- 掲載後に削除済み
);

CREATE TABLE public.photo_contributions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 提供者情報
  provider_name         TEXT NOT NULL,        -- 表示用の名前・ニックネーム（本名不要）
  provider_sns_url      TEXT,                 -- X の投稿 URL・プロフィール URL など
  provider_contact      TEXT,                 -- DM 返信先・連絡先（管理者のみ見える・非公開）

  -- 写真情報
  photo_url             TEXT NOT NULL,        -- 元の SNS 投稿写真 URL
  storage_path          TEXT,                 -- Supabase Storage にダウンロードした場合のパス
  caption               TEXT,                 -- 写真の説明文
  facility_slug         TEXT,                 -- どの施設の写真か
  facility_name         TEXT,                 -- 施設名（slug が変わっても残る）

  -- 利用許諾
  usage_scope           photo_usage_scope NOT NULL DEFAULT 'site_only',
  consent_confirmed     BOOLEAN NOT NULL DEFAULT false,  -- 提供者が同意したか
  consent_timestamp     TIMESTAMPTZ,          -- 同意取得日時

  -- クレジット表記
  credit_name           TEXT,                 -- 表示するクレジット（例: @username）
  credit_url            TEXT,                 -- クレジットにリンクする URL

  -- 子どもの顔・プライバシー
  has_child_face        BOOLEAN DEFAULT NULL, -- 子どもの顔が写っているか（NULL=未確認）
  face_handling         TEXT CHECK (face_handling IN (
                           'no_face',         -- 顔なし・そのまま掲載可
                           'blurred',         -- ぼかし処理済み
                           'not_applicable'   -- 判断不要
                         )),

  -- 管理・審査
  status                contribution_status NOT NULL DEFAULT 'pending',
  admin_note            TEXT,                 -- 管理者コメント（内部用）
  reviewed_by           TEXT,                 -- 審査者（管理者名・管理者ID）
  reviewed_at           TIMESTAMPTZ,

  -- 削除依頼
  removal_requested     BOOLEAN NOT NULL DEFAULT false,
  removal_reason        TEXT,                 -- 削除依頼理由
  removal_requested_at  TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

**インデックス**:
```sql
CREATE INDEX idx_photo_contributions_facility  ON public.photo_contributions(facility_slug);
CREATE INDEX idx_photo_contributions_status    ON public.photo_contributions(status);
CREATE INDEX idx_photo_contributions_removal   ON public.photo_contributions(removal_requested)
  WHERE removal_requested = true;
```

---

## 5. 施設ページへの写真の適用

承認済みの写真（`status = 'approved'`）のみ施設ページに表示する。

```sql
-- 施設ページに表示する写真を取得するクエリ例
SELECT
  pc.storage_path,      -- または photo_url
  pc.credit_name,
  pc.credit_url,
  pc.caption
FROM public.photo_contributions pc
WHERE
  pc.facility_slug = $1
  AND pc.status = 'approved'
  AND pc.removal_requested = false
ORDER BY pc.reviewed_at DESC;
```

---

## 6. 写真の権利・利用規約上の注意点

### 絶対に守ること

- **提供者の同意確認なしに掲載しない**（`consent_confirmed = true` のみ掲載）
- **子どもの顔写真は管理者が必ず目視確認する**（`has_child_face` チェック必須）
- **顔あり写真は `blurred`（ぼかし処理）後のみ掲載**
- **削除依頼には即座に対応**（48時間以内が目安）

### 利用規約への記載が必要な項目

- 写真提供者の権利（著作権は提供者に残る）
- メモリップが写真を使用できる範囲（`usage_scope` に対応）
- 提供者がいつでも掲載停止を依頼できること
- 削除依頼の受付方法・対応期日

### クレジット表記

- デフォルトは `@SNSアカウント名` 形式
- 提供者が非公開を希望する場合は「提供: メモリップユーザー」等の匿名表記

---

## 7. 管理者フロー

### 審査チェックリスト

```
[ ] 提供者の同意を確認した（consent_confirmed = true）
[ ] 写真が指定施設のものであることを確認した
[ ] 子どもの顔の有無を確認した（has_child_face を設定）
[ ] 顔あり写真の場合、ぼかし処理を行った（face_handling = 'blurred'）
[ ] クレジット表記の内容を確認した
[ ] 利用規約に反する内容がないことを確認した
→ status を 'approved' に変更
```

### 削除依頼の受付

- 提供者から削除依頼を受けたら `removal_requested = true` に設定
- 即時 `status = 'removed'` に変更し、施設ページから非表示にする
- `storage_path` の Supabase Storage ファイルを削除する
- 提供者に削除完了を通知する

---

## 8. MVP での実装優先度

**写真提供フローは MVP 後フェーズで実装する。**

MVP 段階での施設ページ写真は、引き続き以下で対応:
- 既存の Google Places API / Wikipedia API で取得した写真
- 会員ユーザーの `visit_photos`（`visibility = 'no_face_ok'` or `'anonymous_ok'`）

非会員写真提供フローを実装するタイミングの目安:
- 施設ページに表示できる会員ユーザー写真が不足していると感じたとき
- ユーザー基盤が一定規模に達し、SNS での自発的な投稿が増えてきたとき

---

## 9. 将来の拡張

### ハッシュタグ経由の自動収集

X API または Instagram Basic Display API を使って、  
`#メモリップ` タグ付き投稿を自動で `photo_contributions` テーブルに取り込み、  
管理者が一括審査できる仕組みに発展させることができる。

### UGC（ユーザー生成コンテンツ）戦略

非会員提供 → 写真が施設ページに掲載される → 提供者がシェア  
→ 新規ユーザーの流入 → 会員登録 → 記録ユーザーへ転換

写真提供を「サービスの認知拡大」の入口として位置づけることもできる。

---

*最終更新: 2026-06-09*
