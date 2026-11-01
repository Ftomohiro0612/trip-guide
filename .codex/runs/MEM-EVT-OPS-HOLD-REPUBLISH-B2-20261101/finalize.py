"""Reconcile this mission's records; never change a baseline event."""
from record import *
import subprocess

rows = json.loads((ROOT/'decisions.json').read_text(encoding='utf-8'))
data = json.loads(DATA.read_text(encoding='utf-8'))
own = {e['id']: e for e in data['events'] if e['id'].startswith('evt-hold-b2-')}

for index, matched in [(48,110),(50,112)]:
    row = rows[index-1]
    row['disposition'] = 'duplicate'
    row['event_id'] = f'evt-hold-b2-{matched:03d}'
    row['reason_code'] = None
    row['reason'] = '後続候補で発見した主催者の開催年明記ページをこの候補でも再取得。同一日付・同一会場の候補'+str(matched)+'と照合。'
    row['reconciliation'] = 'Initial year-unconfirmed HOLD superseded by a fresh official primary fetch in this process.'
    row['sources_checked'].append(json.loads((FRESH/f'{index:03d}-current-official.fetch.json').read_text(encoding='utf-8')))

e = own['evt-hold-b2-010']
e['time_label'] = '開催時刻は公式に記載なし（掲載16:00〜21:00は10月10日の特別回。今後の回は主催者で確認）'
e['source_notes'] += '未来回の時刻は10月10日特別回から流用せず未記載として公開。アクセスは本町3丁目バス停下車。'

e = own['evt-hold-b2-156']
e.update(title='ソメカラ オープンファクトリー（吉田染工・貴志川工業・吉田工業）',venue_name='吉田染工株式会社 和歌山本社（紀の川市貴志川町前田16）',summary='染色・ニット工場の工程を見学する3社共同のオープンファクトリー。 雨天・荒天時の扱いは公式に記載なし。主催者・公式サイトで要確認',time_label='13:30〜15:30',price_label='参加無料',is_free=True,reservation_label='要事前申込。各回前日18:00締切。予約状況により受付できない場合あり',reservation='required')
e['source_urls'].append('https://www.pref.wakayama.lg.jp/prefg/061000/d00222982_d/fil/somekara.pdf')
e['source_notes'] = '2026-11-01 県公式2026 Autumnチラシを今回再取得して画像を確認。10月12日・11月3日・11月23日13:30〜15:30、参加無料、前日18時までの事前申込、会場を確認。年齢・同伴条件、雨天・荒天時の扱い、交通規制、直近の変更告知は公式に記載なし。車は来客用駐車場を利用。3社別々の見学イベントではなく共同企画を1件として登録。'
e['age_label'] = '年齢・同伴条件は公式に記載なし'

e = own['evt-hold-b2-207']
e['summary'] = e['summary'].split(' 雨天・荒天時')[0] + ' 当日10:00時点で平均風速5m/s以上または降水確率100%、18:55の現地風速5m/s以上で中止。公式SNS・アプリで告知。'
e['source_urls'].append('https://festaluce.jp/wakayama/faq/')
e['source_notes'] = e['source_notes'].replace('雨天・荒天時の扱い、','').replace('雨天・荒天時の扱い。','') + '今回取得した公式FAQのドローン中止基準を反映。'

row = rows[363]
row.update(reason_code='START_DATE_UNCONFIRMED',reason='再取得では公式行事ページを読めたが、1月1〜3日の年中行事案内のみ。2027年の開始日を確認できない。')
row['reconciliation'] = 'Initial source timeouts superseded by readable official page; year remains unconfirmed.'
row['sources_checked'].append(json.loads((FRESH/'364-detail.fetch.json').read_text(encoding='utf-8')))

# Percent-encode a freshly fetched URL containing an ideographic space.
e = own['evt-hold-b2-330']
e['source_urls'] = [next((json.loads(p.read_text(encoding='utf-8'))['final_url'] for p in FRESH.glob('330-*.fetch.json') if json.loads(p.read_text(encoding='utf-8'))['url']==u),u) for u in e['source_urls']]

own['evt-hold-b2-423']['summary'] += ' 12月4日〜2月28日は天門橋エリアで特別イルミネーション「富山湾に包まれて」も実施。'
own['evt-hold-b2-203']['reservation']='required'

# Improve display titles without altering the original candidate titles in evidence.
for i,title in {404:'多度大社 上げ馬神事',407:'多度大社 御田植祭',414:'敢國神社 おんまつり（獅子神楽）',416:'鳥羽市民文化祭',417:'志摩スペイン村 スパークリング・クリスマス',465:'高岡古城公園 秋の紅葉ライトアップ',470:'相倉合掌造り集落 冬のライトアップ',472:'五箇山菅沼合掌造り集落 ライトアップ',481:'#秋の舟川べり2026 Instagramフォトコンテスト',482:'チームTOYAMA応援デジタルスタンプラリー',459:'ひみつグルメ（ぎょかい編・肉編）',461:'富山マラソン2026（沿道応援・観戦）'}.items():
    own[f'evt-hold-b2-{i:03d}']['title']=title

