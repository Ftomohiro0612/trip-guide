# Phase 5: 施設ページ「みんなの記録」匿名集計

> 作成: 2026-06-11 / Claude Code PM
> 前提: product-direction.md §35（匿名集計方針）
> 実行タイミング: PM の GO 後（ベータでデータが貯まり始めてから表示が成立する点に注意）

---

## 原則

1. 公開するのは**構造化フィールドの集計値のみ**。自由メモ・子ども名・写真・個人を特定しうる情報は一切出さない
2. **k-匿名性**: 全体表示は3件以上、内訳セル（年齢帯別など）は各セル5件以上なければそのセルを出さない
3. 集計は **SECURITY DEFINER の RPC** 経由でのみ公開。テーブル RLS は一切緩めない
4. 「あなたの記録」と「みんなの記録」はセクションを明確に分ける

---

## 段階表示ルール（記録件数 = その施設の visits 数）

| 件数 | 表示レベル |
|---|---|
| 0–2 | 非表示（セクション自体を出さない） |
| 3–4 | 「◯件の記録があります」のみ（件数表示） |
| 5–9 | 簡易: 反応タグ TOP3（タグ名のみ・回数非表示）+ また行きたい率は出さない |
| 10–29 | 割合: また行きたい率(%) + 反応タグ TOP3(回数つき) + 多い滞在時間 |
| 30+ | 詳細傾向: 上記 + 年齢帯別反応傾向 + 混雑傾向 + 親の疲れ度傾向 |

### 初期表示する集計（安全・ポジティブ寄り）

1. 反応タグ TOP3（「動物 / 水遊び / 遊具 が人気」）— 最も安全で価値が高い
2. また行きたい率 — ポジティブ指標
3. 多い滞在時間（「2〜3時間が最多」）— 実用情報

### 慎重に扱う集計（30件以上のみ・表現を和らげる）

- 親の疲れ度 → 「疲れた」と断定せず「ゆったり / 体力勝負」のような中立ラベルに変換
- 混雑傾向 → 「混雑の記録が多め」程度

### 初期は出さない（危険）

- **食事で困った率 / アクセスで困った率**: 件数が少ない段階では施設への否定的断定になり、施設との関係・名誉毀損リスクがある。100件超 + B2B レポート設計時に再検討
- 年齢帯別の「合わなかった」系のネガティブ内訳
- 期待外れ系の指標

---

## 年齢帯の丸め方

- 訪問時年齢を **0–2歳 / 3–5歳 / 6–9歳 / 10歳以上** の4帯に丸める
- 正確な年齢・生年月は出さない
- 各帯のセルは 5 件未満なら「—」（そのセルだけ非表示）

---

## DB / RPC 設計

新テーブルは作らない。既存 `visits` / `visit_children` / `visit_child_tags` / `reaction_tags` / `children` から RPC で集計する。

```sql
-- Migration 007
CREATE OR REPLACE FUNCTION get_facility_public_stats(p_facility_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INT;
  result JSONB;
BEGIN
  SELECT COUNT(*) INTO total FROM visits WHERE facility_slug = p_facility_slug;

  IF total < 3 THEN
    RETURN jsonb_build_object('level', 0);
  END IF;

  -- level の決定: 3-4=1, 5-9=2, 10-29=3, 30+=4
  -- それぞれのレベルに応じた集計のみを JSONB で返す。
  -- 重要: しきい値未満の項目はキー自体を含めない（クライアント側判定に頼らない）
  -- 反応タグTOP3 / revisit_rate / stay_duration_mode / age_band_tags(セル5+のみ) / crowd_mode / fatigue_mode
  -- 実装詳細は visits 等の実カラム名を確認して構築すること
  ...
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION get_facility_public_stats(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_facility_public_stats(TEXT) TO anon, authenticated;
```

設計上の要点:
- **しきい値の強制は SQL 内**で行う。フロントに生データ・未丸めデータを渡さない
- 返り値は集計済み JSONB のみ。visit id / user id / child id を含めない
- anon に EXECUTE を許可（未ログインの施設ページでも表示）
- パフォーマンス: 施設ページ側で `revalidate: 3600`（1時間キャッシュ）。記録数が増えたら materialized view + 日次 refresh に移行（仕様コメントに TODO）

---

## 施設ページでの見せ方

- 「あなたの記録」カード（既存 FacilityMyRecord）の**下**に「みんなの記録」セクション
- 見出し: 「みんなの記録 📊」+ 注記「◯件の記録から（個人は特定されません）」
- level 1: 「この施設には ◯ 件のおでかけ記録があります」
- level 2+: タグチップ・パーセント表示・滞在時間
- デザインは既存施設ページのカードトーンに合わせる

---

## ユーザー同意

- プライバシーポリシー / 利用規約に「記録の構造化データを匿名集計して施設ページ等に表示する」ことを明記（**法務文面はオーナー確認必須** — Codex は placeholder 文で実装し、文面確定はオーナー）
- `profiles.allow_anonymous_stats BOOLEAN DEFAULT true` カラムを Migration 007 に含め、RPC の集計対象を `allow_anonymous_stats = true` のユーザーに限定（オプトアウトの布石。設定 UI は次フェーズでよい）

---

## 将来の施設向けレポート（B2B）への拡張

- 同じ RPC 設計を流用し、B2B 用は「件数しきい値を引き上げた詳細版 RPC」を別途作る（食事・アクセス・疲労度の詳細はこちらに格納）
- B2B 提供前に: 利用規約の B2B 提供条項・施設との契約・再識別リスク評価が必須（オーナー判断）

---

## 完了条件

- [ ] Migration 007（RPC + allow_anonymous_stats）作成 → オーナー手動実行
- [ ] 施設ページに「みんなの記録」セクション（level 連動表示）
- [ ] 2件以下の施設でセクションが出ない / 5件未満のセルが出ないことをテストデータで確認
- [ ] RPC の返り値に id 類・自由テキストが含まれないことを確認
- [ ] anon（未ログイン）で施設ページの集計が見えること
- [ ] visits 等のテーブル RLS が変更されていないこと
- [ ] lint / tsc / build 全パス
- [ ] agmsg で GO + commit hash + テスト結果報告。デプロイは PM 確認後

## 絶対にやってはいけないこと

- テーブルへの anon SELECT 許可・RLS の緩和
- 自由メモ・子ども名・ユーザー名・写真・id 類を集計結果に含める
- しきい値判定をクライアント側だけで行う
- 食事・アクセスの「困った率」を初期表示に含める
- 正確な年齢・生年月の表示
