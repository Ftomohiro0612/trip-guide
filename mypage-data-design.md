# マイページ DB・データ設計書 v3

> 作成: 2026-06-09 | 推奨実装: Supabase（PostgreSQL）

---

## 1. 全体構造

```
users（Supabase Auth 管理）
  ├── profiles（プロフィール・居住エリア）
  ├── children（子どもプロフィール）
  ├── visits（おでかけ記録・日付精度対応）
  │     ├── visit_children（訪問×子ども・満足度・当時年齢）
  │     ├── visit_costs（費用内訳）
  │     └── visit_photos（写真・公開範囲）
  └── wishlists（行きたいリスト・目的別カテゴリ）
```

---

## 2. テーブル定義

### `profiles`（ユーザープロフィール）

```sql
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  home_prefecture TEXT,     -- 都道府県コード（例: "13" = 東京）※市区町村以下は持たない
  home_city_code  TEXT,     -- 市区町村コード（任意・粗い粒度）※番地・マンション名は持たない
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**居住エリアの粒度設計**:
- 都道府県または市区町村レベルまで
- 正確な住所・番地・学校名は絶対に持たない
- 近場統計・近くの施設おすすめ（Phase 4）に使う

---

### `children`（子どもプロフィール）

```sql
CREATE TABLE public.children (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname     TEXT NOT NULL,       -- 「太郎」「はなちゃん」など（本名不要）
  birth_year   SMALLINT NOT NULL,   -- 例: 2020
  birth_month  SMALLINT NOT NULL,   -- 1〜12
  gender       TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  sort_order   SMALLINT DEFAULT 0,  -- 表示順（兄/姉が先）
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

**プライバシー設計**:
- 日付（生年月日）ではなく年月のみ（プライバシーリスク低減）
- 学校名・園名は持たない
- 訪問時の年齢は `visited_on - birth_year/birth_month` で自動計算

---

### `visits`（おでかけ記録・メインテーブル）

```sql
CREATE TYPE date_precision AS ENUM (
  'exact',    -- 正確な日付（例: 2024-08-15）
  'month',    -- 年月のみ（例: 2024年8月ごろ）
  'year',     -- 年のみ（例: 2024年ごろ）
  'unknown'   -- 日付不明
);

CREATE TABLE public.visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 施設情報
  facility_slug    TEXT NOT NULL,
  facility_name    TEXT NOT NULL,   -- 記録時点の名前（施設消滅対策）

  -- 訪問日（精度対応）
  visited_on       DATE,            -- 正確な日付（date_precision='exact' のときのみ）
  visited_year     SMALLINT,        -- 年（date_precision='year'/'month' のとき）
  visited_month    SMALLINT CHECK (visited_month BETWEEN 1 AND 12),  -- 月（'month' のとき）
  date_precision   date_precision NOT NULL DEFAULT 'exact',
  visit_period_label TEXT,          -- 例: "今年の夏休み"（自由入力の補助ラベル）

  -- 過去記録フラグ
  is_past_entry    BOOLEAN NOT NULL DEFAULT false,  -- 登録後日に遡って入力した記録

  -- 【必須】家族全体の評価（30秒で入力）
  -- 将来拡張: 子ども別は visit_children.child_revisit_intent、
  --           親別は visits.parent_revisit_intent に分離可能
  family_revisit   TEXT NOT NULL CHECK (family_revisit IN (
                     'yes',           -- また行きたい
                     'conditional',   -- 条件が合えば行きたい
                     'once_enough',   -- 一度で十分
                     'no'             -- もう行かない
                   )),
  -- 【将来】親個人の再訪意向（MVPでは family_revisit に統合）
  -- parent_revisit_intent TEXT CHECK (parent_revisit_intent IN ('yes','conditional','once_enough','no')),

  parent_fatigue   TEXT NOT NULL CHECK (parent_fatigue IN (
                     'easy',          -- 楽だった
                     'normal',        -- 普通
                     'tired',         -- 少し疲れた
                     'exhausted'      -- かなり疲れた
                   )),

  -- 【任意】施設評価
  crowding         TEXT CHECK (crowding IN ('empty', 'normal', 'crowded')),
  arrival_time     TEXT CHECK (arrival_time IN ('morning', 'before_noon', 'after_noon', 'evening')),
  parking_wait     BOOLEAN,
  queue_time       TEXT CHECK (queue_time IN ('none', 'short', 'long')),
  stay_duration    TEXT CHECK (stay_duration IN ('30min', '1h', '2h', 'half_day', 'full_day')),
  toilet           TEXT CHECK (toilet IN ('good', 'ok', 'bad')),
  nursing_room     TEXT CHECK (nursing_room IN ('good', 'ok', 'none')),
  stroller         TEXT CHECK (stroller IN ('good', 'ok', 'bad')),
  dining           TEXT CHECK (dining IN ('good', 'ok', 'bad')),
  rainy_day        TEXT CHECK (rainy_day IN ('good', 'ok', 'bad')),
  weather_resistance TEXT CHECK (weather_resistance IN ('good', 'ok', 'bad')),
  rest_area        BOOLEAN,

  -- 【任意】期待との比較（穴場発見・コスパ評価に使う）
  expectation_vs_reality TEXT CHECK (expectation_vs_reality IN (
                     'exceeded',   -- 期待以上だった
                     'met',        -- 期待どおりだった
                     'below'       -- 期待以下だった
                   )),

  -- 費用（詳細は visit_costs テーブル）
  total_cost       INTEGER DEFAULT NULL,   -- 円（NULL = 未入力）

  -- 自由入力
  parent_memo      TEXT,
  child_quote      TEXT,    -- 子どもの印象に残った一言
  next_time_note   TEXT,    -- 次回行くなら注意したいこと
  tip_for_others   TEXT,    -- 他の家族に伝えたいこと

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

**インデックス**:
```sql
CREATE INDEX idx_visits_user_id     ON public.visits(user_id);
CREATE INDEX idx_visits_facility    ON public.visits(facility_slug);
CREATE INDEX idx_visits_visited_on  ON public.visits(visited_on DESC NULLS LAST);
CREATE INDEX idx_visits_visited_year ON public.visits(visited_year DESC NULLS LAST);
```

---

### `visit_children`（訪問×子ども・満足度・当時年齢）

```sql
CREATE TYPE child_satisfaction AS ENUM (
  'loved',           -- 大満足
  'enjoyed',         -- 楽しんだ
  'neutral',         -- 普通
  'not_fit',         -- 合わなかった
  'could_not_join'   -- 参加できなかった
);

CREATE TABLE public.visit_children (
  visit_id            UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  child_id            UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,

  -- 【必須】満足度（5択ボタン）
  satisfaction        child_satisfaction NOT NULL,

  -- 当時の年齢（自動計算・保存）
  child_age_at_visit  SMALLINT,   -- 訪問日時点の年齢（date_precision='unknown'の場合はNULL）

  -- 【任意・詳細レビュー上部】一番反応したもの（タグ選択）
  -- メモリップの本質「子どもの好きが見える」のコアデータ
  -- 有効値: 動物/水遊び/乗り物/遊具/工作/体験/展示/食べ物/キャラクター/広い場所/その他
  reaction_tags       TEXT[],     -- 複数選択可（例: ['水遊び', '遊具']）

  -- 【任意】詳細反応
  best_moment         TEXT,       -- 一番楽しんだもの（フリーテキスト）
  bored_at            TEXT,       -- すぐ飽きたもの
  scared_of           TEXT,       -- 怖がったもの
  not_enough_detail   TEXT,       -- 物足りなかった内容
  age_fit             TEXT CHECK (age_fit IN ('too_early', 'just_right', 'too_late')),
  sibling_diff_note   TEXT,       -- 兄弟で差が出たポイント

  -- 【将来】子ども個別の再訪意向（MVPでは visits.family_revisit に統合）
  -- child_revisit_intent TEXT CHECK (child_revisit_intent IN ('yes','conditional','once_enough','no')),

  PRIMARY KEY (visit_id, child_id)
);
```

**`child_age_at_visit` の計算ロジック**（アプリ側で計算してから保存）:
```
age = visited_on.year - birth_year
      - (visited_on.month < birth_month ? 1 : 0)
```

---

### `visit_costs`（費用内訳）

```sql
CREATE TABLE public.visit_costs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN (
                'admission', 'food', 'transport', 'parking', 'other'
              )),
  amount      INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);