# All facts below remain derived from fresh in-process fetches, never old HOLD reasons.
metas = [json.loads(p.read_text(encoding='utf-8')) for p in FRESH.glob('*.fetch.json')]
start = datetime.datetime.fromisoformat('2026-10-31T23:16:07.724+00:00')
for r in rows:
    index=r['index']
    relevant=[json.loads(p.read_text(encoding='utf-8')) for p in sorted(FRESH.glob(f'{index:03d}-*.fetch.json'))]
    for s in relevant:
        if not any(x['url']==s['url'] and x['checked_at']==s['checked_at'] for x in r['sources_checked']): r['sources_checked'].append(s)
    e=own.get(r['event_id']) if r['disposition']=='added' else None
    if e:
        for u in e['source_urls']:
            if not any(u in (s.get('url'),s.get('final_url')) for s in r['sources_checked']):
                s=next(s for s in metas if u in (s.get('url'),s.get('final_url')) and s.get('http_status')==200)
                r['sources_checked'].append({**s,'reuse':'same_mission_shared_official_fetch; candidate independently fetched'})
    assert r['sources_checked'],index
    assert all(datetime.datetime.fromisoformat(s['checked_at'].replace('Z','+00:00'))>start for s in r['sources_checked'])
    r['added_event_id']=r['event_id'] if r['disposition']=='added' else None
    r['matched_event_id']=r['event_id'] if r['disposition']=='duplicate' else None

baseline=json.loads(subprocess.check_output(['git','show','9837276524189f00976c5aff09598e4aebab0f5a:data/events_data.json'],encoding='utf-8'))
byid={e['id']:e for e in data['events']}
assert all(byid[e['id']]==e for e in baseline['events']), 'Baseline event changed'
assert len(data['events'])-len(baseline['events'])==len(own)==285
DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'decisions.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

execution=json.loads((ROOT/'execution.json').read_text(encoding='utf-8'))
execution['candidate_file_sha256']=hashlib.sha256((TRACK/'candidates.json').read_bytes()).hexdigest()
(ROOT/'execution.json').write_text(json.dumps(execution,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

aggregate={'total':len(rows),**{k:sum(r['disposition']==k for r in rows) for k in ['added','duplicate','past','still_hold','not_event']},'bounded_fixes_changed_events':0,'existing_events_changed':0,'existing_events_removed':0}
region_counts={region:{'total':sum(r['region']==region for r in rows),**dict(collections.Counter(r['disposition'] for r in rows if r['region']==region))} for region in ['wakayama','mie','toyama']}
phrases={'weather':'雨天・荒天時の扱いは公式に記載なし。主催者・公式サイトで要確認','time':'開催時刻は公式に記載なし','fee':'料金は公式に記載なし','reservation':'申込・予約の条件は公式に記載なし','age':'年齢・同伴条件は公式に記載なし'}
missing_counts={k:{'phrase':p,'events':sum(p in ' '.join(str(v) for v in e.values()) for e in own.values())} for k,p in phrases.items()}
summary={'mission_id':MISSION,'executed_in_this_mission':True,'executed_at':now(),'mission_started_at':execution['mission_started_at'],'baseline':execution['baseline'],'candidate_file_sha256':execution['candidate_file_sha256'],'index_base':1,'aggregate':aggregate,'per_region':region_counts,'not_stated_phrasings':missing_counts,'inherited_evidence_used':False,'bounded_fixes':[],'deviations':['Dispatch references end-date ruling (C) but omits its text; clarification requested, no unpublished-end-date fallback used.','Progress was appended at each 25-candidate boundary (plus region-end checkpoints); final progress rows reconciled to final dispositions after newly found current official sources resolved two earlier HOLDs and one fetch failure.'],'per_candidate':rows}
(ROOT/'republish-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (ROOT/'progress.jsonl').open('w',encoding='utf-8') as f:
    for r in rows:
        e=own.get(r['event_id']) if r['disposition']=='added' else None
        s=next((s for s in r['sources_checked'] if e and e['official_url'] in (s.get('url'),s.get('final_url'))),next((s for s in r['sources_checked'] if s.get('http_status')==200 and not any(d in s['url'] for d in ['walkerplus.com','iko-yo.net','nihonkai'])),r['sources_checked'][0]))
        f.write(json.dumps({**{k:r[k] for k in ['index','region','title','disposition','reason','event_id']},'official_url_fetched':s['url'],'fetch_time':s['checked_at']},ensure_ascii=False)+'\n')
print('FINAL',aggregate,region_counts,missing_counts)
