# Cloudflare hosting migration — Phase 1〜2 spec（コード準備〜temporary deployment）

> 作成: 2026-08-28 | 更新: 2026-08-29（Owner追加指示でスコープ拡張・gate位置変更）
> 目的: 現行 Vercel ホスティングを Cloudflare（Workers, via `@opennextjs/cloudflare`）へ移行する。
> **本番DNS/nameserver変更・実ドメインの切替は一切含まない。** 既存 Vercel 本番は無停止で稼働継続。

---

## 0. 全体像（Owner承認済み・2026-08-29更新）

| Phase | 内容 | 本番影響 | Owner gateか |
|---|---|---|---|
| **1（発注済み）** | OpenNext Cloudflare adapter導入・ローカルビルド/`wrangler dev`検証 | なし | いいえ |
| **2（今回スコープ拡張・continuous）** | Cloudflare temporary/preview deployment（`*.workers.dev`等、DNS非依存のURL）まで進め、本番切替に必要な準備（env var一覧・DNSレコード案・ロールバック手順）を整える | なし（DNSに触れない） | **いいえ** |
| 3 | trip-guide.net の実DNS/nameserver切替（Cloudflareへの実カットオーバー） | あり | **はい（次のOwner停止点）** |
| 4 | memorips.com 本番化 + trip-guide.net→memorips.com 301リダイレクト | あり | **はい** |

**Owner指示（2026-08-29・原文要旨）**:
- Owner判断不要、既承認scopeのまま継続してよい。
- Cloudflareアカウント作成はOwner側で進める（PM/Codexは待たずに他の作業を進めてよい）。
- `sharp`互換性は、既存の商品挙動を維持する範囲では通常の技術課題として解決し、Ownerへ戻さない。機能縮退・新規有料依存・DB変更などmaterialな意味変更が必要になった場合のみ停止して報告する。
- **Phase 1完了を新しいOwner gateにしない。** 変更riskに対する最初の正式GREEN/blocking 0でreviewを閉じたら、そのままPhase 2（Cloudflare temporary deploymentおよびmigration準備）まで連続して進める。
- 次にOwner判断・操作が必要になる停止点は、**DNS/nameserver変更等の具体的な本番切替操作**、または**新しいmaterialな費用・商品変更**が発生した時のみ。

**Phase 1・2は「新規有料依存・商品仕様変更・URL構造変更」のいずれにも該当しない前提で進める**（コード変更・ローカル検証・DNS非依存のtemporary deployのみ。料金はCloudflare Workers Free tierを前提。有料化が必要と判明した場合はそこで止めて報告する）。

---

## 1. 背景（コードから裏取り済みの事実）

- 本番: `trip-guide.net`（Vercel）。origin/main 基準（`git show origin/main:...`で確認、ローカル作業コピーはこの検証には使っていない）。
- `lib/config.ts` の `SERVICE.baseUrl` は既に `NEXT_PUBLIC_SITE_URL` 環境変数駆動で `"https://trip-guide.net"` がデフォルト。コメントに「本番移行時: `NEXT_PUBLIC_SITE_URL` を `https://memorips.com` に変更」と明記済み（2026-06-10 のブランド統合方針の実装済み部分）。→ **ドメイン切替時のハードコード改修は既に最小化されている**。
- `next.config.ts` に `www.trip-guide.net → trip-guide.net` の301リダイレクトが既存。Phase 4で `trip-guide.net → memorips.com` の同種リダイレクトを追加する想定（Phase 1・2では触らない）。
- **既知の非互換リスク**: `app/api/children/[id]/avatar/route.ts` が `sharp`（ネイティブバイナリ・libvips依存）を使用。Cloudflare Workers runtime は Node.js ネイティブアドオンを実行できないため、このルートは現状のままでは Cloudflare 上で動作しない可能性が高い。
- `memorips.com` は取得済み、DNS管理はXserver（`ns1〜5.xserver.jp`）。trip-guide.net も同じXserver DNS。
- ローカル作業コピー（`codex/summer-map-coordinates-l2-20260721`ブランチ、origin から乖離・大量の未コミット差分あり）には `@opennextjs/cloudflare`/`wrangler` が package.json に追加されているが **未コミット・wrangler設定ファイルも存在せず、これは今回のスコープの根拠にしない**（origin/main を基準にすること）。このローカル差分には触れない・上書きしない。

---

## 2. Phase 1 作業内容（発注済み・変更なし）

### 必須