```

---

### `visit_photos`（訪問写真 + 公開範囲）

```sql
CREATE TYPE photo_visibility AS ENUM (
  'family_only',   -- 自分だけ見る（デフォルト）
  'no_face_ok',    -- 顔なしなら施設紹介等に使用可
  'anonymous_ok',  -- 匿名で施設・サービスPR利用可
  'private'        -- 下書き・一覧にも出さない
);

CREATE TABLE public.visit_photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id       UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  caption        TEXT,
  visibility     photo_visibility NOT NULL DEFAULT 'family_only',
  has_face       BOOLEAN DEFAULT NULL,    -- 顔写真かどうか（NULL=未確認）
  admin_approved BOOLEAN DEFAULT FALSE,  -- 管理者承認（公開申請時）
  exif_stripped  BOOLEAN DEFAULT FALSE,  -- EXIFデータ除去済みかどうか
  sort_order     SMALLINT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

**写真の EXIF 処理**:
- アップロード時に GPS・撮影位置などの EXIF 情報を必ず除去する
- `exif_stripped = true` になってから `storage_path` を確定する

---

### `wishlists`（行きたいリスト + 目的別カテゴリ）

```sql
CREATE TYPE wishlist_category AS ENUM (
  'this_weekend',       -- 今週末に行きたい
  'rainy_day',          -- 雨の日候補
  'summer',             -- 夏休み候補
  'birthday',           -- 誕生日候補
  'with_grandparents',  -- 祖父母と行きたい
  'travel',             -- 旅行のとき
  'nearby',             -- 近場で軽く
  'uncategorized'       -- 未分類
);

CREATE TABLE public.wishlists (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facility_slug   TEXT NOT NULL,
  facility_name   TEXT NOT NULL,
  category        wishlist_category NOT NULL DEFAULT 'uncategorized',
  note            TEXT,
  added_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, facility_slug)
);
```

