# ナガシマ2施設 FacilityOps intake（2026-08-28）

## 判定

- `ナガシマスパーランド` を独立Facilityとして追加する。
- `ジャンボ海水プール` を毎夏営業する seasonal permanent facility として独立登録する。一時イベントには分類しない。
- 既存の `名古屋アンパンマンこどもミュージアム＆パーク` は名称、所在地、公式導線、体験構成が異なるため、3施設のidentityを統合しない。

## 公式一次情報

### ナガシマスパーランド

- 施設identity・現行料金・営業日: https://www.nagashima-onsen.co.jp/spaland/fee/index.html
- アトラクション構成: https://www.nagashima-onsen.co.jp/spaland/attraction/index.html
- キッズタウン: https://www.nagashima-onsen.co.jp/spaland/attraction/kidstown/index.html
- 年齢・身長・同伴条件: https://www.nagashima-onsen.co.jp/spaland/attraction/limit.html
- 所在地: https://www.nagashima-onsen.co.jp/spaland/wp-content/uploads/sites/7/2019/04/gudemap_ja.pdf

### ジャンボ海水プール

- 施設identity・2026年営業期間: https://www.nagashima-onsen.co.jp/pool/
- プール、スライダー、スパキッズの構成: https://www.nagashima-onsen.co.jp/pool/poolguide/index.html
- 現行料金: https://www.nagashima-onsen.co.jp/pool/fee/index.html
- 園内構成・所在地: https://www.nagashima-onsen.co.jp/pool/wp-content/uploads/sites/8/2026/06/pool-guide.pdf

公式ページが独立した施設名と常設設備を掲載し、2026年7月11日～9月28日の営業期間を明示しているため、恒久設備を毎夏開場する季節施設と判定した。

## CTA監査

- Rakuten: 2026-08-28取得の日本向け全17,266商品（SHA-256 `e2229e1c0e223b6c819801272ccad5d254062dff346a4b4f31468947534351a1`）を施設名で照合。有効な個別商品は0件。
- Asoview: `https://www.asoview.com/base/155456/` に施設ページはあるが、確認できた購入導線はふるさと納税返礼品で、既存CTAルールが求める通常の有効な個別商品ではない。ジャンボ海水プール側も遊園地入場との組み合わせ商品であり、独立Facilityへの個別CTAとして採用しない。

したがって、今回の2施設にはRakuten / Asoview CTAを設定しない。
