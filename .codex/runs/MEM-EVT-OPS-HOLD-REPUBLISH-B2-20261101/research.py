import argparse, datetime, hashlib, json, os, pathlib, re, subprocess, sys, urllib.parse
import requests
from bs4 import BeautifulSoup

MISSION = 'MEM-EVT-OPS-HOLD-REPUBLISH-B2-20261101'
ROOT = pathlib.Path(__file__).resolve().parent
TRACK = pathlib.Path(r'C:\Users\tomo-\AppData\Local\Memorips\Tracks\hold-republish-b2-20261101')
FRESH = TRACK / 'b2-fresh-evidence'
FRESH.mkdir(exist_ok=True)
CANDIDATES = json.loads((TRACK / 'candidates.json').read_text(encoding='utf-8-sig'))
SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Memorips official event verification)'})

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def fetch(index, url, suffix='primary'):
    stamp = now()
    result = {'url': url, 'final_url': None, 'http_status': None, 'checked_at': stamp}
    prefix = FRESH / f'{index:03d}-{suffix}'
    text = ''
    try:
        response = SESSION.get(url, timeout=(12, 35))
        result.update(final_url=response.url, http_status=response.status_code, content_type=response.headers.get('Content-Type', ''), sha256=hashlib.sha256(response.content).hexdigest())
        if response.content.startswith(b'%PDF'):
            prefix.with_suffix('.pdf').write_bytes(response.content)
            subprocess.run(['pdftotext', '-layout', str(prefix.with_suffix('.pdf')), str(prefix.with_suffix('.txt'))], check=True)
            text = prefix.with_suffix('.txt').read_text(encoding='utf-8')
        else:
            if response.encoding is None or response.encoding.lower() in ['iso-8859-1','ascii']:
                response.encoding = response.apparent_encoding
            prefix.with_suffix('.html').write_text(response.text, encoding='utf-8')
            soup = BeautifulSoup(response.text, 'html.parser')
            for tag in soup(['script','style','noscript','svg','footer','nav']):
                tag.decompose()
            main = soup.select_one('main') or soup.select_one('#content') or soup.select_one('#contents') or soup
            text = '\n'.join(x.strip() for x in main.get_text('\n').splitlines() if x.strip())
            links=[]
            for a in main.find_all('a',href=True):
                href=urllib.parse.urljoin(response.url,a['href'])
                if href.startswith('http'):
                    links.append({'text':a.get_text(' ',strip=True),'url':href})
            prefix.with_suffix('.links.json').write_text(json.dumps(links,ensure_ascii=False,indent=2),encoding='utf-8')
        prefix.with_suffix('.txt').write_text(text, encoding='utf-8')
        result['text_characters'] = len(text)
    except Exception as e:
        result['error'] = f'{type(e).__name__}: {e}'
    prefix.with_suffix('.fetch.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print('FETCH', index, suffix, json.dumps(result,ensure_ascii=False),flush=True)
    return result, text

def show(index, suffix='primary', limit=10000):
    c=CANDIDATES[index-1]
    print('\nCANDIDATE',index,c['region'],c['title'])
    p=FRESH / f'{index:03d}-{suffix}'
    print(p.with_suffix('.fetch.json').read_text(encoding='utf-8'))
    text=p.with_suffix('.txt').read_text(encoding='utf-8') if p.with_suffix('.txt').exists() else ''
    print(text[:limit])
    if len(text)>limit: print('TRUNCATED',len(text))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('mode',choices=['fetch','show','url','list'])
    p.add_argument('start',type=int)
    p.add_argument('end',nargs='?',type=int)
    p.add_argument('--url')
    p.add_argument('--suffix',default='primary')
    p.add_argument('--limit',type=int,default=10000)
    a=p.parse_args()
    if a.mode=='url': fetch(a.start,a.url,a.suffix)
    else:
        for index in range(a.start,(a.end or a.start)+1):
            c=CANDIDATES[index-1]
            if a.mode=='fetch':
                print('CANDIDATE',index,c['region'],c['title'],flush=True)
                if c.get('url'): fetch(index,c['url'])
                else: print('NO_URL',index,flush=True)
            elif a.mode=='list': print(index,c['region'],c['title'],c.get('url'))
            else: show(index,a.suffix,a.limit)
