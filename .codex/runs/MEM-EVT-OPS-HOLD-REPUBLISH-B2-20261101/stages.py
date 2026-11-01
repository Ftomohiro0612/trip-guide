from record import *
import unicodedata

def normalize(text):
    return unicodedata.normalize('NFKC',re.sub(r'\s+','',text))

def extract(index):
    soup=BeautifulSoup((FRESH/f'{index:03d}-primary.html').read_text(encoding='utf-8'),'html.parser')
    groups=collections.defaultdict(list)
    for block in soup.select('.accordion_one'):
        header=block.select_one('.accordion_header')
        if not header: continue
        m=re.match(r'(\d+)月',header.get_text(strip=True))
        if not m: continue
        month=int(m[1]); year=2026 if month>=10 else 2027
        for li in block.select('.schedule-list > li'):
            dn=li.select_one('.day-wrap > p')
            if not dn: continue
            date=f'{year}-{month:02d}-{int(dn.get_text(strip=True)):02d}'
            for h in li.select('h2'):
                title=h.get_text(' ',strip=True)
                time=h.parent.find('p')
                groups[normalize(title)].append({'date':date,'time':time.get_text(' ',strip=True) if time else None,'title':title})
    return groups.get(normalize(CANDIDATES[index-1]['title']))

def stage(index):
    facts=extract(index)
    print('OFFICIAL_STAGE_FACTS',index,json.dumps(facts,ensure_ascii=False),flush=True)
    if not facts:
        hold(index,'START_DATE_UNCONFIRMED','今回再取得した公式スケジュールに候補名の開催日を照合できない。')
        return
    dates=sorted(set(f['date'] for f in facts))
    if dates[-1]<'2026-11-01':
        past(index,'今回の公式スケジュールに掲載された全日程（'+','.join(dates)+'）は今日より前に終了。')
        return
    if len(facts)==1:
        time=facts[0]['time']
    else:
        time='／'.join(f['date']+' '+(f['time'] or '開催時刻は公式に記載なし') for f in facts)
    venue='和歌山マリーナシティ '+('パフォーマンス広場' if 'パフォーマンス広場' in CANDIDATES[index-1]['title'] else 'ツリー前ステージ' if 'ツリー前ステージ' in CANDIDATES[index-1]['title'] else 'フェスタ・ルーチェ会場')
    add(index,dates[0],dates[-1],venue,'フェスタ・ルーチェ内で行う'+CANDIDATES[index-1]['title'].split(' [')[0]+'の公演。入場チケットが必要。',time=time,price='入場券は当日大人1,800円・3歳以上1,000円、前売大人1,600円・3歳以上800円。公演追加料金は公式に記載なし',reservation='入場チケット販売中。公演の申込・予約の条件は公式に記載なし',free=False,occurrences=dates if len(dates)>1 else None,extra_sources=['https://festaluce.jp/wakayama/topics/20261002-ticket'],notes='開催年は公式スケジュール冒頭の2026/10/31〜2027/2/14開催期間に紐づく月別日程で確認。料金は同Mission内で新規取得済みの主催者チケット告知に基づく。ほかの出演者とは演目・時刻が異なる。')

if __name__=='__main__':
    for i in range(int(sys.argv[1]),int(sys.argv[2])+1): stage(i)
    checkpoint()
