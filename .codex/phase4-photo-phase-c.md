# 写真登録 Phase C — 詳細ページ表示 + 削除 + visit削除時クリーンアップ

> 作成: 2026-06-11 / Claude Code PM
> 前提: Phase A（Migration 006・RLS全PASS）/ Phase B（アップロードUI、`PHOTO_UPLOAD_ENABLED=false` で本番非表示）
> デプロイ要否: コミットまで。**flag は false のまま維持**（公開判断は PM/オーナー）

---

## スコープ

1. 訪問記録詳細ページ `/mypage/visits/[id]` に写真グリッド表示
2. 写真の削除UI（詳細ページ）
3. visit 削除時の Storage ファイル明示削除
4. すべて `PHOTO_UPLOAD_ENABLED` フラグ配下（false なら一切レンダリングしない）

---

## 1. 詳細ページの写真表示

- visit_photos を visit_id で取得（セッション付き anon クライアント。RLS が本人分のみ返す）
- サムネイル（thumb_path）のグリッド表示（2〜3列、aspect-square、rounded-lg）
- **signed URL** で表示: `createSignedUrl(path, 3600)`（1時間）。`getPublicUrl` 禁止
- 大量リクエスト回避のため `createSignedUrls`（複数一括）があれば使用
- タップで本体（storage_path の signed URL）をモーダル or 新タブ表示（モーダルの場合は Esc/背景クリックで閉じる）
- 0枚なら写真セクション自体を出さない
- alt は「おでかけの写真」等の汎用文言（子ども名を含めない）

## 2. 削除UI

- 各サムネイルに削除ボタン（confirm ダイアログ「この写真を削除しますか？」）
- 削除処理: ①visit_photos 行 DELETE → ②Storage から storage_path / thumb_path を remove
- ①成功・②失敗の場合もUI上は削除成功扱い（孤児ファイルは将来のクリーンアップ対象。コンソールにのみ警告）
- 削除後は残り枚数を編集フォームの「あと◯枚」に整合させる

## 3. visit 削除時の Storage クリーンアップ

- 既存の visit 削除フローを確認し、削除前に該当 visit の visit_photos の storage_path / thumb_path を取得 → visit 削除（DB行は CASCADE）→ Storage remove を実行
- Storage remove 失敗でも visit 削除自体は成立させる（孤児は将来クリーンアップ）

---

## セキュリティ確認（必須）

- [ ] getPublicUrl / service role 不使用（grep）
- [ ] signed URL の有効期限が 3600 秒以下
- [ ] 他人の visit の写真パスで createSignedUrl しても Storage RLS で拒否されること（A/Bテスト）
- [ ] flag=false のとき詳細ページに写真関連 DOM が一切出ないこと

## 検証

- flag を**ローカルでのみ一時的に true** にして動作確認（コミットは false のまま）:
  - アップロード→詳細ページ表示→拡大→削除→枚数整合
  - visit 削除→Storage ファイルも消える
  - テストデータは確認後削除
- npm run lint / npx tsc --noEmit / npm run build
- スマホ375pxでグリッド・モーダルが崩れない

## 完了条件

- [ ] 上記スコープ4点 + セキュリティ確認全PASS
- [ ] コミット時 `PHOTO_UPLOAD_ENABLED=false` のまま
- [ ] コミットメッセージ: "feat: 写真Phase C — 詳細ページ表示・削除・visit削除時クリーンアップ"
- [ ] agmsg で GO + commit hash + 検証結果（flag=true での動作確認内容を含む）+ デプロイ: 未実施 を報告
