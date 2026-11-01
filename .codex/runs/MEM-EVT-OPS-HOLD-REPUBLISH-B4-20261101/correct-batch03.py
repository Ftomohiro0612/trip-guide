remove={'evt-hold-b4-062','evt-hold-b4-070-1','evt-hold-b4-070-2'}
D['events']=[e for e in D['events'] if e['id'] not in remove]
for i in [62,63,70]: R.pop(str(i))
duplicate(62,'evt-w43-d11-tochigi-tochigi-akimatsuri','特設公式URL・2026年11月14日開始・蔵の街が既存の同じ祭りに一致。')
duplicate(63,'evt-w43-d11-tochigi-tochigi-akimatsuri','特設公式URL・2026年11月14日開始・蔵の街が既存の同じ祭りに一致。')
duplicate(70,['evt-tochigi-w40d6-mamettane','evt-6930-20260919-backyard','evt-hold-b4-006','evt-hold-b4-007'],'まめったね展9/12〜11/14、バックヤードの植物展9/19〜11/8は既存。ローズフェスタとハロウィンは先行候補6・7で追加済み。全4件の期間・とちぎ花センター会場・公式内容を照合。')
for i in [62,63,70]: R[str(i)]['correction']='Supplemental-source dedupe corrected before first branch checkpoint; own duplicate additions removed.'
progress=ROOT/'progress.jsonl'
rows=[json.loads(x) for x in progress.read_text(encoding='utf-8').splitlines()]
for r in rows:
    if r['index'] in [62,63,70]:
        actual=R[str(r['index'])]
        r['disposition']=actual['disposition']; r['reason']=actual['reason'];r['correction']=actual['correction']
progress.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows),encoding='utf-8')
