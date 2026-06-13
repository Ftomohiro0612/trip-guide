# 住所修正タスク仕様書（A群調査3件 + B群番地ズレ9件）

> 作成: 2026-06-13 / Claude Code PM（オーナー裁定 2026-06-13 GO済み）
> 元資料: .codex/nhr-group-a-fix-report.md（調査3件）/ url-research-review-package.md §B群
> コミット系列: A群コミット(4c7c93dd)の系列に積む。**things_to_do 第4バッチとは別コミット**
> 原則: 公式URL根拠必須・AI補完禁止・住所修正は再ジオコード必須

## パート1: 同名別施設混同の修正（3件・オーナー裁定済み）

| id | 修正内容 |
|---|---|
| 29 | 遊具広場(長浜海浜公園): 施設名・住所・座標・公式URLを熱海市側に修正。住所=静岡県熱海市上多賀(公式表記に従う)、url=https://www.city.atami.lg.jp/shisetsu/bunka/1002057/1002072.html。source_notes に「旧登録住所(下田市須崎)は誤り。同名別施設混同を修正」 |
| 123 | 富士見ふれあいの森公園: 住所=山梨県西八代郡市川三郷町岩間3965、url=https://www.town.ichikawamisato.yamanashi.jp/50sightsee/50guide/fujimihureainomori.html。座標再ジオコード。source_notes に「旧登録(富士川町)は同名施設混同。修正」 |
| 26 | 施設名を「石人の星公園(遠州灘海浜公園 中田島北地区)」へ変更。住所=静岡県浜松市中央区江之島町1706、座標再ジオコード、source_urls に https://www.enshunada.com/ を記録。source_notes に「旧登録は磐田市住所で誤り。同名/別施設混同を修正」 |

3件共通: source_urls / source_checked_at(=実施日) / data_quality_status(=confirmed) / source_notes 更新。

## パート2: B群番地ズレ修正（9件）

対象: id7 サープラ富士 / id50 うさみ農園 / id78 ぬくもく / id102 かまくら雪遊びパーク / id126 おしろらんど / id154 シャボテン狩り工房 / id191 広野海岸公園 / id199 押原公園 / id206 平成記念こどもの森公園

- 公式記載の住所に修正（公式側が正の前提だが、**1件ずつ公式URLを開いて住所を確認**し、根拠URLを報告に添付）
- 各件 再ジオコード + source_urls / source_checked_at / data_quality_status(=confirmed) / source_notes 更新
- 公式URL先で住所が確認できない件はスキップして理由を報告（無理に修正しない）

## 完了条件

1. 住所・県・座標が公式根拠と一致（報告に1件ずつURL列挙）
2. audit: coord/address/prefecture ミスマッチ 0 のまま PASS
3. push-to-sheet → sync 往復 diff ゼロ
4. npm run build PASS
5. 変更差分サマリ提出（変更施設数・フィールド別）
6. コミット（第4バッチと混ぜない）。デプロイは実施しない
