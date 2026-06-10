import json

with open(r'c:\Users\tomo-\Documents\Memorip\data\facilities_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
facilities = data['facilities']

MANUAL_TAG_MAP = {
    '43': ['craft','experience'], '44': ['craft','experience'],
    '45': ['craft','experience'], '46': ['craft','experience'],
    '50': ['experience','food','nature'],
    '90': ['craft','experience'], '91': ['craft','experience'],
    '92': ['craft','experience'], '93': ['craft','experience'],
    '94': ['craft','experience'], '95': ['craft','experience'],
    '96': ['craft','experience'],
    '97': ['experience','food','nature'], '98': ['experience','food','nature'],
    '135': ['playground','nature','science'],
    '141': ['craft','experience'], '142': ['craft','experience'],
    '143': ['craft','experience'], '144': ['craft','experience'],
    '145': ['craft','experience'], '146': ['craft','experience'],
    '150': ['experience','food','nature'], '151': ['experience','food','nature'],
    '217': ['playground','character'],
    '223': ['playground','character'],
    '343': ['playground','character'],
    '434': ['craft','experience'],
    '525': ['craft','experience','food'],
    '921': ['craft','exhibition'],
    '922': ['craft','experience'],
    '923': ['craft','experience'],
    '406': ['food','experience','nature'],
    '384': ['experience'],
    '556': ['experience','food'],
    '632': ['experience','food'],
    '838': ['experience'],
    '985': ['experience'],
    '986': ['experience'],
    '1019': ['experience','food'],
    '1035': ['experience','food'],
}
MANUAL_WEB_CHECK_IDS = {'135','217','223','343','384','556','632','838','985','986','1019','1035'}
MANUAL_LOW_CONFIDENCE_IDS = {'384','556','632','838','985','986','1019','1035'}

# pool をwater_playの直後に追加
PRIORITY = ['animal','animal_contact','animal_feed','water_play','pool','playground',
            'athletic','slide','running','wide_space','vehicle','craft',
            'experience','exhibition','science','dinosaur','character','nature','food']

POOL_KEYWORDS       = ['プール', '温水プール', '流れるプール', '幼児用プール', 'スライダー']
WATER_PLAY_KEYWORDS = ['じゃぶじゃぶ', 'ジャブジャブ', '水遊び場', '噴水', '親水', '水辺遊び', '水上遊具', '川遊び', '海水浴', '水あそび']
WATER_NATURAL_KWORDS= ['川遊び', '海水浴', '親水']

def has(text, keywords):
    return any(k in text for k in keywords) if text else False

def build_reason(tags, cat_name):
    label_map = {
        'animal':'動物が好きな子', 'animal_contact':'動物とふれあいたい子',
        'animal_feed':'動物にエサをあげたい子',
        'water_play':'水遊び（じゃぶじゃぶ・噴水等）が好きな子',
        'pool':'プールが好きな子',
        'playground':'遊具で遊ぶのが好きな子',
        'athletic':'アスレチック・体を動かすのが好きな子',
        'slide':'長いすべり台が好きな子', 'running':'走り回りたい子',
        'wide_space':'広い場所が好きな子', 'vehicle':'乗り物が好きな子',
        'craft':'工作・ものづくりが好きな子', 'experience':'体験・農業などに興味がある子',
        'exhibition':'展示・見学を楽しみたい子', 'science':'科学・実験が好きな子',
        'dinosaur':'恐竜が好きな子', 'character':'キャラクターが好きな子',
        'nature':'自然が好きな子', 'food':'食べ物・収穫体験に興味がある子',
    }
    if not tags:
        return f'{cat_name}に興味がある子におすすめ'
    return f"{label_map.get(tags[0], tags[0])}におすすめ"

def tag_facility(f):
    cat      = f.get('category_id','')
    cat_name = f.get('category','')
    desc     = f.get('description','') or ''
    name     = f.get('name','') or ''
    sig      = ' '.join(f.get('signature_experiences',[]) or [])
    exp_tags = ' '.join(f.get('experience_tags',[]) or [])
    usp      = f.get('unique_selling_point','') or ''
    tags_raw = ' '.join(f.get('tags',[]) or [])
    water_flag = f.get('summer_water_play','') or ''
    age      = f.get('target_age','') or ''
    fid      = str(f.get('id',''))
    # name を除いた本文テキスト（施設名からの誤マッチを防ぐ）
    body_text = ' '.join([desc, sig, exp_tags, usp, tags_raw])
    all_text  = ' '.join([desc, name, sig, exp_tags, usp, tags_raw])

    rec = set()
    web_reasons = []
    hr_reasons  = []
    confidence  = 'high'

    # --- 手動補完施設 ---
    if fid in MANUAL_TAG_MAP:
        rec = set(MANUAL_TAG_MAP[fid])
        if fid in MANUAL_LOW_CONFIDENCE_IDS:
            confidence = 'low'
            web_reasons.append('温泉・銭湯系: 子ども向け遊び場としての内容確認必須')
        else:
            confidence = 'medium'
        if fid in MANUAL_WEB_CHECK_IDS and fid not in MANUAL_LOW_CONFIDENCE_IDS:
            web_reasons.append('施設内容が多様なため内容確認推奨')
    else:
        # --- カテゴリ別タグ ---
        if cat in ('theme-park','indoor-theme-park'):
            rec.add('playground')
            if has(all_text, ['乗り物','ジェットコースター','観覧車','ゴーカート','SL','電車','船','ロープウェイ','モノレール','トロッコ']):
                rec.add('vehicle')
            if has(all_text, ['アスレチック','クライミング','ジップ','ボルダリング','トランポリン']):
                rec.add('athletic')
            if has(all_text, ['広大','広々','広い敷地','大自然','山の中','森の中']):
                rec.add('wide_space')
            if has(all_text, ['キャラクター','ミッキー','ドラえもん','ちびまる子','プリキュア','仮面ライダー','ウルトラマン','ポケモン','アンパンマン','シルバニア','トーマス','ハローキティ','サンリオ']):
                rec.add('character')
            if has(all_text, ['自然','森','山','公園']):
                rec.add('nature')
            web_reasons.append('テーマパーク系は施設規模・内容が多様なため確認推奨')
            confidence = 'medium'

        elif cat == 'zoo':
            rec.add('animal')
            if has(all_text, ['ふれあい','体感','触れ','なでる','だっこ','抱っこ','さわれる']):
                rec.add('animal_contact')
                web_reasons.append('animal_contact: ふれあい体験の公式確認推奨')
            if has(all_text, ['エサやり','えさやり','餌やり']):
                rec.add('animal_feed')
                web_reasons.append('animal_feed: エサやり体験の公式確認推奨')
            if has(all_text, ['広大','広々','広い','サファリ']):
                rec.add('wide_space')

        elif cat == 'aquarium':
            rec.add('animal')
            rec.add('exhibition')
            if has(all_text, ['ふれあい','触れ','タッチ','体感']):
                rec.add('animal_contact')
                web_reasons.append('animal_contact: タッチ・ふれあい体験の公式確認推奨')

        elif cat in ('nature-park','park'):
            rec.add('playground')
            if has(all_text, ['アスレチック','クライミング','ジップ','ターザン']):
                rec.add('athletic')
            if has(all_text, ['広大','広々','広い','大自然']):
                rec.add('wide_space')
            if has(all_text, ['自然','森','山','川','海','里山']):
                rec.add('nature')
            if has(all_text, ['すべり台','滑り台']) and has(all_text, ['大型','長い','ロング','巨大']):
                rec.add('slide')

        elif cat in ('scenic','viewpoint'):
            rec.add('nature')
            if has(all_text, ['展望','眺め','絶景','広大']):
                rec.add('wide_space')

        elif cat == 'indoor-play':
            rec.add('playground')
            if has(all_text, ['トランポリン']):
                rec.add('athletic')

        elif cat == 'museum':
            rec.add('exhibition')
            if has(all_text, ['科学','実験','プラネタリウム','宇宙','天文']):
                rec.add('science')
            if has(all_text, ['恐竜','ダイノ','化石']):
                rec.add('dinosaur')
                web_reasons.append('dinosaur: 恐竜展示の公式確認推奨')
            if has(all_text, ['工作','ものづくり','手作り','クラフト']):
                rec.add('craft')
            if has(all_text, ['乗り物','鉄道','電車','車','飛行機']):
                rec.add('vehicle')
            if has(all_text, ['キャラクター','アニメ','漫画']):
                rec.add('character')
                web_reasons.append('character: キャラクター展示の確認推奨')

        elif cat == 'science-museum':
            rec.add('exhibition')
            rec.add('science')
            if has(all_text, ['工作','ものづくり','手作り']):
                rec.add('craft')
            if has(all_text, ['恐竜','化石']):
                rec.add('dinosaur')
                web_reasons.append('dinosaur: 恐竜展示の確認推奨')

        elif cat == 'art-museum':
            rec.add('exhibition')
            if has(all_text, ['工作','ものづくり','手作り','クラフト','陶芸','アート体験']):
                rec.add('craft')
            if has(all_text, ['自然','森']):
                rec.add('nature')

        elif cat == 'experience':
            rec.add('experience')
            if has(all_text, ['工作','ガラス','陶芸','ものづくり','手作り','クラフト','染め','彫刻']):
                rec.add('craft')
            if has(all_text, ['農業','収穫','果物','野菜','いちご','みかん','ぶどう','りんご','味覚狩り','摘み取り']):
                rec.add('food')
                rec.add('nature')
            if has(all_text, ['自然','森','川','海','山','里山','アウトドア','キャンプ']):
                rec.add('nature')
            if has(all_text, ['動物','馬','牛','羊','ヤギ','豚','ウサギ','モルモット']):
                rec.add('animal')
                if has(all_text, ['ふれあい','触れ','なでる']):
                    rec.add('animal_contact')
                    web_reasons.append('animal_contact: ふれあい体験の公式確認推奨')
                if has(all_text, ['エサ','えさ','餌']):
                    rec.add('animal_feed')
                    web_reasons.append('animal_feed: エサやり体験の公式確認推奨')
            if has(age + all_text, ['身長','cm以上']) and '小学生' not in age:
                confidence = 'medium'
                web_reasons.append('年齢/身長制限の確認推奨')

        elif cat == 'fruit-picking':
            rec.add('food')
            rec.add('experience')
            rec.add('nature')
            confidence = 'medium'
            web_reasons.append('果物狩り: 季節・対象年齢の確認推奨')

        elif cat == 'athletic':
            rec.add('athletic')
            if has(all_text, ['森','自然','山','川']):
                rec.add('nature')
            if has(all_text, ['広い','広大']):
                rec.add('wide_space')
            if has(age + all_text, ['身長','cm以上']):
                confidence = 'medium'
                web_reasons.append('年齢/身長制限の確認推奨')

        elif cat == 'hot-spring-pool':
            # 手動補完に含まれない hot-spring-pool（水遊び設備が明記のもの）
            rec.add('experience')
            confidence = 'medium'
            web_reasons.append('温泉・プール系: 子ども向け水遊び設備の確認推奨')

        elif cat == 'craft':
            rec.add('craft')
            rec.add('experience')
            confidence = 'medium'
            web_reasons.append('クラフト体験: 対象年齢・内容の確認推奨')

        elif cat == 'ski':
            rec.add('nature')
            if has(all_text, ['そり','雪遊び','雪だるま']):
                rec.add('running')

        elif cat == 'hotel':
            confidence = 'low'
            web_reasons.append('ホテル系: 子ども向け施設としての確認必須')

        elif cat == 'game-center':
            confidence = 'low'
            web_reasons.append('ゲームセンター: 子ども向け施設としての確認推奨')

        else:
            confidence = 'low'
            web_reasons.append(f'不明カテゴリ({cat_name}): 手動確認推奨')

    # --- water_play / pool 付与（厳格化・name除外）---
    # body_text = desc + sig + exp_tags + usp + tags_raw（nameなし）

    has_pool       = has(body_text, POOL_KEYWORDS)
    has_water_play = has(body_text, WATER_PLAY_KEYWORDS)
    has_natural    = has(body_text, WATER_NATURAL_KWORDS)

    if has_pool:
        rec.add('pool')
        # descriptionにプールが明記 → needs_web_check は任意（ここでは追加しない）

    if has_water_play:
        rec.add('water_play')
        if has_natural:
            web_reasons.append('water_play: 自然系水遊び(川遊び/海水浴/親水)のため詳細確認推奨')

    # 施設名に「プール」が含まれる → pool 候補 + needs_web_check
    if 'プール' in name:
        rec.add('pool')
        web_reasons.append('施設名にプールとあるため pool 候補。ただし説明文・summer_water_play では設備詳細を確認できないため')

    # summer_water_play=◎/○ で water_play も pool も付かなかった場合 → needs_web_check
    if water_flag in ('◎','○') and 'water_play' not in rec and 'pool' not in rec:
        web_reasons.append('summer_water_play はあるが、水遊び設備の明記確認が必要')

    # タグ数を最大5に絞る
    sorted_tags = [t for t in PRIORITY if t in rec][:5]

    # confidence: low は強制で両フラグ ON
    if confidence == 'low':
        needs_web_check    = True
        needs_human_review = True
        hr_reasons.append('confidence: low のため人間確認必須')
    else:
        needs_web_check    = bool(web_reasons)
        needs_human_review = False

    return {
        'facility_id':            fid,
        'facility_slug':          f.get('slug',''),
        'facility_name':          name,
        'category':               cat_name,
        'prefecture':             f.get('prefecture',''),
        'recommended_for_tags':   sorted_tags,
        'recommended_age_range':  age if age else '確認が必要',
        'recommended_reason_short': build_reason(sorted_tags, cat_name),
        'confidence':             confidence,
        'needs_web_check':        needs_web_check,
        'web_check_reason':       '; '.join(web_reasons) if web_reasons else '',
        'web_check_status':       'pending' if needs_web_check else 'not_required',
        'needs_human_review':     needs_human_review,
        'human_review_reason':    '; '.join(hr_reasons) if hr_reasons else '',
    }

results = []
for f in facilities:
    try:
        results.append(tag_facility(f))
    except Exception as e:
        fid = str(f.get('id',''))
        results.append({
            'facility_id': fid, 'facility_slug': f.get('slug',''),
            'facility_name': f.get('name',''), 'category': f.get('category',''),
            'prefecture': f.get('prefecture',''),
            'recommended_for_tags': [],
            'recommended_age_range': '', 'recommended_reason_short': '',
            'confidence': 'low',
            'needs_web_check': True, 'web_check_reason': f'処理エラー: {e}',
            'web_check_status': 'pending',
            'needs_human_review': True, 'human_review_reason': f'処理エラー: {e}',
        })

web_check_list    = [r for r in results if r['needs_web_check']]
human_review_list = [r for r in results if r['needs_human_review']]
empty_tag_list    = [r for r in results if not r['recommended_for_tags']]

with open(r'c:\Users\tomo-\Documents\Memorip\.codex\all_tagged_facilities.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
with open(r'c:\Users\tomo-\Documents\Memorip\.codex\needs_web_check_facilities.json', 'w', encoding='utf-8') as f:
    json.dump(web_check_list, f, ensure_ascii=False, indent=2)
with open(r'c:\Users\tomo-\Documents\Memorip\.codex\needs_human_review_facilities.json', 'w', encoding='utf-8') as f:
    json.dump(human_review_list, f, ensure_ascii=False, indent=2)

from collections import Counter
tag_counter  = Counter(t for r in results for t in r['recommended_for_tags'])
conf_counter = Counter(r['confidence'] for r in results)

# facility_id=32 の確認
f32 = next((r for r in results if r['facility_id']=='32'), None)
print("=== facility_id=32 ===")
if f32:
    print(f"  tags: {f32['recommended_for_tags']}")
    print(f"  reason: {f32['recommended_reason_short']}")
    print(f"  confidence: {f32['confidence']}")
    print(f"  needs_web_check: {f32['needs_web_check']}")
    print(f"  web_check_reason: {f32['web_check_reason']}")

print(f"\n総件数:             {len(results)}")
print(f"空タグ件数:          {len(empty_tag_list)}")
if empty_tag_list:
    print(f"  空タグids: {[e['facility_id'] for e in empty_tag_list]}")
print(f"confidence分布:      {dict(conf_counter)}")
print(f"  low→needs_human_review=true: {sum(1 for r in results if r['confidence']=='low' and r['needs_human_review'])}")
print(f"water_play 件数:     {tag_counter['water_play']}")
print(f"pool 件数:           {tag_counter['pool']}")
print(f"needs_web_check:     {len(web_check_list)}")
print(f"needs_human_review:  {len(human_review_list)}")
print(f"\nタグ使用頻度 TOP12:")
for tag, cnt in tag_counter.most_common(12):
    print(f"  {tag}: {cnt}")
print("\n完了")
