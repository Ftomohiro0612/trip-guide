import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root='docs/reviews/MEM-ACT-001';
const before=JSON.parse(fs.readFileSync(`${root}/before/metrics.json`));
const after=JSON.parse(fs.readFileSync(`${root}/after/metrics.json`));
const seo=[];
const bag=(items)=>items.reduce((map,item)=>map.set(item,(map.get(item)||0)+1),new Map());
for(const b of before){
 const a=after.find(x=>x.route===b.route);
 assert.ok(a);
 if(b.route!=='/try'){
  assert.ok(a.links.length>=b.links.length);
  const oldLinks=bag(b.links.map(x=>x.href)),newLinks=bag(a.links.map(x=>x.href));
  for(const [href,count] of oldLinks)assert.ok(newLinks.get(href)>=count,`Missing link: ${b.route} ${href}`);
  const oldCounts=bag(b.counts),newCounts=bag(a.counts);
  for(const [label,count] of oldCounts)assert.ok(newCounts.get(label)>=count,`Counts: ${b.route} ${label}`);
 }
 if(!['/try','/about'].includes(b.route)){
  assert.equal(a.title,b.title);
  assert.equal(a.description,b.description);
  assert.equal(a.canonical,b.canonical);
  assert.deepEqual(a.jsonLd,b.jsonLd);
 }
 seo.push({route:b.route,linksBefore:b.links.length,linksAfter:a.links.length,countLabelsBefore:b.counts.length,countLabelsAfter:a.counts.length,jsonLdBefore:b.jsonLd.length,jsonLdAfter:a.jsonLd.length,heightBefore:b.height,heightAfter:a.height});
}
const sitemap=[];
for(const file of ['sitemap.xml','sitemap-0.xml','sitemap-1.xml']){
 const baseline=execFileSync('git',['show',`183801e8:public/${file}`],{encoding:'utf8',maxBuffer:20*1024*1024});
 const current=fs.readFileSync(`public/${file}`,'utf8');
 const urls=text=>[...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]).sort();
 assert.deepEqual(urls(current),urls(baseline));
 sitemap.push({file,before:urls(baseline).length,after:urls(current).length,urlSetEqual:true});
}
fs.writeFileSync(`${root}/comparison.json`,JSON.stringify({seo,sitemap},null,2));
console.log(JSON.stringify({seo,sitemap},null,2));
