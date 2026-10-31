from research import *
import collections

DATA = pathlib.Path('data/events_data.json')
def all_events():
    return json.loads(DATA.read_text(encoding='utf-8'))['events']

def record(index, disposition, reason, event=None, matched=None, code=None, source_suffixes=None):
    c=CANDIDATES[index-1]
    sources=[]
    for p in sorted(FRESH.glob(f'{index:03d}-*.fetch.json')):
        s=json.loads(p.read_text(encoding='utf-8'))
        sources.append(s)
    row={'index':index,'region':c['region'],'title':c['title'],'disposition':disposition,'event_id':event['id'] if event else matched,'reason_code':code,'reason':reason,'sources_checked':sources}
    if event:
        data=json.loads(DATA.read_text(encoding='utf-8'))
        assert event['id'] not in {x['id'] for x in data['events']}
        data['events'].append(event)
        DATA.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    path=ROOT/'decisions.json'
    rows=json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    assert not any(x['index']==index for x in rows), index
    rows.append(row)
    path.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('DECISION',index,disposition,row['event_id'],code or '',reason)

def add(index,start,end,venue,summary,time=None,price=None,reservation=None,age=None,free=None,occurrences=None,suffix='primary',extra_sources=(),weather=None,notes='',title=None,participability='通常参加可能',traffic=None,latest=None):
    c=CANDIDATES[index-1]
    source=json.loads((FRESH/f'{index:03d}-{suffix}.fetch.json').read_text(encoding='utf-8'))
    assert source['http_status']==200
    missing=[]
    if time is None: time='開催時刻は公式に記載なし'; missing.append('開催時刻')
    if price is None: price='料金は公式に記載なし'; free=None; missing.append('料金')
    if reservation is None: reservation='申込・予約の条件は公式に記載なし'; missing.append('申込・予約条件')
    if age is None: age='年齢・同伴条件は公式に記載なし'; missing.append('年齢・同伴条件')
    if weather is None: weather='雨天・荒天時の扱いは公式に記載なし。主催者・公式サイトで要確認'; missing.append('雨天・荒天時の扱い')
    urls=list(dict.fromkeys([source['url'],*extra_sources]))
    checked_urls={json.loads(p.read_text(encoding='utf-8'))['url'] for p in FRESH.glob(f'{index:03d}-*.fetch.json')}
    assert set(urls)<=checked_urls,(index,set(urls)-checked_urls)
    e={'id':f'evt-hold-b2-{index:03d}','facility_id':None,'venue_name':venue,'prefecture':c['region'],'title':title or c['title'],'summary':summary+' '+weather,'start_date':start,'end_date':end,'date_label':start if start==end else start+'〜'+end,'time_label':time,'price_label':price,'reservation_label':reservation,'age_label':age,'recommended_for_tags':['experience'],'recommended_for_label':'体験や地域の催しを楽しみたい家族に','recommended_for_note':'最新の開催状況と参加条件は公式サイトでご確認ください。','is_free':free,'is_indoor':None,'reservation':'required' if any(x in reservation for x in ['要申込','事前申込','要予約','先着','抽選']) else ('not_required' if '不要' in reservation else 'unknown'),'tags':['おでかけ'],'official_url':source['url'],'source_urls':urls,'source_checked_at':'2026-11-01','source_notes':'2026-11-01 本Missionで公式一次情報を再取得し、開催年・日付・会場・内容を確認。'+('公式に記載なし：'+ '、'.join(missing)+'。' if missing else '')+(traffic or '交通規制・アクセス案内は公式に記載なし。')+(latest or '直近の変更告知は公式に記載なし。')+notes,'status':'ongoing' if start<='2026-11-01' else 'scheduled','display_priority':65,'image':None}
    if occurrences: e['occurrence_dates']=occurrences
    record(index,'added',participability+'。公式開催年・日付・会場・内容を今回再確認。',event=e)

def hold(index,code,reason): record(index,'still_hold',reason,code=code)
def past(index,reason): record(index,'past',reason)
def not_event(index,reason): record(index,'not_event',reason)
def duplicate(index,event_id,reason):
    assert event_id in {x['id'] for x in all_events()}
    record(index,'duplicate',reason,matched=event_id)

def checkpoint():
    rows=json.loads((ROOT/'decisions.json').read_text(encoding='utf-8'))
    assert [x['index'] for x in rows]==list(range(1,len(rows)+1))
    old=(ROOT/'progress.jsonl').read_text(encoding='utf-8').splitlines() if (ROOT/'progress.jsonl').exists() else []
    with (ROOT/'progress.jsonl').open('a',encoding='utf-8') as f:
        for r in rows[len(old):]:
            s=next((x for x in r['sources_checked'] if x.get('http_status')==200),r['sources_checked'][0] if r['sources_checked'] else {})
            p={k:r[k] for k in ['index','region','title','disposition','reason']}
            p.update(official_url_fetched=s.get('url'),fetch_time=s.get('checked_at'),event_id=r['event_id'])
            f.write(json.dumps(p,ensure_ascii=False)+'\n')
    print('CHECKPOINT',len(rows),dict(collections.Counter(r['disposition'] for r in rows)))
