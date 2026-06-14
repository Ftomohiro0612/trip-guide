# 地図機能 実装仕様 — 現在地表示＋表示状態の保持

> 作成: 2026-06-13 / Claude Code PM（オーナー要望ヒアリング済み・確定スコープ）
> 種別: **実装タスク**（フロントエンドのみ。データ・facilities_data.json は触らない）
> スコープ: 共通地図部品 `components/MapView.tsx` に2機能を追加し、**トップページと専用地図ページ(/map)の2カ所だけ**で有効化する。
> 反映/デプロイ: **生成・検証まで。デプロイはPMレビュー後にオーナーGOで別指示**。

## 背景（現状の事実）

- 地図は `components/MapView.tsx`（react-leaflet）。`MapViewClient.tsx` が dynamic import (ssr:false) で包む。
- `MapViewClient` の利用は6カ所: トップ `app/page.tsx:1026` / 専用 `app/map/page.tsx:23` / 一覧フィルタ `app/facilities/page.tsx:177` / カテゴリ `app/category/[id]/page.tsx:105` / 県 `app/prefecture/[id]/page.tsx:126` / タグ `app/tag/[slug]/page.tsx:101`。
- 現状: `MapContainer` は `center={[35.8,138.5]} zoom={8}` の固定値。`FitBoundsOnChange`（MapView.tsx:208）が `visible`（表示中施設）が変わるたびに `flyToBounds` で全施設にズームし直す。
- **ズームがリセットされる原因**: 施設詳細へ遷移→戻る、で MapView が再マウントされ、state（県・雨・無料フィルタ）が初期化＋`FitBoundsOnChange` が再度全施設へ fit するため、ユーザーが拡大していた表示が毎回消える。
- 現状、現在地（geolocation）も表示状態の永続化も**未実装**。

## 確定スコープ（オーナー裁定済み）

- **対象ページ**: トップ（`app/page.tsx`）と 専用地図ページ（`app/map/page.tsx`）の**2カ所のみ**。
- **保存対象**: ズーム・表示位置（center+zoom）＋ フィルタ選択状態（県トグル・雨でも遊べる・無料のみ）。施設ページから戻ったとき**完全に元通り**にする。
- 残り4カ所（一覧フィルタ／カテゴリ／県／タグ）は**現状維持**（新機能を出さない）。これらは検索/絞り込み文脈で毎回 fitBounds が自然なため。

## 実装方針

### 0. 有効化フラグ（プロップ追加）

- `MapView`／`MapViewClient` に **オプションの `storageKey?: string`** を追加。
- このプロップが**渡されたときだけ**「現在地ボタン」と「表示状態の永続化」を有効化する。
- 呼び出し側の変更は2カ所だけ:
  - `app/page.tsx:1026` → `<MapViewClient facilities={visibleFacilities} height={520} storageKey="home" />`
  - `app/map/page.tsx:23` → `<MapViewClient facilities={visibleFacilities} height={680} storageKey="map" />`
- 他4カ所は**無変更**（storageKey 無し＝従来動作）。

### 1. 現在地表示（geolocation）

- フィルタチップ群の並びに **「📍 現在地」ボタン**を追加（`storageKey` 有効時のみ表示）。
- クリックで `navigator.geolocation.getCurrentPosition(success, error, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })`。
  - 成功: 取得座標へ `map.setView([lat,lng], 13)` で寄せる。さらに**現在地マーカー**を表示（施設マーカーと明確に区別。例: 青系の二重丸＝外側に半透明の大きい円 + 内側に塗りつぶし小円、Popup/ツールチップに「現在地」）。
  - 失敗/拒否: 地図上に小さく非ブロッキングな注記（例: 「位置情報を取得できませんでした（ブラウザの許可が必要です）」）を数秒表示。**クラッシュさせない・例外で地図を壊さない**。
  - geolocation は https / localhost のみ動作（本番は https なのでOK）。SSR で `navigator` を参照しない（クライアントのみ）。
- **自動プロンプトはしない**（ページ読込時に勝手に許可を求めない）。ボタン押下で初めて要求する（Googleマップ式・プライバシー配慮）。※この判断はオーナーに一言報告すること。許可が前回付与済みでも自動センタリングはしない（保存された表示位置を優先）。
- 現在地マーカーはフィルタ・永続化の対象外（施設ではないため保存しない。地図再マウントで消えてよい）。

### 2. 表示状態の永続化（ズーム・位置＋フィルタ）

- **保存先**: `sessionStorage`（同一タブ内のセッションで保持＝施設ページ往復で復元、別タブ/新セッションではリセット。この用途に最適）。キーは `mapview:<storageKey>`（例 `mapview:home` / `mapview:map`）。ページごとに独立保存。
- **保存する値**: `{ center: [lat,lng], zoom, activePrefs, showRain, showFree }`。
- **保存タイミング**:
  - 地図の `moveend` / `zoomend`（react-leaflet の `useMapEvents`）で center+zoom を保存。
  - フィルタ（県トグル・雨・無料）変更時に該当値を保存。