1. `origin/main` から新規ブランチ/worktreeを作成して作業する（ローカルの乱れた作業コピーは使わない・触らない）。
2. `@opennextjs/cloudflare`（最新安定版）と `wrangler`（最新安定版）を導入。
3. `wrangler.jsonc`（または `.toml`）と `open-next.config.ts` を作成し、`@opennextjs/cloudflare` の標準セットアップに従う。
4. ローカルで `next build` / OpenNext Cloudflareビルド / `wrangler dev` を検証（トップ・施設一覧・施設詳細・イベント一覧・`/mypage`配下の認証リダイレクト）。
5. **`sharp` 非互換リスクの調査と対応**。既存の商品挙動（アバター機能の見た目・動作）を維持できる技術的解決であれば、Codexの判断で実装してよい（Ownerへ戻さない）。想定される選択肢の例（あくまで例）:
   - avatar生成ロジックをWorkers runtime互換のライブラリ/APIに置き換える
   - 当該ルートのみ別ランタイムに切り出す
   - 他の妥当な方式
   - **停止して報告が必要なケース**: 機能縮退（画質・トリミング精度等の劣化を含む）、新規有料サービス依存（外部画像処理APIの有料利用等）、DBスキーマ変更が必要と判明した場合。
6. `sharp` 以外にも Cloudflare Workers runtime非互換のNode API使用箇所がないか確認し、あれば同じ基準（挙動維持なら自己解決、materialな変更が要るなら報告）で対応。

### Phase 1 スコープ外（やらない）

- Cloudflareへの実デプロイ・DNS変更・Vercel設定変更・環境変数の実切替・`next.config.ts`へのリダイレクト追加（Phase 4）。

---

## 3. Phase 2 作業内容（今回スコープ拡張・Owner gateなしで連続実施）

Phase 1のPM reviewでGREEN・blocking 0が確認でき次第、Owner確認を待たずに以下へ進む。

1. Cloudflareへの **temporary/preview deployment**（`*.workers.dev` など、trip-guide.net/memorips.comのDNSに一切触れないURL）まで実施し、実機で主要フローが動作することを確認する。
   - Cloudflareアカウント自体はOwnerが作成する。認証情報の受け渡し方法（Owner側でのCLIログイン／APIトークン発行等）はCodexの技術判断で決めてよいが、**Owner以外がCloudflareの秘密情報を保持しない**という既存運用パターン（Supabase Dashboard手動適用と同型）を踏襲すること。認証情報がまだ揃わず temporary deployment に進めない場合は、それ自体はOwner判断が要る「gate」ではなく単純な前提未整備として報告し、揃い次第再開する。
2. 本番切替（Phase 3・4）に向けた準備一式を整える:
   - 必要な環境変数の一覧（Vercelで設定されている値との対応表）
   - DNS/nameserver切替で必要になるレコード案（Cloudflare側の指示値を転記する形。値の推測・AI補完はしない）
   - ロールバック手順（Cloudflareで問題が起きた場合、DNSをVercelへ戻す／Vercelデプロイを並行して残しておく方針を含む）
   - production-equivalent GREENの判定基準チェックリスト
3. 上記が整った時点で、Codexは報告書をまとめ、PMが独立検証（diff review・レビュー）を行う。**ここでもOwnerへは戻らない**（次のOwner停止点はPhase 3のDNS切替そのもの）。

---

## 4. 受け入れ条件（Phase 1・2共通）

- [ ] `npm run build` が origin/main ベースの新規ブランチで成功する（既存ゲートから退行しない）
- [ ] OpenNext Cloudflareビルドが成功する
- [ ] `wrangler dev` ローカル起動で主要ページが現行Vercel本番と同等に動作する
- [ ] `sharp`非互換リスクの対応内容（採用した方式・挙動維持の根拠）が報告書に明記されている
- [ ] 他のNode API非互換箇所の有無が報告書に明記されている
- [ ] 既存 `trip-guide.net` 本番（Vercel）に一切変更なし
- [ ] ローカルの乱れた作業コピー（`codex/summer-map-coordinates-l2-20260721`）には触れていない
- [ ] Cloudflare temporary/preview deploymentがDNS変更なしで到達可能なURLで動作確認できている
- [ ] Phase 3（DNS切替）に必要な準備一式（env var一覧・DNSレコード案・ロールバック手順）が文書化されている

---

## 5. 役割分担

- **Owner**: Cloudflareアカウント作成。Phase 3・4（DNS/nameserver切替、material費用・商品変更）でのみ判断・操作が必要。
- **PM(このセッション)**: spec作成・Codex報告のレビュー・Phase 3以降のspec作成。
- **Codex**: Phase 1・2の実装・ローカル/preview検証・報告書作成。PRは作成するがmainへのマージはPM/Owner確認後。
