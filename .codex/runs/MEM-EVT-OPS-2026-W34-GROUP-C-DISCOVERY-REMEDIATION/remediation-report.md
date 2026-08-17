# MEM-EVT-OPS-2026-W34-GROUP-C-DISCOVERY-REMEDIATION

## Result

The three omitted discovery categories were executed in this mission for all 22 authorized prefectures. The durable JSON evidence contains the exact URL, actual fetch outcome, and per-fetch timestamp for every region.

- Regional official floor: 22 region-specific official tourism/event surfaces, 22 successful HTTP 200 fetches, 0 selected new candidates.
- Organizer/event-series: both pages of the live SPLAWARS schedule were fetched separately for every region (44 HTTP 200 fetches). Four current/future schedule candidates were found: Yamanashi 1 and Shizuoka 3; all four were already present in Product.
- Secondary recall: 22 WalkerPlus prefecture pages plus 23 official-primary resolution pages/fetches. Twenty-two candidate leads reached terminal dispositions: added 4, duplicate/already present 13, HOLD 4, stale-false 1.
- Product change: `data/events_data.json` adds exactly four official-primary-confirmed events and increments `metadata.total_events` by four. No existing event was modified or removed.
- Frozen parent lanes: no due-facility disposition or ended-cleanup evidence was reused or changed. No facility, registry, schema, UI, category, or rotation-state file was changed.

## Per-region execution

The organizer column refers to both `https://splawars.com/schedule/` and `https://splawars.com/schedule/page/2/`, fetched separately for each row. `R/O/S` gives the actual source count recorded in the regional / organizer / secondary evidence files.

| Region | R/O/S | Regional official floor | Organizer result | Secondary recall candidate → terminal disposition |
|---|---:|---|---|---|
| tokyo | 1/2/2 | GO TOKYO calendar | 0 candidates | 特別展 大南極展 → duplicate/already present (`evt-221-202607-01`) |
| osaka | 1/2/2 | Osaka Info events | 0 candidates | 特別展「大絶滅展 生命史のビッグファイブ」→ duplicate/already present (`evt-1337-202607-01`) |
| hiroshima | 1/2/2 | Dive! Hiroshima events | 0 candidates | 「オバケ？」展 → duplicate/already present (`evt-2017-202607-01`) |
| kyoto | 1/2/2 | Kyoto City Tourism event page | 0 candidates | 遊べるヨウカイ → duplicate/already present (`evt-1602-202607-04`) |
| yamanashi | 1/2/2 | Yamanashi official tourism event search | 富士川クラフトパーク 8/22: already present (`evt-192-202608-01`) | かがくいひろしの世界展 → duplicate/already present (`evt-2091-202607-01`) |
| nagano | 1/2/2 | Go NAGANO events | 0 candidates | 諏訪湖サマーナイト花火2026 → already present in the merged Summer Hub set (`evt-summer-2026-nagano-011`) |
| shizuoka | 1/2/2 | Shizuoka official tourism portal | 函南 8/30・大浜公園 9/19・浜名湖 9/22: all already present | グランシップサマーじどうかん → **added** (`evt-shizuoka-granship-202607-02`, 通常参加可能) |
| kanagawa | 1/2/3 | Kanagawa official tourism event list | 0 candidates | ヨコハマ恐竜展2026 → **HOLD**: official site confirms dates, venue, tickets and access, but not the public opening hours required for a Product record |
| chiba | 1/2/2 | Maruchiba events | 0 candidates | 夏！恐竜！！ちばディノランド → duplicate/already present (`evt-676-202607-01`) |
| niigata | 1/2/2 | Niigata official tourism events | 0 candidates | 光と影のマジックワールド → duplicate/already present (`evt-572-202607-04`) |
| aichi | 1/2/2 | Aichi Now events | 0 candidates | サマーナイトアクアリウム → duplicate/already present (`evt-1667-202607-01`) |
| miyagi | 1/2/2 | Miyagi official tourism posts | 0 candidates | ポケモン天文台（角田）→ **HOLD**: official site confirms 7/5–9/15, venue, tickets and day-of availability, but not the exhibition's public opening hours |
| kumamoto | 1/2/2 | Kumamoto official tourism events | 0 candidates | 夏を遊ぼう！2026 in 美里町 → **stale-false**: the linked live official facility page contains no corroborating event notice |
| oita | 1/2/2 | Visit Oita events | 0 candidates | Hello Kitty展 大分 → **added** (`evt-oita-202607-11`, 通常参加可能) |
| nagasaki | 1/2/2 | Nagasaki Tabinet events | 0 candidates | 旅する光の切り絵展 → duplicate/already present (`evt-nagasaki-202607-13`) |
| gifu | 1/2/2 | Gifu official tourism events | 0 candidates | 木育フェス2026 → **HOLD**: organizer confirms the national model-home series but does not identify a specific Gifu venue on its official page |
| shiga | 1/2/2 | Biwako Visitors events | 0 candidates | 虹色みぃつけた！→ duplicate/already present (`evt-shiga-202608-18`) |
| tottori | 1/2/2 | Tottori official tourism portal | 0 candidates | サンドの夏休み2026 → **HOLD**: the remaining statewide stamp-rally component spans four venues and the official page does not close a single reusable time/fee condition |
| kagoshima | 1/2/2 | Kagoshima official tourism events | 0 candidates | 大恐竜展2026 → **added** (`evt-kagoshima-202607-10`, 通常参加可能) |
| saga | 1/2/2 | Asobo Saga events | 0 candidates | 夏のやきもの体験フェスタ → duplicate/already present (`evt-saga-202607-08`) |
| akita | 1/2/2 | Akita official tourism events | 0 candidates | わけあって絶滅しました。展 → duplicate/already present (`evt-akita-202607-01`) |
| iwate | 1/2/3 | Iwate official tourism events | 0 candidates | 遊べる宮沢賢治展 → **added** (`evt-3939-202604-01`, 通常参加可能) |

