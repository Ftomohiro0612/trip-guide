# Phase 4: 写真登録機能（visit_photos）

> 作成: 2026-06-11 / 更新: 2026-06-11（Phase A-C 実装済み状態を反映）/ Claude Code PM
> 前提: product-direction.md §17(写真登録) §35(写真から下書き・将来) を読むこと

> ⚠️ **2026-06-13 訂正**: 本ファイルの「PHOTO_UPLOAD_ENABLED=false / 本番公開❌未実施」は**古い**。実際は `f074a4d "Enable photo uploads in production"`(2026-06-12 13:40) で **flag=true 化・本番公開済み**（origin/main にコミット済み・規約/プライバシーも本番200）。現状の正は HANDOFF「写真機能の現状」を参照。

## 実装状況（2026-06-11 時点・本番公開状態は 2026-06-13 訂正済み＝下記表は当時の値）

| Phase | 状態 | commit |
|---|---|---|
| Phase A（Migration 006 / DB・Storage基盤） | ✅ 完了・Supabase 実行済み・**RLSテスト全8項目PASS** | ec0f45e |
| Phase B（アップロードUI / EXIF除去） | ✅ 実装済み・`PHOTO_UPLOAD_ENABLED=false` | cd2b285 |
| Phase C（詳細表示 / 削除 / visit削除時cleanup） | ✅ 実装済み・`PHOTO_UPLOAD_ENABLED=false` | e373403 |
| **本番公開** | ❌ **未実施**（下記「公開条件」参照） |  |

## 公開条件（flag を true にする条件）

`lib/config.ts` の `PHOTO_UPLOAD_ENABLED` を true にできるのは、以下が**すべて**満たされたときのみ:

1. Phase A / B / C の完了（✅ 済み）
2. **利用規約・プライバシーポリシーの本番掲載**（写真の取り扱い・第三者の子どもの同意条項を含む。.codex/terms-privacy-draft.md v0.2 →確定→掲載）
3. **PM / オーナーの公開 GO**

コードが完成しているだけでは本番公開しない。

---

## 原則（絶対に守ること）

1. 写真は**訪問記録(visit)に紐づく**。施設には紐づけない・施設ページに表示しない
2. **完全非公開**: バケットは private。公開 URL を発行しない
3. **EXIF は必ず除去してからアップロード**（クライアント側 canvas 再エンコードで実現）
4. 子どもの顔写真を公開面に出さない（公開面に写真を出す機能自体を作らない）
5. service role キーをクライアント・ページ実装で使わない
6. 削除可能・退会時全削除前提

---

## DB スキーマ（Migration 006）

> **正本は実行済みの `supabase/migrations/006_visit_photos.sql`**。下記 SQL は初期設計案であり、実装版では以下が追加強化されている:
> - storage_path / thumb_path の `{user_id}/{visit_id}/` 形式 CHECK 制約 + UNIQUE
> - トリガーでの所有者整合検証（NEW.user_id = visits.user_id）+ `FOR UPDATE` による同時INSERT直列化
> - `SET search_path = public, pg_temp` の固定
> - 上限値取得を `visit_photo_limit_for_user()` 関数に分離（将来の plan 分岐用）
> - bucket 作成 SQL（ON CONFLICT・public=false 強制）と Storage RLS（UPDATE 含む4ポリシー）
>
> 注記: `006` は実行済みのためファイル名変更禁止。**今後の migration は `ls supabase/migrations/` の最大番号 +1 で採番**（現在の次番号は 008。007_add_pool_reaction_tag.sql は未実行で存在）。