---

## 3. Row Level Security（RLS）設定

```sql
-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分のプロフィールのみ"
  ON public.profiles FOR ALL USING (auth.uid() = id);

-- children
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の子どもプロフィールのみ"
  ON public.children FOR ALL USING (auth.uid() = user_id);

-- visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の記録のみ"
  ON public.visits FOR ALL USING (auth.uid() = user_id);

-- visit_children
ALTER TABLE public.visit_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の訪問に紐づく子ども記録のみ"
  ON public.visit_children FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_children.visit_id
        AND visits.user_id = auth.uid()
    )
  );

-- visit_costs
ALTER TABLE public.visit_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の訪問に紐づく費用のみ"
  ON public.visit_costs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.visits
      WHERE visits.id = visit_costs.visit_id
        AND visits.user_id = auth.uid()
    )
  );

-- visit_photos
ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の写真のみ"
  ON public.visit_photos FOR ALL USING (auth.uid() = user_id);

-- wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分のウィッシュリストのみ"
  ON public.wishlists FOR ALL USING (auth.uid() = user_id);
```

---

## 4. 将来の分析用途ごとの必要データ

設計判断の根拠として、「どの分析にどのデータが必要か」を明示する。

### 子どもの好み分析

| 必要なデータ | テーブル.カラム |
|---|---|
| 子どもID | `visit_children.child_id` |
| 訪問時年齢 | `visit_children.child_age_at_visit` |
| 施設カテゴリ | 施設JSONの`experience_tags` |
| 子どもの満足度 | `visit_children.satisfaction` |
| 一番反応した体験 | `visit_children.best_moment` |
| すぐ飽きたもの | `visit_children.bored_at` |
| 滞在時間 | `visits.stay_duration` |

### 似た家族へのおすすめ

| 必要なデータ | テーブル.カラム |
|---|---|
| 子どもの年齢構成 | `children.birth_year`, `visit_children.child_age_at_visit` |
| 家族構成 | `children` テーブルの件数・性別 |
| よく行く施設カテゴリ | `visits.facility_slug` × 施設JSON |
| 高評価施設 | `visit_children.satisfaction = 'loved'` |
| また行きたい意向 | `visits.family_revisit` |
| 行きたいリスト | `wishlists` |
| 居住エリア | `profiles.home_prefecture` |
| 親の疲労度 | `visits.parent_fatigue` |

### 近場の統計（施設ページへの表示）

| 必要なデータ | テーブル.カラム |
|---|---|
| 施設ID | `visits.facility_slug` |
| 訪問日（季節分析） | `visits.visited_on`, `visited_month` |
| 子どもの年齢 | `visit_children.child_age_at_visit` |
| 満足度 | `visit_children.satisfaction` |
| リピート意向 | `visits.family_revisit` |
| 混雑度 | `visits.crowding` |
| 親の疲労度 | `visits.parent_fatigue` |
| 期待超過 | `visits.expectation_vs_reality` |

