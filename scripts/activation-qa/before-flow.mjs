import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(process.env.TEMP,'memorips-activation-qa-20260916','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Tokyo'});
const results={};
page.on('pageerror',e=>console.log('BROWSER ERROR',e.message));
const base=process.env.QA_BASE || 'http://localhost:3100';
for(const [name,url,text] of [['facility','/','✓ 行ったことを記録'],['event','/events/tokyo','このイベントを記録']]) {
 await page.goto(base+url,{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('button',{name:text,exact:true}).first().click();
 await page.waitForURL('**/auth/login**');
 results[name]=page.url();
 await page.addStyleTag({content:'nextjs-portal { display:none!important; }'});
 await page.screenshot({path:`docs/reviews/MEM-ACT-001/before/${name}-record-result.png`});
}
await page.goto(base+'/try',{waitUntil:'networkidle'});
const form=page.locator('form').last();
await form.getByRole('textbox',{name:'場所',exact:true}).fill('検証用のおでかけ');
await form.getByRole('textbox',{name:'今日のひとこと'}).fill('すべり台で遊んだ');
await form.getByRole('button',{name:'この日の思い出をつくる'}).click();
results.try=await form.locator('input[type=file]').evaluate(e=>({required:e.required,valid:e.validity.valid,message:e.validationMessage,date:document.querySelector('input[type=date]').value}));
fs.writeFileSync('docs/reviews/MEM-ACT-001/before/flow.json',JSON.stringify(results,null,2));
console.log(results);
await browser.close();
