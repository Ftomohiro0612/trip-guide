import json, sys, re, hashlib
from pathlib import Path
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
CANDIDATES = json.loads(Path(r'C:\Users\tomo-\AppData\Local\Memorips\Tracks\hold-republish-b4-20261101\candidates.json').read_text(encoding='utf-8-sig'))

def show(index,rec):
    shown = rec.copy()
    shown.pop('links',None)
    if 'walkerplus.com' in rec['url']:
        shown['text']='Secondary candidate-discovery page fetched; not used as event evidence.'
    for marker in ['Share ポスト','関連情報 おすすめ情報','このページに関する']:
        shown['text']=shown['text'].split(marker,1)[0]
    shown['text']=re.sub(r'\s+',' ',shown['text'])
    if 'var event_data' in rec['text']:
        data=json.JSONDecoder().raw_decode(rec['text'].split('events: ',1)[1])[0]
        title=CANDIDATES[index-1]['title']
        matches=[e.copy() for e in data if title in e.get('eventtitle','') or e.get('eventtitle','') in title]
        for e in matches:
            if len(e.get('opendays',[]))>12: e['opendays']=[e['opendays'][0],e['opendays'][-1]]
        shown['text']=json.dumps(matches,ensure_ascii=False)
    print(json.dumps(dict(index=index,title=CANDIDATES[index-1]['title'],**shown),ensure_ascii=False),flush=True)

def fetch(index, url):
    checked = datetime.now(timezone.utc).isoformat()
    try:
        r = requests.get(url, timeout=35)
        if 'application/pdf' in r.headers.get('Content-Type',''):
            import io
            from pypdf import PdfReader
            text='\n'.join(p.extract_text() for p in PdfReader(io.BytesIO(r.content)).pages)
            dest=ROOT/'fetches'/f'{index:03d}-source.pdf';dest.parent.mkdir(exist_ok=True);dest.write_bytes(r.content)
            rec=dict(url=url,final_url=r.url,http_status=r.status_code,checked_at=checked,text=text,sha256=hashlib.sha256(r.content).hexdigest(),links=[])
            p=ROOT/'fetches'/f'{index:03d}.json';rows=json.loads(p.read_text(encoding='utf-8')) if p.exists() else [];rows.append(rec);p.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');show(index,rec);return rec
        if r.headers.get('Content-Type','').startswith('image/'):
            ext='.png' if 'png' in r.headers['Content-Type'] else '.jpg'
            dest=ROOT/'fetches'/f'{index:03d}-source{ext}'
            dest.parent.mkdir(exist_ok=True)
            dest.write_bytes(r.content)
            rec=dict(url=url,final_url=r.url,http_status=r.status_code,checked_at=checked,text='Image source saved: '+str(dest),sha256=hashlib.sha256(r.content).hexdigest(),links=[])
            p=ROOT/'fetches'/f'{index:03d}.json'
            rows=json.loads(p.read_text(encoding='utf-8')) if p.exists() else []
            rows.append(rec);p.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');show(index,rec);return rec
        r.encoding = r.apparent_encoding
        s = BeautifulSoup(r.text, 'html.parser')
        for e in s(['script','style','nav','header','footer']): e.decompose()
        main = s.select_one('#tmp_contents, #contents, main, article, #main') or s
        text = main.get_text(' ', strip=True)
        if 'ここから本文です。' in text: text = text.split('ここから本文です。',1)[1]
        if 'pref.tochigi.lg.jp' in r.url and 'お問い合わせ' in text: text = text.split('お問い合わせ',1)[0]
        rec = dict(url=url, final_url=r.url, http_status=r.status_code, checked_at=checked,
                   text=text, sha256=hashlib.sha256(r.content).hexdigest(),
                   links=[dict(text=a.get_text(' ',strip=True),url=requests.compat.urljoin(r.url,a['href'])) for a in main.select('a[href]')])
    except Exception as ex:
        rec = dict(url=url, final_url=url, http_status=None, checked_at=checked, error=str(ex), text='', links=[])
    p=ROOT/'fetches'/f'{index:03d}.json'
    p.parent.mkdir(exist_ok=True)
    rows=json.loads(p.read_text(encoding='utf-8')) if p.exists() else []
    rows.append(rec)
    p.write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    show(index,rec)
    return rec

if __name__=='__main__':
    if sys.argv[1]=='view':
        for i in range(int(sys.argv[2]),int(sys.argv[3])+1):
            rows=json.loads((ROOT/'fetches'/f'{i:03d}.json').read_text(encoding='utf-8'))
            for rec in rows: show(i,rec)
    elif sys.argv[1]=='details':
        for i in range(int(sys.argv[2]),int(sys.argv[3])+1):
            rec=json.loads((ROOT/'fetches'/f'{i:03d}.json').read_text(encoding='utf-8'))[0]
            if 'var event_data' in rec['text']:
                data=json.JSONDecoder().raw_decode(rec['text'].split('events: ',1)[1])[0]
                title=CANDIDATES[i-1]['title']
                for e in data:
                    if title in e.get('eventtitle','') or e.get('eventtitle','') in title:
                        fetch(i,requests.compat.urljoin(rec['url'],e['url']))
    elif sys.argv[1]=='fetch': fetch(int(sys.argv[2]),sys.argv[3])
    else:
        for index in range(int(sys.argv[1]),int(sys.argv[2])+1):
            c=CANDIDATES[index-1]
            if c.get('url'): fetch(index,c['url'])
            else: print(json.dumps(dict(index=index,title=c['title'],url=None),ensure_ascii=False))