**注意**: これらの集計は必ず匿名化する。最小サンプル数（例: 5件未満は非表示）を設定する。

### 施設改善レポート（B2B・将来）

| 使えるデータ | テーブル.カラム |
|---|---|
| 年齢別満足度 | `visit_children.satisfaction` × `child_age_at_visit` |
| 親の疲労度 | `visits.parent_fatigue` |
| リピート意向 | `visits.family_revisit` |
| 混雑度 | `visits.crowding` |
| トイレ評価 | `visits.toilet` |
| 食事評価 | `visits.dining` |
| 駐車場待ち | `visits.parking_wait` |
| ベビーカー | `visits.stroller` |
| 期待超過 | `visits.expectation_vs_reality` |

**施設に見せてよいもの**: 匿名集計のみ。個別家族・個別ユーザーの行動は見せない。

### ホテル・体験・習い事提案

| 必要なデータ | テーブル.カラム |
|---|---|
| 子どもが高評価したカテゴリ | `visit_children.satisfaction` × 施設カテゴリ |
| 子どもが反応した体験 | `visit_children.best_moment` |
| 苦手だった環境 | `visit_children.scared_of` |
| 親の疲労度が低かった条件 | `visits.parent_fatigue = 'easy'` × 施設タイプ |
| 費用感 | `visits.total_cost` |
| 行きたいリスト | `wishlists` |

---

## 5. プライバシーデータカタログ

### 収集してよいデータ

| データ | 収集可否 | 粒度・制限 |
|---|---|---|
| 居住エリア | ○ | 都道府県 or 市区町村レベルのみ |
| 子どものニックネーム | ○ | 本名不要・非公開 |
| 子どもの生年月 | ○ | 年月のみ（日付まで不要） |
| 子どもの性別 | △ | 任意 |
| 訪問施設・訪問日 | ○ | 本人のみ閲覧 |
| 子どもの満足度 | ○ | 本人のみ閲覧（集計は匿名化） |
| 費用 | ○ | 本人のみ閲覧 |
| 写真 | ○ | デフォルト非公開・EXIF除去必須 |

### 収集してはいけないデータ

| データ | 理由 |
|---|---|
| 子どもの本名 | プライバシーリスク。ニックネームで十分 |
| 顔写真（公開設定での自動利用） | 明示同意なし・管理者承認なしでの利用は禁止 |
| 正確な住所・番地 | 不要かつリスクが高い |
| 学校名・園名 | 個人特定リスク |
| 行動履歴の公開 | 家族の行動パターンは非公開 |
| 写真のGPS情報（EXIF） | アップロード時に除去 |
| 自由記述に含まれる個人情報 | 入力時に注意喚起するが収集を阻止はできない |
| 生年月日（日まで） | 年月で十分。日付まで不要 |

### 匿名集計時のルール

- 個別ユーザー・個別家族の情報は外部に出さない
- 最小サンプル数: 5件未満の集計結果は非表示
- 施設向けレポートには、集計後のスコアのみを渡す（生データは渡さない）
- 利用規約・プライバシーポリシーに集計利用を明記する（サービス開始前に必須）

---

## 6. 再訪意向フィールドの拡張設計

### MVP: `family_revisit`（家族全体）のみ

MVP では家族全体の再訪意向を1フィールドで管理する。入力コストを最小化するため。

### 将来の拡張パス

```
MVP:      visits.family_revisit のみ（家族全体）
Phase 3+: visits.parent_revisit_intent を追加（親個人の意向）
Phase 3+: visit_children.child_revisit_intent を追加（子ども別の意向）
```

フィールド定義（共通値セット）:

```sql
-- 将来追加するカラム（現在はコメントアウト）
-- visits.parent_revisit_intent
-- visit_children.child_revisit_intent
-- 値: 'yes' | 'conditional' | 'once_enough' | 'no'
```

**分析活用例**:
- `family_revisit = 'yes'` かつ `parent_revisit_intent = 'no'` → 子どものために我慢して行く施設の検出
- `child_revisit_intent = 'yes'` かつ `satisfaction = 'neutral'` → 満足度は普通でも「また来たがった」施設の検出

---

## 7. 反応タグ（`reaction_tags`）の仕様

### 目的

「子どもが一番反応したもの」をタグで記録する。  
メモリップの本質コンセプト「子どもの好きが見える」を支えるデータ。

### 定義済みタグ一覧

```
動物 / 水遊び / 乗り物 / 遊具 / 工作 / 体験 / 展示 / 食べ物 / キャラクター / 広い場所 / その他
```

