ids=[]
for n,s,en,v,name,off in [('1','2026-11-02','2026-11-16','高知県立春野総合運動公園野球場','中日ドラゴンズ',['2026-11-05','2026-11-09','2026-11-13']),('2','2026-11-01','2026-11-18','安芸タイガース球場','阪神タイガース',['2026-11-05','2026-11-09','2026-11-13'])]:
 eid=event(176,s,en,v,'プロ野球秋季キャンプ。日程や休日は変更の場合あり、各球団公式の最新情報で確認。',title='2026プロ野球秋季キャンプ '+name,suffix='-'+n,url='https://kochi-tabi.jp/corp/information.html?id=132');ids.append(eid)
 from datetime import date,timedelta
 D['events'][-1]['occurrence_dates']=[(date.fromisoformat(s)+timedelta(days=k)).isoformat() for k in range((date.fromisoformat(en)-date.fromisoformat(s)).days+1) if (date.fromisoformat(s)+timedelta(days=k)).isoformat() not in off]
added(176,ids,reason='オリックス分は118と重複。別会場の中日・阪神キャンプのみ追加。')
duplicate(177,'evt-hold-b4-131','同一期間、同一とさのさと会場の豊穣祭。')
duplicate(178,'evt-hold-b4-135','同一11/1四万十緑林公園の米こめフェスタ。')
added(179,event(179,'2026-11-03','2026-11-03','三原村農業構造改善センター','地域の食や農林産物、芸人ライブ、餅投げを楽しむ農林文化祭。酒の企画は20歳以上のみ。',time='9:00～15:00',price='入場無料、飲食等別途',free=True,age='飲酒は20歳以上。家族では食・ステージ・餅投げを楽しむ'))
duplicate(180,'evt-hold-b4-120','同じ中央公園・11/7～8の本祭。前夜祭11/6は夜の酒企画のため別追加しない。')
duplicate(181,'evt-hold-b4-153','同じ11/23、椙本神社～商店街のkami祭。')
ids=[]
for n,s,name in [('3','2026-11-22','脱穀＆そば打ち'),('4','2026-12-20','年越しそば＆門松づくり')]:ids.append(event(182,s,s,'汗見川ふれあいの郷清流館（本山町沢ケ内626）','地元名人に教わるそば打ちと里山の体験。',time='10:00～14:00（集合9:30）',title='汗見川そばの収穫祭 第'+n+'回 '+name,suffix='-'+n,url='https://www.tosa-hojyosai.com/kanren.html'))
added(182,ids,participability='条件付き参加可能')
duplicate(183,'evt-hold-b4-130','同じ10/31～11/3の開園35周年記念イベント。')
added(184,event(184,'2026-11-03','2026-11-03','山北イベント広場','山北みかんや飲食・雑貨、ダンスのステージを楽しむ。',time='10:00～15:00'))
added(185,event(185,'2026-11-03','2026-11-03','大月町総合グラウンド','マグロや地場産品、お魚つかみどり、吹奏楽・よさこいなど家族向け産業祭。',time='9:00～14:00'))
added(186,event(186,'2026-11-07','2026-11-08','宮の前公園（越知町越知丙734-1）','食や雑貨、カヌー体験、自然を使った子どもの遊び広場を楽しむ。',time='10:00～15:00'))
added(187,event(187,'2026-11-07','2026-11-07','なめかわの郷（本山町下関122）','四方竹のお寿司やお惣菜の販売、地元もち米で餅つき大会。屋内の席で味わえる。',time='10:00～14:00',weather='屋内開催・雨天決行。',indoor=True))
added(188,event(188,'2026-11-08','2026-11-08','グリーン・パークほどの お祭り広場','自然の中で職業体験や職業車への乗車、ワークショップや地元グルメを楽しむ子ども向け催し。',time='10:00～16:00（予定）',dates='2026/11/8（予定）'))
added(189,event(189,'2026-11-20','2026-11-22','砂浜美術館・入野松原（雨天時ふるさと総合センター）','松原に色とりどりのキルトがそよぐ、秋の砂浜美術館の展覧会。',time='10:00～15:00',price='中学生以上は協力金300円',free=False,age='中学生以上は協力金あり',weather='雨天時はふるさと総合センターへ会場変更。'))
added(190,event(190,'2026-12-05','2026-12-05','西町・旧県合同庁舎跡地前広場（越漁港）','地元食材、手作り小物、果樹苗木や刃物の販売と宗田節まつりを同時開催。',time='9:30～15:00'))
added(191,event(191,'2026-12-11','2026-12-25','東洋電化中央公園','クリスマス装飾やステージ、地元食材を使った限定メニュー、雑貨を楽しむマーケット。',time='平日17:00～21:30、土日・12/25は11:00～21:30。点灯17:00'))
added(192,event(192,'2026-12-19','2026-12-19','いの町役場1階 いのホール','町の食べ物や雑貨、子どもへのサンタのプレゼントを楽しむクリスマスマーケット。',time='15:00～20:00（予定）',dates='2026/12/19（予定）'))
for i in range(193,201):duplicate(i,'evt-hold-b4-131','同じとさのさと豊穣祭の期間内・同会場の内包催し。親イベント131の対象に含め、二重追加しない。')
# Fresh official series pages clarify fees for our own already-created records.
for idx,fieldvals in [(131,dict(price_label='入場無料、飲食等別途',is_free=True)),(135,dict(price_label='入場無料、飲食等別途',is_free=True)),(153,dict(price_label='入場無料、飲食等別途',is_free=True))]:
 e=next(e for e in D['events'] if e['id']==f'evt-hold-b4-{idx:03d}')
 srcidx={131:177,135:178,153:181}[idx]
 fs=json.loads((ROOT/'fetches'/f'{srcidx:03d}.json').read_text(encoding='utf-8'))[0]
 e.update(fieldvals);e['source_urls'].append(fs['final_url']);e['source_notes']=e['source_notes'].replace('料金、','').replace('料金。','')+' 同Missionの公式豊穣祭ページで入場無料も確認。'
 R[str(idx)]['sources_checked'].append({k:fs.get(k) for k in ['url','final_url','http_status','checked_at','sha256']})
