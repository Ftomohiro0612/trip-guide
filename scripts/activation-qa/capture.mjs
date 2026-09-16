import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(path.join(process.env.TEMP, 'memorips-activation-qa-20260916', 'package.json'));
const { chromium } = require('playwright');
const phase = process.argv[2] || 'before';
const out = `docs/reviews/MEM-ACT-001/${phase}`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Tokyo'});
const base = process.env.QA_BASE || 'http://localhost:3100';
const routes = ['/', '/prefecture/tokyo','/category/park','/tag/free','/prefecture/tokyo/category/park','/facilities/facility-801','/events/tokyo','/about','/try'];
const results=[];
for (const route of routes) {
  const response = await page.goto(base+route,{waitUntil:'networkidle',timeout:120000});
  await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});
  const metrics=await page.evaluate(()=>({
    links:[...document.querySelectorAll('a[href]')].filter(a=>new URL(a.href).origin===location.origin).map(a=>({href:new URL(a.href).pathname+new URL(a.href).search,text:a.innerText})),
    counts:document.querySelector('main')?.innerText.match(/[\d,]+\s*(?:施設|件|都道府県)/g)||[],
    jsonLd:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),
    title:document.title, description:document.querySelector('meta[name="description"]')?.content,
    canonical:document.querySelector('link[rel="canonical"]')?.href,
    height:document.documentElement.scrollHeight,
    recordFlowTop:document.querySelector('#record-value-heading')?.getBoundingClientRect().top,
    mainKeywords:Object.fromEntries(['記録','思い出','好き'].map(word=>[word,(document.querySelector('main')?.innerText.split(word).length||1)-1])),
    ctas:[...document.querySelectorAll('a')].filter(a=>['登録なしで、思い出を1件つくる →','一覧から探す','イベントを探す'].some(label=>a.innerText.includes(label))).map(a=>({text:a.innerText,top:a.getBoundingClientRect().top,width:a.getBoundingClientRect().width,height:a.getBoundingClientRect().height,font:getComputedStyle(a).fontSize,weight:getComputedStyle(a).fontWeight}))
  }));
  results.push({route,status:response.status(),...metrics});
  const name=route==='/'?'home':route.slice(1).replaceAll('/','-');
  if (['/','/about','/try','/events/tokyo'].includes(route)) {
    await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
    await page.screenshot({path:`${out}/${name}-viewport.png`});
  }
  console.log(route,response.status(),metrics.links.length,metrics.height);
  fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(results,null,2));
}
const event=await page.goto(base+'/events/tokyo',{waitUntil:'networkidle'});
void event;
const eventHref=await page.locator('a[href^="/events/"]').evaluateAll(es=>es.map(e=>e.getAttribute('href')).find(h=>h.split('/').length>3)||null);
if(eventHref){
 await page.goto(base+eventHref,{waitUntil:'networkidle'});
 results.push({route:eventHref,...await page.evaluate(()=>({links:[...document.querySelectorAll('a[href]')].filter(a=>new URL(a.href).origin===location.origin).map(a=>({href:new URL(a.href).pathname,text:a.innerText})),counts:document.querySelector('main')?.innerText.match(/[\d,]+\s*(?:施設|件|都道府県)/g)||[],jsonLd:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href}))});
}
fs.writeFileSync(`${out}/metrics.json`,JSON.stringify(results,null,2));
await browser.close();
