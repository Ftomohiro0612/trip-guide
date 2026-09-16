import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.join(process.env.TEMP,'memorips-activation-qa-20260916','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch();
const base=process.env.QA_BASE||'http://localhost:3100';
const out='docs/reviews/MEM-ACT-001/after';
fs.mkdirSync(out,{recursive:true});
const evidence={environment:{viewport:'390x844',timezone:'Asia/Tokyo',auth:'Local synthetic Supabase fixture; no Production account or writes'},consumers:[],flows:[],errors:[]};
const options={viewport:{width:390,height:844},timezoneId:'Asia/Tokyo'};
const canon=JSON.parse(fs.readFileSync('data/facilities_data.json','utf8')).facilities;
const guest=await browser.newContext(options);
const signed=await browser.newContext(options);
const now=Math.floor(Date.now()/1000);
const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'activation-test@example.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-09-16T00:00:00Z'};
const token=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:now+3600,iat:now,aud:'authenticated',role:'authenticated'},'local-test-signature'].map((x,i)=>i===2?x:Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
const session={access_token:token,refresh_token:'local-test-refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};
async function authenticate(context){await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),url:base,httpOnly:false,sameSite:'Lax'}]);}
await authenticate(signed);
const page=await guest.newPage();
const logged=await signed.newPage();
for(const p of [page,logged]) p.on('pageerror',e=>evidence.errors.push(e.message));
async function go(p,route){await p.goto(base+route,{waitUntil:'networkidle',timeout:120000});}
async function shot(p,name){await p.screenshot({path:`${out}/${name}.png`});}
async function finishRecord(p,label,takeShots=false){
 const dialog=p.getByRole('dialog');
 await dialog.waitFor();
 const submit=dialog.getByRole('button',{name:'この日の思い出をつくる'});
 const states=[await submit.isDisabled()];
 const date=await dialog.locator('input[type=date]').inputValue();
 const expected=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 assert.equal(date,expected);
 const photo=await dialog.locator('input[type=file]').evaluate(e=>({required:e.required,valid:e.validity.valid,message:e.validationMessage,files:e.files.length}));
 assert.deepEqual(photo,{required:false,valid:true,message:'',files:0});
 if(takeShots) await shot(p,`${label}-form-top`);
 await dialog.getByRole('textbox',{name:'今日のひとこと（必須）'}).fill('何度も遊んで、帰る前にもう1回！');
 states.push(await submit.isDisabled());
 const tag=dialog.locator('fieldset').first().getByRole('button').first();
 const tagLabel=await tag.innerText();
 await tag.click();
 states.push(await submit.isDisabled());
 assert.deepEqual(states,[true,true,false]);
 assert.equal(await dialog.locator('form').evaluate(e=>e.checkValidity()),true);
 if(takeShots) {await submit.scrollIntoViewIfNeeded();await shot(p,`${label}-form-tags`);}
 await submit.click();
 await dialog.getByRole('heading',{name:'思い出が1枚できました'}).waitFor();
 const recSection=dialog.locator('section').filter({hasText:'NEXT OUTING'});
 const recommendations=await recSection.getByRole('link').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),text:e.innerText})));
 assert.equal(recommendations.length,3);
 const draft=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('memorip:guest-record-draft')));
 assert.equal(draft.interestTagIds.length,1);
 assert.equal(draft.visitedOn,date);
 assert.equal(draft.note,'何度も遊んで、帰る前にもう1回！');
 for(const rec of recommendations){
  const actual=canon.find(f=>`/facilities/${f.slug}`===rec.href);
  assert.ok(actual,`Recommendation must be real: ${rec.href}`);
  assert.ok(actual.recommended_for_tags.includes(draft.interestTagIds[0]),'Recommendation must match selected reaction tag');
  assert.notEqual(actual.slug,draft.facilitySlug);
 }
 const register=dialog.getByRole('link',{name:'このカードを保存するために登録'});
 const registerHref=await register.getAttribute('href');
 const loginHref=await dialog.getByRole('link',{name:'アカウントをお持ちの方はログイン'}).getAttribute('href');
 assert.ok(new URL(registerHref,base).searchParams.get('redirectTo').includes('guestDraft=1'));
 assert.ok(new URL(loginHref,base).searchParams.get('redirectTo').includes('guestDraft=1'));
 assert.equal(await dialog.getByText('写真以外の入力は、このタブで登録・ログイン後の保存画面へ引き継ぎます。').count(),1);
 if(takeShots) {
  await dialog.evaluate(e=>e.scrollTop=0);await shot(p,`${label}-complete`);
  await recSection.scrollIntoViewIfNeeded();await shot(p,`${label}-recommendations`);
  await register.scrollIntoViewIfNeeded();await shot(p,`${label}-save`);
 }
 const result={label,url:new URL(p.url()).pathname+new URL(p.url()).search,date,photo,disabledStages:states,tagLabel,draft,recommendations,registerHref,loginHref};
 evidence.flows.push(result);
 return result;
}
const routes=[
 ['app/page.tsx','/'],
 ['app/category/[id]/page.tsx','/category/park'],
 ['app/tag/[slug]/page.tsx','/tag/free'],
 ['app/prefecture/[id]/category/[categoryId]/page.tsx','/prefecture/tokyo/category/park'],
 ['app/facilities/[slug]/page.tsx (related card)','/facilities/facility-801'],
 ['components/NearbyFilterableFacilityList.tsx','/facilities'],
 ['components/PrefectureDiscoveryFacilityList.tsx','/prefecture/tokyo'],
];
try {
 await go(page,'/');
 const primary=page.getByRole('link',{name:'登録なしで、思い出を1件つくる →',exact:true});
 evidence.primaryCta=await primary.evaluate(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight}));
 assert.ok(evidence.primaryCta.top+evidence.primaryCta.height<844);
 assert.equal(await page.getByText('画面イメージ・件数や内容はサンプルです',{exact:true}).count(),1);
 await primary.click();await page.waitForURL('**/try');
 await go(page,'/');
 const cycle=page.locator('section[aria-labelledby="record-value-heading"]');
 await cycle.getByRole('link',{name:'登録なしで、記録をはじめる →',exact:true}).click();
 await page.waitForURL('**/try');
 evidence.cycleCta='clicked → /try';
 await go(page,'/about');
 const about=await page.locator('#main-content').innerText();
 for(const phrase of ['記録','思い出','好き','掲載エリア','情報の正確性について','運営','合同会社F&IC','5953'])assert.ok(about.includes(phrase),phrase);
 evidence.about='positioning and all required original facts visible';
 for(const [consumer,route] of routes){
  await go(page,route);
  const card=page.locator('article').filter({has:page.getByRole('button',{name:'✓ 行ったことを記録',exact:true})}).first();
  const target=await card.locator('a[href^="/facilities/"]').first().getAttribute('href');
  await card.getByRole('button',{name:'✓ 行ったことを記録',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  assert.equal(new URL(page.url()).pathname,target);
  const flow=await finishRecord(page,consumer==='app/page.tsx'?'home-record':`consumer-${evidence.consumers.length}`,consumer==='app/page.tsx');
  await go(page,route);
  await page.getByRole('button',{name:'♡ 行きたい',exact:true}).first().click();
  await page.waitForURL('**/auth/login**');
  const guestWishlist=new URL(page.url()).pathname;
  await go(logged,route);
  const record=logged.getByRole('button',{name:'✓ 行ったことを記録',exact:true}).first();
  await record.click();
  await logged.waitForURL('**/mypage/visits/new?**');
  const authenticatedDestination=new URL(logged.url()).pathname+new URL(logged.url()).search;
  assert.equal(new URL(logged.url()).searchParams.get('facility'),target.split('/').pop());
  assert.equal(await logged.getByRole('dialog').count(),0);
  await go(logged,route);
  await logged.getByRole('button',{name:'♡ 行きたい',exact:true}).first().click();
  await logged.getByRole('button',{name:'♥ 行きたい済み',exact:true}).first().waitFor();
  await logged.getByRole('button',{name:'♥ 行きたい済み',exact:true}).first().click();
  await logged.getByRole('button',{name:'♡ 行きたい',exact:true}).first().waitFor();
  evidence.consumers.push({consumer,route,guest:'record modal → complete',recommendations:flow.recommendations.length,guestWishlist,authenticatedDestination,authenticatedWishlist:'add → selected → remove → unselected'});
  console.log('PASS',consumer);
 }
 await go(page,'/facilities/facility-801');
 await page.getByRole('button',{name:'この場所を記録する',exact:true}).first().click();
 await finishRecord(page,'facility-detail');
 await go(logged,'/facilities/facility-801');
 await logged.getByRole('button',{name:'この場所を記録する',exact:true}).first().click();
 await logged.waitForURL('**/mypage/visits/new?**');
 evidence.consumers.push({consumer:'components/FacilityActionButtons.tsx',guest:'in-place modal → complete, 3 recommendations',authenticatedDestination:new URL(logged.url()).pathname+new URL(logged.url()).search});
 await go(page,'/facilities/facility-801');
 await page.getByRole('button',{name:'行きたいに追加',exact:true}).first().click();
 await page.waitForURL('**/auth/login**');
 await go(logged,'/facilities/facility-801');
 await logged.getByRole('button',{name:'行きたいに追加',exact:true}).first().click();
 await logged.getByRole('button',{name:'行きたいリスト済み',exact:true}).first().waitFor();
 await logged.getByRole('button',{name:'行きたいリスト済み',exact:true}).first().click();
 await logged.getByRole('button',{name:'行きたいに追加',exact:true}).first().waitFor();
 evidence.consumers.at(-1).wishlist='guest → login; authenticated → add/remove';
 for(const p of [page,logged]){
  await go(p,'/events/tokyo');
  const button=p.getByRole('button',{name:/このイベントを記録/}).first();
  const label=await button.innerText();
  if(p===page){assert.ok(label.includes('無料登録・ログインが必要'));await button.scrollIntoViewIfNeeded();await shot(p,'event-record-label');}
  await button.click();
  await p.waitForURL(p===page?'**/auth/login**':'**/mypage/visits/new?event=**');
  evidence.consumers.push({consumer:'components/EventRecordButton.tsx',state:p===page?'guest':'authenticated',label,destination:new URL(p.url()).pathname+new URL(p.url()).search});
 }
 for(const entry of ['home','try']){
  await go(page,entry==='home'?'/':'/try');
  if(entry==='home') await page.getByRole('button',{name:'✓ 行ったことを記録',exact:true}).first().click();
  else {
   assert.equal(await page.getByRole('heading',{name:'記録のサンプル（架空の入力例）'}).count(),1);
   await page.getByRole('button',{name:/ここでの思い出を記録/}).first().click();
  }
  const flow=await finishRecord(page,`${entry}-handoff`,entry==='try');
  await page.getByRole('dialog').getByRole('link',{name:'このカードを保存するために登録'}).click();
  await page.waitForURL('**/auth/register**');
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('memorip:guest-record-draft')));
  assert.deepEqual(stored,flow.draft);
  const dest=new URL(page.url()).searchParams.get('redirectTo');
  await authenticate(guest);
  await go(page,dest);
  await page.getByText('思い出カードの内容を引き継ぎました',{exact:true}).waitFor();
  assert.ok((await page.locator('#main-content').innerText()).includes(flow.draft.note));
  const banner=page.locator('section').filter({hasText:'思い出カードの内容を引き継ぎました'});
  assert.ok((await banner.innerText()).includes(flow.draft.visitedOn));
  await banner.scrollIntoViewIfNeeded();await shot(page,`${entry}-restored`);
  flow.restoredBanner=await banner.innerText();
  await guest.clearCookies();
 }
 await go(page,'/mypage/visits/from-photo');
 assert.equal(new URL(page.url()).pathname,'/auth/login');
 await go(logged,'/mypage/visits/from-photo');
 await logged.getByRole('heading',{name:'写真からおでかけ記録を作る'}).waitFor();
 await logged.locator('input[type=file]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
 await logged.getByText('撮影日なし: 今日を仮入力',{exact:true}).first().waitFor();
 await logged.getByPlaceholder('施設名を検索').fill('ソレイユ');
 await logged.getByRole('button',{name:/長井海の手公園 ソレイユの丘/}).click();
 await logged.getByText('選択中',{exact:true}).waitFor();
 evidence.consumers.push({consumer:'app/mypage/visits/from-photo/FromPhotoVisitDraftsClient.tsx',note:'No FacilityCard import/render: independent selection UI',guest:'middleware → /auth/login',authenticated:'photo chooser → synthetic image → search ソレイユ → selected facility (no upload/save)'});
 for(let index=1;index<6;index++){
  await go(page,'/');
  await page.getByRole('button',{name:'✓ 行ったことを記録',exact:true}).nth(index).click();
  await finishRecord(page,`home-card-${index+1}`);
 }
 console.log('PASS all flows');
} catch(error) {
 evidence.failure=error.stack;
 await shot(page,'failure-guest');await shot(logged,'failure-auth');
 console.error(error);
 process.exitCode=1;
} finally {
 fs.writeFileSync(`${out}/activation.json`,JSON.stringify(evidence,null,2));
 await browser.close();
}
