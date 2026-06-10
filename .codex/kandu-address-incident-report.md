# カンドゥー住所誤記入 インシデントレポート

> 記録: 2026-06-10 / Claude Code PM

---

## 何が起きたか

Phase 5 仕様書（`.codex/phase5-data-quality-audit.md`）で、カンドゥーの修正住所として
「千葉県浦安市舞浜1-4 イクスピアリ」を記載。
Codex がそのまま `data/facilities_data.json` に反映し、commit `82ff4b2` に含まれた。

正しい住所: **千葉県千葉市美浜区豊砂1-5 イオンモール幕張新都心 エキマエ3階**

---

## 原因分析

### 1. PMがAI学習データから住所を補完した

カンドゥーはかつてイクスピアリ（千葉県浦安市舞浜）に店舗を持っていたが、同店舗は閉店済み。
Claude の学習データにはこの旧店舗情報が含まれており、公式確認なしに「現在の住所」として記入してしまった。

### 2. Phase 5 仕様書に「要Web確認」フラグを付けなかった

仕様書には「Step 4: カンドゥーの暫定修正」として住所を直接記載した。
「暫定」と書いたにもかかわらず、確認前に確定住所として Codex に渡した。

### 3. Codex が spec の住所をそのまま適用した

Codex は仕様書の内容を忠実に実装するため、誤った住所を検証なく JSON に書き込んだ。
これは Codex の仕様通りの動作であり、問題は上流の仕様書にある。

### 4. 座標も誤っていた

イクスピアリ周辺の座標（35.655, 139.793）が設定されていた。
正しい座標（35.658, 140.025）は Nominatim で「カンドゥー」を直接検索して取得。

---

## 同種ミスの可能性

### 確認すべき施設のパターン

1. `address` が「各エリア」「都内」「全国」など架空表現 → 住所全体が AI 補完の可能性
2. `geocode_source: "google"` かつ `address` が施設名・概念の説明に見える
3. ショッピングモール内テナント（住所がモール名になっているが館内位置が不明）
4. 「旧 ○○ 所在、現在は移転」のような施設

### 現在データへの影響

Phase 5 監査スクリプト（`scripts/audit-data-quality.mjs`）の `invalid_address` チェックで
架空アドレスパターンを持つ施設を検出できるが、「住所は実在するが施設の現在地ではない」ケースは
スクリプトでは検出できない。これには人的確認が必要。

---

## 再発防止ルール

### PM（Claude Code）が守ること

1. **住所・所在地をAI学習データから補完してはならない**
   - 仕様書に住所を書く場合は必ず「要確認」とマークし、確認元URL を示す
   - 確認できない場合は `needs_web_check: true` のままにして Codex に「住所は修正しないこと」と明示する

2. **閉店・移転情報はAIで判定しない**
   - カンドゥーのように旧店舗と新店舗の両方が学習データに含まれる場合、AI は区別できない
   - 「現在地」「稼働中」の判断は公式サイトか Google Maps 等で確認する

3. **住所修正は `web_check_status: "verified"` と確認元を残す**
   - 修正した場合はデータに `source_url` か `audit_note` を付記する

### Codex が守ること（PM が仕様書に明記すること）

1. 住所修正の仕様書には必ず「確認元: <URL>」を記載する。URL がない場合は修正を実施しない。
2. 架空住所パターン（各エリア、都内、アクセスなど）の施設の住所補完は行わない。

---

## 今回の修正内容（commit `43c613c`）

| 項目 | 修正前 | 修正後 |
|---|---|---|
| address | 千葉県浦安市舞浜1-4 イクスピアリ | 千葉県千葉市美浜区豊砂1-5 イオンモール幕張新都心 エキマエ3階 |
| latitude | 35.6551508 | 35.6575832 |
| longitude | 139.7930083 | 140.0251269 |
| geocode_source | google | nominatim |
| description | ～イクスピアリ（千葉県浦安市）のみ | ～イオンモール幕張新都心エキマエ（千葉市美浜区）に立地 |

確認元: Nominatim OSM / `https://nominatim.openstreetmap.org` にて「カンドゥー」直接ヒット

---

## audit-data-quality への追加チェック（今後の実装候補）

`scripts/audit-data-quality.mjs` に以下のチェックを追加することを推奨：

```javascript
// address と latitude/longitude の整合性チェック
// address に含まれる都道府県名から期待緯度経度の範囲を推定し、
// 実際の座標が大きく外れていれば needs_web_check フラグを立てる
const PREF_LAT_RANGE = {
  '千葉県': [35.0, 36.2],
  '東京都': [35.5, 35.9],
  '神奈川県': [35.1, 35.7],
  // ...
};

function checkCoordPrefMismatch(facility) {
  const pref = facility.prefecture;
  const range = PREF_LAT_RANGE[pref];
  if (!range) return null;
  const lat = facility.latitude;
  if (lat < range[0] || lat > range[1]) {
    return {
      issue_type: 'coord_pref_mismatch',
      needs_web_check: true,
      web_check_reason: `prefecture=${pref} だが latitude=${lat} は想定範囲外 (${range[0]}〜${range[1]})`
    };
  }
  return null;
}
```

このチェックがあれば、今回のように「prefecture=千葉県 だが lat が 139.79（東京都西部相当）」を検出できた。
