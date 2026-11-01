"""Read-only browser verification of all affected event pages and added cards."""
import argparse, datetime, json, pathlib, re
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('base_url')
parser.add_argument('output')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parent
events=json.loads(pathlib.Path('data/events_data.json').read_text(encoding='utf-8'))['events']
by_id={e['id']:e for e in events}
added={e['id']:e for e in events if e['id'].startswith('evt-hold-b2-')}
def norm(s): return re.sub(r'\s+',' ',s).strip()
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base_url':args.base_url,'viewports':[],'page_errors':[],'console_errors':[],'failures':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in [1280,375]:
        context=browser.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tokyo')
        page=context.new_page()
        page.on('pageerror',lambda e:result['page_errors'].append(str(e)))
        page.on('console',lambda m:result['console_errors'].append(m.text) if m.type=='error' else None)
        viewport={'width':width,'regions':{}}
        for region in ['wakayama','mie','toyama']:
            response=page.goto(args.base_url+'/events/'+region,wait_until='networkidle',timeout=120000)
            assert response.status==200,(region,response.status)
            page.locator('[data-event-card]:visible').first.wait_for(timeout=30000)
            seen={};pages=0
            while True:
                pages+=1
                cards=page.locator('[data-event-card]:visible').evaluate_all("els=>els.map(el=>({id:el.dataset.eventId,title:el.querySelector('h2').innerText,text:el.innerText,urls:[...el.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))}))")
                for card in cards:
                    event=by_id.get(card['id'])
                    if event and (event['end_date']<'2026-11-01' or event['status'] not in ['scheduled','ongoing']): result['failures'].append({'region':region,'id':card['id'],'error':'ended_or_hidden_card_visible'})
                    if card['id'] in added:
                        for field in ['title','date_label','time_label','price_label','reservation_label','age_label']:
                            if added[card['id']].get(field) and norm(added[card['id']][field]) not in norm(card['text']): result['failures'].append({'id':card['id'],'field':field,'error':'card_field_missing'})
                        if added[card['id']]['official_url'] not in card['urls']: result['failures'].append({'id':card['id'],'error':'official_url_missing'})
                    seen[card['id']]=card
                dimensions=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')
                if dimensions['scroll']>width: result['failures'].append({'region':region,'page':pages,'width':width,'error':'horizontal_overflow','dimensions':dimensions})
                next_button=page.locator('[data-page-action="next"]')
                if next_button.count()==0 or next_button.is_disabled(): break
                old=page.locator('[data-event-page]').inner_text()
                next_button.click()
                page.wait_for_function('(old)=>document.querySelector("[data-event-page]").innerText!==old',arg=old)
            expected={i for i,e in added.items() if e['prefecture']==region}
            missing=sorted(expected-set(seen))
            if missing: result['failures'].append({'region':region,'error':'added_cards_missing','ids':missing})
            viewport['regions'][region]={'http_status':response.status,'pages':pages,'visible_cards':len(seen),'added_expected':len(expected),'added_present':len(expected-set(missing)),'cards':seen}
            print('BROWSER',width,region,pages,len(seen),'added',len(expected-set(missing)),'/',len(expected),flush=True)
        result['viewports'].append(viewport)
        context.close()
    browser.close()
result['blocking']=len(result['failures'])+len(result['page_errors'])+len(result['console_errors'])
result['result']='GREEN' if result['blocking']==0 else 'BLOCKING'
pathlib.Path(args.output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('BROWSER_RESULT',result['result'],'blocking',result['blocking'],result['failures'][:8],result['page_errors'],result['console_errors'][:8],flush=True)
assert result['blocking']==0
