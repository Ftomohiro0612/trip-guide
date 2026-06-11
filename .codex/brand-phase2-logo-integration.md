# Brand Phase 2: 正式ロゴ PNG アセット統合

> 作成: 2026-06-10 / 更新: 2026-06-11（PNGベースに変更）/ Claude Code PM
> 実行タイミング: 正式アセット配置済み — 実行可能

---

## 前提

ロゴのビジュアルデザインはオーナーが外部で制作。Codex はアセット配置後の実装のみ担当する。

### ブランド情報

| 項目 | 値 |
|---|---|
| 日本語名 | メモリップ |
| 英語名 | Memorips |
| ブランドカラー | 水色・ミント系（Tailwind: `sky-400`, `cyan-400`, `emerald-400`） |
| 対象ユーザー | 子育て中の親 |

---

## アセット（配置済み 2026-06-11、GPT画像生成によるPNG・透過背景）

```
public/logo/icon.png             ← シンボルマーク単体
public/logo/logo-ja.png          ← アイコン + 「メモリップ」（タグラインなし）
public/logo/logo-ja-tagline.png  ← 同上 + 「おでかけの記録が、未来の地図になる。」
public/logo/logo-en.png          ← アイコン + 「Memorips」（タグラインなし）
public/logo/logo-en-tagline.png  ← 同上 + "Record today, shape tomorrow."
```

**注意**: SVG ソースは存在しない（ラスターPNGのみ）。
`public/logo/icon.svg` / `logo-ja.svg` は旧仮プレースホルダーで実デザインと不一致のため**削除すること**。

---

## Step 0: 仮 SVG の削除と参照確認

`icon.svg` / `logo-ja.svg` への参照をコード全体で grep し、あれば PNG へ差し替えたうえで:

```
git rm public/logo/icon.svg public/logo/logo-ja.svg
```

## Step 1: 最適化済みアセットを PNG から生成

元 PNG は約 900KB と重いので、`sharp` で利用サイズに最適化（`npm install sharp` が必要なら実行）:

```bash
node -e "
const sharp = require('sharp');
// PWA / favicon 用（正方形・透過維持）
sharp('public/logo/icon.png').trim().resize(192,192,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/icons/icon-192.png');
sharp('public/logo/icon.png').trim().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/icons/icon-512.png');
sharp('public/logo/icon.png').trim().resize(48,48,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('public/favicon.png');
// Header 用（高さ64px・2x表示想定）
sharp('public/logo/logo-ja.png').trim().resize({height:64}).png().toFile('public/logo/logo-ja-header.png');
"
```

---

## Step 2: Header コンポーネントのテキストロゴ → SVG ロゴに差し替え

対象ファイル: `components/Header.tsx`（または同等のヘッダーコンポーネント）

現在の実装例（テキストロゴ）:
```tsx
<span className="font-bold text-xl text-slate-900">メモリップ</span>
```

変更後:
```tsx
import Image from "next/image";

<Image
  src="/logo/logo-ja-header.png"
  alt="メモリップ"
  width={120}
  height={32}
  priority
/>
```

- 白背景ヘッダー上で見やすいこと（SVG は白背景対応）
- `width` / `height` はアスペクト比に合わせて調整すること

---

## Step 3: Footer コンポーネントのロゴ差し替え

対象ファイル: `components/Footer.tsx`（または同等のフッターコンポーネント）

同様に `logo-ja-header.png`（または `logo-ja.png` を縮小したもの）を使用。背景が暗い場合は視認性をオーナーと要確認。

---

## Step 4: `app/manifest.ts` の更新

```ts
// 変更箇所
icons: [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  // SVG なし — PNG のみ
],
```

`name` と `short_name` が以下になっているか確認:
```ts
name: "メモリップ by Trip Guide",
short_name: "メモリップ",
```

---

## Step 5: favicon の更新

`app/layout.tsx` または `app/favicon.ico` を確認し、以下を更新:

```tsx
// app/layout.tsx の metadata
icons: {
  icon: "/favicon.png",
  apple: "/icons/icon-192.png",
},
```

既存の `public/favicon.ico` があれば、`sharp` で `favicon.png` を生成した後に差し替えるか、
`favicon.ico` は維持して `favicon.png` を追加する。

---

## Step 6: OGP 画像の更新

OGP 画像は `app/opengraph-image.tsx`（または `opengraph-image.png` ファイル）で管理されている場合:

- ロゴ SVG を OGP 画像の左上または中央に配置
- 現在の OGP が静的画像なら、`public/logo/logo-ja-tagline.png` を使った新しい静的 OGP 画像を用意する

**現在の OGP 実装を確認してから作業すること**（ファイル名や方式が複数ある可能性あり）。

---

## Step 7: ビルド確認・コミット・デプロイ

```bash
npm run build
git add public/logo/ public/icons/ public/favicon.png app/ components/
git commit -m "feat: Brand Phase 2 — 正式ロゴSVG統合（Header/Footer/favicon/PWA/OGP）"
npx vercel --prod --yes --token <TOKEN>
```

---

## 完了条件

- [ ] `public/logo/*.png` 5点が配置され、仮SVG 2点が削除されている
- [ ] `public/icons/icon-192.png` / `icon-512.png` が生成されている
- [ ] Header にロゴ画像が表示される（テキストロゴが消えている）
- [ ] Footer にロゴ画像が表示される
- [ ] `manifest.ts` が更新されている
- [ ] ブラウザのタブに新しい favicon が表示される
- [ ] PWA として追加したとき新しいアイコンが表示される
- [ ] OGP 画像にロゴが含まれている
- [ ] `npm run build` が通る
- [ ] agmsg で memorips-claude に GO 報告

---

## 実行のトリガー

このファイルを Codex に渡すのは **正式 SVG アセットが `public/logo/` に配置されてから**。
それまでは実行しないこと。

ロゴ方向性メモ（オーナー確認済み 2026-06-10）:
- アイコン + テキスト構成
- 地図ピン・足あと・きらめき・記録の軌跡・子どもの発見を連想
- ウォーキングアプリっぽくならない
- 親が使いやすい上品さ
- 水色・ミント系カラー
- 白背景ヘッダーで視認性高く
- 小サイズ（favicon/PWA icon）でも潰れない