### 入力 UI

- 詳細レビュー（「詳しく記録する▼」展開後）の **最上部に配置**
- ボタングリッド形式（タップで複数選択可）
- 「その他」を選択するとフリーテキスト入力欄が出現

### 分析活用例

```sql
-- 子どもが「水遊び」に高反応した施設一覧
SELECT DISTINCT facility_slug
FROM visit_children vc
JOIN visits v ON vc.visit_id = v.id
WHERE '水遊び' = ANY(vc.reaction_tags)
  AND vc.satisfaction IN ('loved', 'enjoyed');

-- タグ別の年齢分布（どの年齢に何が刺さるか）
SELECT
  unnest(reaction_tags) AS tag,
  child_age_at_visit,
  COUNT(*) AS count
FROM visit_children
WHERE reaction_tags IS NOT NULL
GROUP BY tag, child_age_at_visit
ORDER BY tag, child_age_at_visit;
```

---

## 8. 非会員写真提供フロー

会員ユーザーのアップロード（`visit_photos` テーブル）とは別に、  
X・Instagram などの SNS ユーザーが会員登録なしで写真提供できるフローを設計する。

詳細設計は **[photo-permission-design.md](photo-permission-design.md)** を参照。

### テーブル概要

```sql
-- photo_contributions（非会員写真提供）
-- 主要カラム:
--   provider_name, provider_sns_url  — 提供者情報
--   photo_url, storage_path           — 写真の場所
--   facility_slug                     — どの施設か
--   usage_scope                       — 利用範囲（同意レベル）
--   consent_confirmed                 — 同意取得フラグ
--   credit_name, credit_url           — クレジット表記
--   has_child_face, face_handling     — 子どもの顔管理
--   status                            — 審査状態（pending/approved/rejected/removed）
--   removal_requested                 — 削除依頼フラグ
```

### MVP での扱い

**MVP 後フェーズで実装**（施設ページの写真充実が必要になったタイミングで）。  
MVP 段階では会員ユーザーの `visit_photos` と既存の Google Places / Wikipedia 写真のみ使用。

---

## 9. 将来の拡張設計（その他）

### ホテルログ（Phase 5〜）

```sql
CREATE TABLE public.hotel_stays (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hotel_name      TEXT NOT NULL,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  room_spacious   SMALLINT,
  cosleeping_ease SMALLINT,
  breakfast       SMALLINT,
  onsen           SMALLINT,
  kids_space      BOOLEAN,
  pool            BOOLEAN,
  parking         TEXT,
  stroller        TEXT,
  parent_fatigue  TEXT CHECK (parent_fatigue IN ('easy', 'normal', 'tired', 'exhausted')),
  family_revisit  TEXT CHECK (family_revisit IN ('yes', 'conditional', 'once_enough', 'no')),
  memo            TEXT,
  total_cost      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 多言語・世界展開（Phase 9〜）

施設 DB を Supabase に移行するタイミングで追加:

```sql
CREATE TABLE public.facilities_global (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name_local      TEXT NOT NULL,   -- 現地語の正式名称
  name_ja         TEXT,
  name_en         TEXT,
  country_code    TEXT NOT NULL DEFAULT 'JP',   -- ISO 3166-1 alpha-2
  prefecture_code TEXT,
  city_code       TEXT,
  admission_fee   INTEGER,
  currency_code   TEXT NOT NULL DEFAULT 'JPY',  -- ISO 4217
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- visits に将来追加するカラム
ALTER TABLE public.visits
  ADD COLUMN review_language TEXT DEFAULT 'ja',
  ADD COLUMN facility_country_code TEXT DEFAULT 'JP';
```

### pgvector（AI おすすめ Phase 7〜）

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 施設の特徴ベクトル
ALTER TABLE public.facilities_global
  ADD COLUMN embedding vector(1536);

-- ユーザーの好みベクトル
ALTER TABLE public.profiles
  ADD COLUMN preference_embedding vector(1536);
```

---

## 10. 既存 facilities JSON との関係

施設データ（`data/facilities_data.json`）は DB に移さなくてよい（MVP 段階）。

- `visits.facility_slug` と `wishlists.facility_slug` で JSON の施設と紐付ける
- **施設が削除・スラグ変更された場合**: `facility_name` を記録時に保存するため記録は残る

将来的に海外展開・施設数大幅増加のタイミングで `facilities_global` テーブルに移行。

---

*最終更新: 2026-06-09 v3*
