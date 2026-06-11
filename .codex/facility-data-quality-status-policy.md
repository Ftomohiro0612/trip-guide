# data_quality_status 運用ポリシー

> 作成: 2026-06-11 / Claude Code PM
> 前提: facility-provenance-schema.md のスキーマ

---

## 5ステータスの定義

| status | 定義 | 付与条件 |
|---|---|---|
| `confirmed` | 一次情報で確認済み | **source_urls（公式/自治体が先頭）+ source_checked_at が両方あること**。新規追加・修正時に公式確認できた施設のみ |
| `likely_ok` | 大きな矛盾はないが根拠が弱い | 既存データのデフォルト。監査で high/medium 検出なし・url あり・座標 bbox 内 |
| `needs_web_check` | Web で確認が必要 | 監査 high/medium 検出（invalid_address・coord mismatch 等）、または修正時に公式確認が取れなかった |
| `needs_human_review` | 判断が必要 | タグ妥当性・カテゴリ・親子施設分割・県外の扱いなど、Web を見ても自動確定できない |
| `exclude_candidate` | 削除候補 | 県外・閉店確定・参考メモ行・重複。**削除は必ず PM 判断**（status を付けるだけ） |

## 絶対ルール

1. **根拠URL・確認日がないレコードに confirmed を付けない**（既存1,030件への一括 confirmed 禁止）
2. confirmed への昇格は「新規追加 or 修正タスクで公式確認した時」のみ。自動昇格なし
3. status の降格（confirmed → needs_web_check）は監査が事実矛盾を検出したら自動でよい
4. exclude_candidate → 実削除は PM GO が必要（id929/id734 方式: 欠番運用・監査再実行・sitemap 確認）

## 既存1,030件の初期付与（機械分類・一括タスクとして別途実行）

```
1. exclude_candidate: name_memo_pollution 該当（→/参考/除外/(削除）・県外 prefecture
2. needs_web_check:   監査v2.1 の high（invalid_address 204件・coord_pref_mismatch 3件）
3. needs_human_review: tag_category_conflict 31件・missing_experience 261件のうち体験不明系
4. likely_ok:         上記以外すべて
※ 重複該当時は上から優先（exclude > web_check > human_review > likely_ok）
※ confirmed は初期付与では1件も発生しない
```

## 優先順位（needs_web_check 等の消化順）

| 優先 | 対象 | 理由 |
|---|---|---|
| 1 | coord_pref_mismatch 3件（id896/898/901） | 件数が少なく、地図表示の実害に直結 |
| 2 | exclude_candidate（id734 等） | データ汚染。PM判断1回で消化できる |
| 3 | invalid_address 204件のうち**人気施設・画像あり施設** | 表示頻度が高い順に番地補完 |
| 4 | missing_experience 261件 | 表示品質の問題で事実誤りではない。説明文改善タスクとして計画的に |

## サイト表示との関係

- status はユーザーに表示しない（内部管理用）
- 将来、`needs_web_check` の施設に「情報は変更されている場合があります」等の注意表示を強化する判断はあり得る（PM判断）
