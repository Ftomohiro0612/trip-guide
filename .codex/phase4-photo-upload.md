# Phase 4: 写真登録機能（visit_photos）

> 作成: 2026-06-11 / Claude Code PM
> 前提: product-direction.md §17(写真登録) §35(写真から下書き・将来) を読むこと
> 実行タイミング: PM の GO 後

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

```sql
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

## 削除時の扱い

- 写真単体削除: DB 行 + Storage 本体 + サムネイルを削除（Storage 削除失敗してもDB行は消す。孤児ファイルは後述のクリーンアップで対応）
- visit 削除時: `ON DELETE CASCADE` で DB 行は消える。Storage ファイルは visit 削除処理の中で明示的に削除すること（既存の削除フローに追加）
- 退会時: 将来の退会フロー実装時に `{user_id}/` フォルダ一括削除を組み込む（今回はコメントで TODO 残す）

---

## 実装フェーズ

- **Phase A**: Migration 006 作成（visit_photos + RLS + trigger + Storage ポリシー SQL）→ オーナーが SQL Editor で手動実行
- **Phase B**: アップロード UI（記録フォーム + 編集フォーム）+ EXIF 除去パイプライン
- **Phase C**: 詳細ページ表示 + 削除
- A は SQL ファイル作成のみ。B/C は migration 実行確認後に着手

---

## 完了条件

- [ ] `supabase/migrations/006_visit_photos.sql` 作成（スキーマ + RLS + trigger + Storage ポリシー）
- [ ] アップロード前に EXIF が確実に除去される（canvas 再エンコード。アップロード後のファイルに EXIF がないことをバイナリ確認）
- [ ] 公開 URL を一切発行していない（getPublicUrl 不使用を grep で確認）
- [ ] 他ユーザーの写真パスに直接アクセスしても 403/404（RLS 確認、一時ユーザーA/B方式）
- [ ] 3枚目のアップロードが DB 層で拒否される
- [ ] 写真削除で DB 行 + Storage 2ファイルが消える
- [ ] visit 削除で写真も消える
- [ ] スマホ幅でアップロード UI・グリッドが崩れない
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` 全パス
- [ ] agmsg で memorips-claude に GO + commit hash + RLS/EXIF 確認結果を報告
- [ ] デプロイは PM 確認後

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