## `evt-oita-202608-13` re-verification

Disposition: **re-confirmed as-is**. The city page and organizer page were both fetched in this run. The official basis directly supports the Product title, date, time, venue, postponement, traffic/public-transit guidance, free general-viewing participation path, and the existing child-attendability cautions.

Short official-basis excerpts:

- Oita City: “令和8年8月29日（土曜日）午後7時30分から（予定）” and “荒天時は9月6日（日曜日）に延期”.
- Oita City venue: “大分川 弁天大橋上流”.
- Organizer: “一般観覧エリアは無料” and “18:30～21:00 交通規制”.

The organizer also confirms the 17:00 program start, 19:15 drone show, 19:30 fireworks for about one hour, public-transit recommendation, and 23–30 minute walks from temporary parking. No Product field correction or removal was warranted.

## Product diff and verification

Added records:

1. `evt-shizuoka-granship-202607-02` — グランシップサマーじどうかん
2. `evt-oita-202607-11` — Hello Kitty展 -わたしが変わるとキティも変わる-（大分）
3. `evt-kagoshima-202607-10` — 南日本新聞社創立145年記念 大恐竜展2026
4. `evt-3939-202604-01` — 宮沢賢治生誕130年記念 遊べる宮沢賢治展

Local validation before integration:

- `npm run events:validate`: errors 0
- `npm run events:regular:validate`: errors 0, unbaselined violations 0
- `npm run events:regular:test`: 5/5 passed
- `npm run events:filter:test`: 9/9 passed
- `npm run events:summer:test`: 47/47 passed
- `npm run build`: passed; Next.js compilation/type checking and static generation completed 4,782/4,782
- `npm run crosslinks:test`: 9 passed / 1 failed on the pre-existing deterministic fixture snapshot (`events.length` expected 475, actual 473). The failing fixture is built from Summer Hub/classification files, not the four changed base-event records, so its snapshot was not changed in this bounded remediation.

## Integration stop / escalation

Outcome: **ESCALATED — Production deployment failure; cannot continue without Owner/PM direction.**

The required ordering was followed through the merge boundary:

1. Candidate HEAD `1071cf33907f1de5082b08b2c27fcd2ab6f7ab27` was pushed and PR #38 Vercel Preview completed successfully.
2. The unique action-ledger row `MEM-ACT-EVT-OPS-W34-DISCOVERY-REMEDIATION-PROD-20260817-1071CF3` was committed and remotely confirmed as `REQUESTED` at Memory HEAD `7e5fd18fb2840b39a2b9dbf967642d75fd84afdc` before Product merge.
3. PR #38 merged once from Product baseline `37a74ad9fda23bc2a36c79bc064642cacec9890b` as exact Product main HEAD `c9aba71c52acb38eda3eb22d1d3dc06d0b2e5117`.
4. Automatic Vercel Production deployment `dpl_9HfcJGMdxWswxRm5JrWWXk44fbG2` / GitHub deployment `5940343584` failed. Vercel cloned exact commit `c9aba71`, both event validators reported errors 0, and the build then stopped during `next build` with repeated module-not-found errors in generated `[next]/internal/font/google/noto_sans_jp_befdc8c2.module.css`. The same candidate had passed both the local Production build and Vercel Preview.

Per the Mission's fail-closed escalation boundary, no retry, workaround commit, manual deployment, Production-reflection assertion, or Sentinel success assertion was made. Production READY/reflection was not reached; Sentinel was therefore **not run / not applicable after the failed deployment**. The action-ledger row is being changed from `REQUESTED` to `FAILED`, not `SUCCEEDED`. Product main currently contains the merged four-event diff, while the corresponding Production deployment is failed.

## Durable evidence paths

- `.codex/runs/MEM-EVT-OPS-2026-W34-GROUP-C-DISCOVERY-REMEDIATION/regional-floor-evidence.json`
- `.codex/runs/MEM-EVT-OPS-2026-W34-GROUP-C-DISCOVERY-REMEDIATION/organizer-series-evidence.json`
- `.codex/runs/MEM-EVT-OPS-2026-W34-GROUP-C-DISCOVERY-REMEDIATION/secondary-recall-evidence.json`
- `.codex/runs/MEM-EVT-OPS-2026-W34-GROUP-C-DISCOVERY-REMEDIATION/remediation-report.md`
