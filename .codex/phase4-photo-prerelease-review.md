# 写真機能 公開前最終レビュー 仕様書

> 作成: 2026-06-12 / Claude Code PM（オーナー指示の転記）
> 前提: Phase A/B/C 実装済み・規約v0.2本番掲載済み・現在 PHOTO_UPLOAD_ENABLED=false
> **本タスクではレビューと報告のみ。本番の flag=true 化は実施しない**
> 関連: .codex/phase4-photo-upload.md（公開条件の正本）

## 目的

写真機能を本番公開してよいか判断するための公開前最終レビュー。

## 1. 実装範囲の棚卸し

- Phase A: visit_photos / Storage / RLS / 枚数制限
- Phase B: アップロードUI / EXIF除去 / WebP変換 / Storage upload / DB insert / rollback
- Phase C: 詳細ページ表示 / signed URL / 削除UI / visit削除時Storage cleanup
- 各 Phase の commit hash と実装ファイルを整理する

## 2. セキュリティ確認

- [ ] getPublicUrl 不使用（PM静的確認済み・再確認）
- [ ] service role key がクライアント・ページ実装に不使用（PM静的確認済み・再確認）
- [ ] bucket が private であること（Supabase 設定 or migration で確認）
- [ ] signed URL が 3600秒以下（PM確認: 全箇所 60*60）
- [ ] 他人の visit/photo にアクセスできないこと（RLS）
- [ ] RLSテストの結果が残っていること（過去の記録を探し、なければ実施）
- [ ] flag=false で写真DOMが一切出ないこと
- [ ] flag=true でも公開ページ・施設ページに写真が出ないこと（マイページ配下のみ）

## 3. プライバシー確認

- [ ] EXIF/GPS が保存されない（クライアント側除去の実装確認 + 実ファイルで検証）
- [ ] taken_on は日付のみ（時刻・位置なし）
- [ ] alt や UI 文言に子ども名を含めない
- [ ] 写真は訪問記録のみに紐づき、施設に紐づかない（スキーマ確認）
- [ ] 写真は本人のみ閲覧可
- [ ] 削除可能

## 4. 機能確認（ローカルで一時的に flag=true）

- [ ] 訪問記録フォームで写真2枚までアップロード可
- [ ] 3枚目が拒否される
- [ ] アップロード後、詳細ページでサムネイル表示
- [ ] サムネイルから本体表示（モーダル）
- [ ] 写真削除 → 詳細ページから消える
- [ ] Storage 上の本体・サムネイルも削除される
- [ ] visit 削除時に Storage ファイルも削除される
- [ ] スマホ375pxでアップロードUI・ギャラリー・モーダルが崩れない
- 確認後 flag=false に戻し、テストデータは削除する

## 5. 残課題の分類

blocker（公開前に必須）/ should-fix（早期に直すべき）/ nice-to-have に分類。

## 6. 判定

GO / CONDITIONAL GO / NO-GO のいずれかで報告。

## 完了報告に含めるもの

レビュー対象commit / 確認ファイル / セキュリティ確認結果 / プライバシー確認結果 / flag=true動作確認結果 / blocker・should-fix・nice-to-have / 判定