```sql
-- 初期設計案（参考。正本は 006_visit_photos.sql）
CREATE TABLE visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,        -- {user_id}/{visit_id}/{photo_id}.webp
  thumb_path   TEXT NOT NULL,        -- {user_id}/{visit_id}/{photo_id}_thumb.webp
  width INT,
  height INT,
  bytes INT,
  taken_on DATE,                     -- EXIF 撮影日（除去前にクライアントで読み取り、日付のみ保存）
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visit_photos_visit ON visit_photos(visit_id);
CREATE INDEX idx_visit_photos_user ON visit_photos(user_id);

ALTER TABLE visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own photos select" ON visit_photos FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own photos insert" ON visit_photos FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM visits v WHERE v.id = visit_id AND v.user_id = auth.uid())
);
CREATE POLICY "own photos delete" ON visit_photos FOR DELETE USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON visit_photos TO authenticated;

-- 枚数制限（無料2枚/visit）を DB 層でも強制
CREATE OR REPLACE FUNCTION check_visit_photo_limit()
RETURNS TRIGGER AS $$
DECLARE photo_count INT;
BEGIN
  SELECT COUNT(*) INTO photo_count FROM visit_photos WHERE visit_id = NEW.visit_id;
  IF photo_count >= 2 THEN  -- 将来 profiles.plan で分岐（Plus=10）
    RAISE EXCEPTION 'photo limit reached for this visit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_visit_photo_limit
  BEFORE INSERT ON visit_photos
  FOR EACH ROW EXECUTE FUNCTION check_visit_photo_limit();
```

注意: GPS（緯度経度）は**保存しない**。将来の「写真から下書き」で位置を使う場合も、ユーザー明示同意の上でその時に設計し直す。今は taken_on（日付のみ）が下書き作成の布石。

---

## Storage 設計

- バケット: `visit-photos`（**private**、public=false）
- パス: `{user_id}/{visit_id}/{photo_id}.webp` と `{photo_id}_thumb.webp`
- サイズ上限: バケット設定で 5MB/file
- Storage RLS ポリシー（パス先頭フォルダ = 自分の uid のみ）:

```sql
CREATE POLICY "own folder read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'visit-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own folder insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'visit-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own folder delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'visit-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- 表示は `createSignedUrl`（有効期限 1 時間程度）。`getPublicUrl` は使用禁止

---

## アップロードフロー（クライアント側）

1. `<input type="file" accept="image/*">` で選択（複数可、残り枚数まで）
2. **EXIF 読み取り**: 除去前に `exifr` 等で撮影日時のみ取得 → `taken_on` 候補に
3. **canvas 再エンコード**（これが EXIF 除去の実体）:
   - 長辺 1600px に縮小 → `canvas.toBlob('image/webp', 0.82)` → 本体
   - 長辺 400px → 同様 → サムネイル
   - canvas 経由の再描画でメタデータは全て消える（EXIF/GPS/機種情報）
4. supabase-js（anon・セッション付き）で 2 ファイルを Storage にアップロード
5. `visit_photos` に INSERT（trigger が枚数制限を強制）
6. 失敗時は Storage にアップ済みのファイルを削除してロールバック

HEIC 対応: iOS Safari は accept="image/*" でカメラロールから JPEG 変換されるのが基本だが、HEIC が来た場合は `heic2any` での変換を検討（初期はエラーメッセージで「JPEG/PNGでお願いします」でも可 — 実装コストを見て判断し報告）。

---

## UI

- **記録フォーム**（`/mypage/visits/new` と編集）: 任意項目アコーディオン内に「写真（あと◯枚）」追加
- **訪問記録詳細ページ**（`/mypage/visits/[id]`）: 写真グリッド表示（signed URL・サムネイル→タップで本体）+ 各写真に削除ボタン
- 削除は confirm ダイアログ → DB行削除 + Storage 2ファイル削除
- 枚数超過時: 「無料プランは1回のおでかけにつき2枚まで」表示（Plus 訴求の布石、リンクはまだ不要）

---

## 削除時の扱い（順序厳守）

- 写真単体削除: **DELETE 前に必ず storage_path / thumb_path を取得してローカル変数に保持** → DB 行 DELETE → 保持したパスで Storage remove。**DB 行削除後にパスを読みに行く実装は禁止**（行が消えるとパスが取得できない）。Storage 削除失敗してもDB行は消す（孤児ファイルは後述のクリーンアップで対応）
- visit 削除時: **visit 削除前に対象 visit の写真パス一覧を取得して保持** → visit 削除（DB 行は `ON DELETE CASCADE`）→ 保持したパスで Storage remove
- 退会時: 将来の退会フロー実装時に `{user_id}/` フォルダ一括削除を組み込む（今回はコメントで TODO 残す）

---

## 実装フェーズ

- **Phase A**: Migration 006 作成（visit_photos + RLS + trigger + Storage ポリシー SQL）→ オーナーが SQL Editor で手動実行
- **Phase B**: アップロード UI（記録フォーム + 編集フォーム）+ EXIF 除去パイプライン
- **Phase C**: 詳細ページ表示 + 削除
- A は SQL ファイル作成のみ。B/C は migration 実行確認後に着手

---

## 完了条件（Phase 別）

### Phase A（✅ 完了）
- [x] `supabase/migrations/006_visit_photos.sql` 作成（スキーマ + RLS + trigger + Storage ポリシー + path CHECK + 所有者整合）
- [x] RLS テスト全8項目 PASS（他人visit拒否・3枚目拒否・pathCHECK・Storageフォルダ分離・bucket private・cleanup）

### Phase B（✅ 完了）
- [x] アップロード前に EXIF が確実に除去される（canvas 再エンコード）
- [x] 本体1600px / サムネ400px の WebP 生成・Storage upload・DB insert
- [x] INSERT 失敗時の Storage ロールバック
- [x] HEIC は「JPEG/PNGでお願いします」で拒否
- [x] getPublicUrl / service role 不使用（grep 確認）
- [x] スマホ幅でアップロード UI が崩れない

### Phase C（✅ 完了）
- [x] 詳細ページの写真グリッド（signed URL 3600秒以下・createSignedUrls 一括）
- [x] 削除UI（パス保持→DB DELETE→Storage remove の順序厳守）
- [x] visit 削除時 Storage cleanup（削除前パス取得）
- [x] flag=false 時に写真関連 DOM が一切出ない
- [x] alt に子ども名を含めない・0枚ならセクション非表示
- [x] lint / tsc / build 全パス

### 公開（❌ 未実施）
- [ ] 規約・プライバシーポリシー本番掲載
- [ ] PM/オーナー公開 GO → `PHOTO_UPLOAD_ENABLED=true` → デプロイ

---

## 将来課題（Phase C または次 migration で PM 判断）

### ユーザー単位の総写真枚数上限（S1）

- 現状は 2枚/visit の制限のみ。visit を多数作成すると無料ユーザーでも実質無制限に写真をアップロードできる
- 将来、無料ユーザーの**総写真枚数上限を DB 層で強制**する（trigger でユーザー単位カウント）
- 目安: 無料は合計100枚程度、Plus は別上限
- 実装タイミングは Phase C または次 migration で PM 判断

### 孤児 Storage ファイルのクリーンアップ（S2）

- Storage policy は「先頭フォルダ = uid」で制御しているため、ユーザーが自分の uid 配下に DB 行のない孤児ファイルを作れる可能性がある
- 実害は主に本人の容量消費だが、ユーザー単位の容量/枚数管理を Storage 実使用量ベースで行う場合は考慮が必要
- 将来的に、DB に存在しない Storage ファイルを定期削除するクリーンアップジョブを検討する

---

## 絶対にやってはいけないこと

- バケットを public にする / getPublicUrl を使う
- EXIF 除去をスキップする（「後で対応」不可）
- 施設ページ・公開ページに写真を表示する
- GPS 座標を DB に保存する
- service role キーをクライアントコードに含める
- 長期有効の signed URL（24h超）を発行する
- 施設 ID への写真直接紐づけ（必ず visit 経由）
