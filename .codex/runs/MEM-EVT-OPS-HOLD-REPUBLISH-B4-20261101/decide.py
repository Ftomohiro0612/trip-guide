import json,sys
from pathlib import Path
from datetime import datetime,timezone,date,timedelta
ROOT=Path(__file__).parent
MISSION='MEM-EVT-OPS-HOLD-REPUBLISH-B4-20261101'
C=json.loads(Path(r'C:\Users\tomo-\AppData\Local\Memorips\Tracks\hold-republish-b4-20261101\candidates.json').read_text(encoding='utf-8-sig'))
DATA=Path('data/events_data.json')
D=json.loads(DATA.read_text(encoding='utf-8'))
P=ROOT/'decisions.json'
R=json.loads(P.read_text(encoding='utf-8')) if P.exists() else {}
WEATHER='雨天・荒天時の扱いは公式に記載なし。主催者・公式サイトで要確認'

def record(i,disposition,reason,**kw):
    assert str(i) not in R, f'already decided {i}'
    fs=json.loads((ROOT/'fetches'/f'{i:03d}.json').read_text(encoding='utf-8'))
    R[str(i)]=dict(index=i,region=C[i-1]['region'],title=C[i-1]['title'],disposition=disposition,reason=reason,
        sources_checked=[{k:r.get(k) for k in ['url','final_url','http_status','checked_at','sha256']} for r in fs],**kw)

def hold(i,code,reason): record(i,'still_hold',reason,reason_code=code)
def other(i,kind,reason): record(i,kind,reason)
def duplicate(i,ids,reason):
    ids=ids if isinstance(ids,list) else [ids]
    assert all(any(e['id']==eid for e in D['events']) for eid in ids)
    record(i,'duplicate',reason,matched_event_id=ids[0],matched_event_ids=ids)

def event(i,start,end,venue,summary,time=None,price=None,res=None,age=None,free=None,title=None,notes='',weather=None,reservation='unknown',indoor=None,dates=None,suffix='',url=None):
    fs=json.loads((ROOT/'fetches'/f'{i:03d}.json').read_text(encoding='utf-8'))
    valid=[r for r in fs if r['http_status']==200 and not any(h in r['url'] for h in ['walkerplus.com','iko-yo.net','hanabilive.com','hanabi-koyomi.com'])]
    official=url or valid[-1]['final_url']
    assert official in [r['url'] for r in valid]+[r['final_url'] for r in valid]
    today='2026-11-01'
    if end is None:
        end=(max(date.fromisoformat(start),date.fromisoformat(today))+timedelta(days=30)).isoformat()
        dates=(dates or start)+' 終了日未定(公式未掲載)'
        notes+=' 終了日未定(公式未掲載)。終了日はPM ruling (C)の再確認期限。'
    assert end>=today and end>=start
    missing=[]
    if time is None: time='開催時刻は公式に記載なし'; missing.append('開催時刻')
    if price is None: price='料金は公式に記載なし'; free=None; missing.append('料金')
    if res is None: res='申込・予約の条件は公式に記載なし'; missing.append('申込・予約の条件')
    if age is None: age='対象年齢・同伴条件は公式に記載なし'; missing.append('対象年齢・同伴条件')
    if weather is None: weather=WEATHER; missing.append('雨天・荒天時の扱い')
    eid=f'evt-hold-b4-{i:03d}{suffix}'
    assert not any(e['id']==eid for e in D['events'])
    e=dict(id=eid,facility_id=None,venue_name=venue,prefecture=C[i-1]['region'],title=title or C[i-1]['title'],summary=summary+' '+weather,
       start_date=start,end_date=end,date_label=dates or (start if start==end else start+'〜'+end),time_label=time,price_label=price,reservation_label=res,age_label=age,
       recommended_for_tags=['experience'],recommended_for_label='体験や地域の催しを楽しみたい家族に',recommended_for_note='最新の開催状況と参加条件は公式サイトでご確認ください。',
       is_free=free,is_indoor=indoor,reservation=reservation,tags=['おでかけ'],official_url=official,
       source_urls=list(dict.fromkeys([r['final_url'] for r in valid])),source_checked_at=today,
       source_notes=today+' 本Missionで公式一次情報を再取得し、開催年・日付・会場・内容を確認。'+('公式に記載なし：'+'、'.join(missing)+'。' if missing else '')+' '+notes,
       status='ongoing' if start<=today else 'scheduled',display_priority=65,image=None)
    D['events'].append(e)
    return eid

def added(i,ids,reason='公式に開催日・会場・内容を確認。記載のない情報は固定文言で明示して公開。',participability='通常参加可能'):
    record(i,'added',reason,added_event_id=ids[0] if isinstance(ids,list) else ids,added_event_ids=ids if isinstance(ids,list) else [ids],participability=participability)

def save():
    D['metadata']['total_events']=len(D['events'])
    DATA.write_text(json.dumps(D,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    P.write_text(json.dumps(R,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    allrows=[R[k] for k in sorted(R,key=int)]
    counts={k:sum(r['disposition']==k for r in allrows) for k in ['added','duplicate','past','still_hold','not_event']}
    summary=dict(mission_id=MISSION,executed_in_this_mission=True,executed_at=datetime.now(timezone.utc).isoformat(),aggregate=dict(total=len(allrows),**counts,added_events=sum(len(r.get('added_event_ids',[])) for r in allrows),bounded_fixes_events_changed=0),candidates=allrows)
    (ROOT/'republish-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    progress=ROOT/'progress.jsonl'
    prior=sum(1 for _ in progress.open(encoding='utf-8')) if progress.exists() else 0
    boundary=len(allrows)//25*25 if len(allrows)<332 else 332
    with progress.open('a',encoding='utf-8') as out:
        for i in range(prior+1,boundary+1):
            r=R[str(i)]; s=r['sources_checked'][-1]
            out.write(json.dumps(dict(index=i,title=r['title'],region=r['region'],disposition=r['disposition'],official_url_fetched=s['url'],fetch_time=s['checked_at'],reason=r['reason']),ensure_ascii=False)+'\n')
    print(json.dumps(summary['aggregate']))

if __name__=='__main__':
    exec(Path(sys.argv[1]).read_text(encoding='utf-8'))
    save()