- **復元（マウント時）**:
  - `sessionStorage` に保存があれば、`MapContainer` の初期 `center`/`zoom` をその値にする（`useState` のイニシャライザで読む。`MapView` は ssr:false なので `window`/`sessionStorage` 参照可）。フィルタ state も保存値で初期化。
  - **保存があるときは `FitBoundsOnChange` の自動 fit を抑止**（復元した表示を上書きしないこと）。これがリセット解消の肝。
- **自動 fitBounds の扱い**（重要・回帰注意）:
  - `FitBoundsOnChange` は「保存が無い初回表示のときだけ」全施設に fit する。
  - 保存がある（＝2回目以降や往復後）場合は fit しない。
  - フィルタをユーザーが操作したときは、表示位置を勝手に飛ばさない（現在のズーム維持）。保存値だけ更新。※ユーザーの不満は「戻るとリセット」なので、往復時の表示維持を最優先。フィルタ操作での強制リフィットはしない。
- SSR安全・JSON parse 失敗時は握りつぶして初期値にフォールバック（壊れた sessionStorage 値で地図が落ちないこと）。

### 3. 触らないもの

- `data/facilities_data.json`・データ系一切。マーカーのオフセット処理（rendered の同座標分散）・Popup の中身・県カラー定義は現状維持。
- 残り4カ所の地図利用（storageKey 無し）の挙動。

## 検証（反映＋ここまで・デプロイしない）

- `npm run lint` / `npx tsc --noEmit` / `npm run build` すべて PASS。
- ブラウザ検証（CDP もしくは Playwright、PC=1280 / SP=375 の両方）:
  1. **/map と トップ** で地図を拡大・移動 → マーカークリックで施設詳細へ → **ブラウザバック** → **拡大位置・ズーム・フィルタが復元される**ことを確認（リセットされないこと）。
  2. **現在地ボタン**: geolocation を許可（テストではモック座標を注入）→ 地図がその座標へ寄り、現在地マーカーが出ることを確認。拒否時に注記が出て地図が壊れないこと。
  3. フィルタ（県/雨/無料）を変えた状態で往復 → フィルタ選択も復元されること。
  4. 残り4カ所（一覧フィルタ等）が**従来どおり**（新ボタン無し・往復で従来挙動）であることを1カ所スポット確認。
  5. Next エラーオーバーレイ 0・console error 0・表示崩れなし。スクショ保存（`.codex/screenshots/` 配下、対象/PC・SP）。

## 完了報告（agmsg）に必ず含める

1. 変更ファイル一覧（MapView.tsx / MapViewClient.tsx / app/page.tsx / app/map/page.tsx ＋他あれば）
2. storageKey の配線確認（home/map の2カ所のみ・他4カ所無変更）
3. 永続化の実装方式（sessionStorage キー・保存タイミング・復元時の fit 抑止ロジック）
4. geolocation の挙動（自動プロンプトしない仕様・失敗時の扱い）
5. lint / tsc / build 結果
6. スクショ（往復で復元される様子・現在地ボタン・PC/SP）と検証結果
7. デプロイは未実行である旨

## PMレビュー重点確認（オーナー指定・実装後にPMが必ず確認）

- [ ] storageKey が **トップと /map の2カ所だけ**で有効になっていること
- [ ] **他4カ所**（一覧フィルタ／カテゴリ／県／タグ）の地図に**現在地ボタンも永続化も出ていない**こと
- [ ] **保存が無い初回**は従来どおり `fitBounds` されること
- [ ] **保存がある場合**は `fitBounds` が復元位置を**上書きしない**こと
- [ ] 施設詳細へ行って**ブラウザバック**したとき、**中心・ズーム・フィルタが復元**されること
- [ ] **フィルタ変更時**に勝手に地図位置を飛ばさないこと
- [ ] 現在地は**ボタン押下時のみ**許可要求し、**自動プロンプトしない**こと
- [ ] **geolocation 拒否時**も地図が壊れないこと
- [ ] **PC/SP** で UI 崩れがないこと

## タスク投入タイミング（PM運用）

- **このタスクは Stage 2（山梨データ品質）の完了報告 → PMレビュー → デプロイ可否判断が終わってから** Codex へ送る。Stage 2 実行中は送らない（タスク積み増しによる既読スキップ事故を避ける）。

## 対象外（触らない）

- Stage 2（山梨データ品質）・他のデータ系タスク。
- データ系ファイル（`data/facilities_data.json` ほか）一切。
- commit / デプロイ（PMレビュー後にオーナーGOで別指示）。
