import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3000',appId='a7237d83-fe3b-4a97-a947-9ee67cf394df';
async function get(url){const r=await fetch(base+url);const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
async function post(url,body){const r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;}
const bank=await get(`/api/text-bank?appId=${appId}`),media=await get(`/api/assets?appId=${appId}`);
const hooks=media.assets.filter(a=>a.type==='video'&&/\/hooks?\s*\//i.test(a.sourceKey||'')).sort((a,b)=>a.duration-b.duration),demos=media.assets.filter(a=>a.type==='video'&&/\/demo\s*\//i.test(a.sourceKey||'')).sort((a,b)=>a.duration-b.duration);
const plans=await post('/api/hook-videos',{appId,texts:bank.hooks,hookAssetIds:hooks.slice(0,2).map(a=>a.id),demoAssetIds:[demos[0].id],count:2,audio:'original'});assert.equal(plans.length,2);assert.notEqual(plans[0].plan.clips[0].assetId,plans[1].plan.clips[0].assetId);
for(const p of plans)for(const c of p.plan.clips){assert.equal(c.trimStart,0);assert.equal(c.duration,media.assets.find(a=>a.id===c.assetId).duration);}
const hook=await post(`/api/hook-videos/${plans[0].id}/render`,{});console.log({hook:hook.id,path:hook.renderPath,fullDuration:hook.plan.clips.reduce((n,c)=>n+c.duration,0)});
const {sets}=await get(`/api/template-sets?appId=${appId}`),set=sets.find(s=>s.slides.length===3);const [template]=await post('/api/template-videos',{appId,templateKeys:[set.key],caption:'Your next photo dump could look like this',ctaEnabled:true,ctaText:'Grab this template on Panoslice',hold:1});assert.ok(template.plan.cta.assetId);assert.equal(new Set(template.plan.clips.map(c=>c.caption)).size,1);
const swipe=await post(`/api/template-videos/${template.id}/render`,{});console.log({swipe:swipe.id,path:swipe.renderPath,headline:swipe.plan.headline,cta:swipe.plan.cta.text});await writeFile('/tmp/forge-simple-video.json',JSON.stringify({hook,swipe}));
