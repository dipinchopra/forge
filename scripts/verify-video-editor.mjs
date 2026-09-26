import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3000',appId='a7237d83-fe3b-4a97-a947-9ee67cf394df';
async function request(url,body,method='POST'){
 const r=await fetch(base+url,body===undefined?{}:{method,headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});
 const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;
}
async function playback(endpoint,id){
 const url=`${base}/api/${endpoint}/${id}/download`;
 const head=await fetch(url,{method:'HEAD'});assert.equal(head.status,200);const size=Number(head.headers.get('content-length'));assert.ok(size>1000);assert.equal(head.headers.get('accept-ranges'),'bytes');
 for(const [range,length] of [['bytes=0-1',2],['bytes=-128',128],['bytes=100-199',100]]){const r=await fetch(url,{headers:{Range:range}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,length);assert.ok(r.headers.get('content-range'));}
 const invalid=await fetch(url,{headers:{Range:`bytes=${size}-`}});assert.equal(invalid.status,416);
 console.log(`${endpoint}: HEAD, start/suffix/seek ranges and invalid-range checks passed (${size} bytes)`);
}
const {sets}=await request(`/api/template-sets?appId=${appId}`),bank=await request(`/api/text-bank?appId=${appId}`),{assets}=await request(`/api/assets?appId=${appId}`);
assert.ok(sets.length>12);console.log(`All ${sets.length} template folders returned`);
const set=sets.find(s=>s.slides.length===3)||sets[0];
const variants=await request('/api/template-videos',{appId,templateKeys:[set.key],variations:2,hold:1,ctaEnabled:true});
assert.equal(variants.length,2);assert.notEqual(variants[0].plan.headline,variants[1].plan.headline);
for(const v of variants){assert.ok(bank.hooks.includes(v.plan.headline));assert.deepEqual(v.plan.clips.map(c=>c.assetId),set.slides);}
let swipe=variants[0];swipe=await request(`/api/template-videos/${swipe.id}`,{...swipe.plan,textY:0.45,cta:{...swipe.plan.cta,textY:0.65,downloadY:0.18}},'PUT');assert.equal(swipe.plan.textY,0.45);assert.equal(swipe.plan.cta.textY,0.65);assert.equal(swipe.plan.cta.downloadY,0.18);
swipe=await request(`/api/template-videos/${swipe.id}/render`,{});assert.equal(swipe.status,'ready');await playback('template-videos',swipe.id);
const hooks=assets.filter(a=>a.type==='video'&&/\/hooks?\s*\//i.test(a.sourceKey||'')).sort((a,b)=>a.duration-b.duration),demos=assets.filter(a=>a.type==='video'&&/\/demo\s*\//i.test(a.sourceKey||'')).sort((a,b)=>a.duration-b.duration);
let [hook]=await request('/api/hook-videos',{appId,count:1,texts:bank.hooks,hookAssetIds:[hooks[0].id],demoAssetIds:[demos[0].id],audio:'original'});
hook=await request(`/api/hook-videos/${hook.id}`,{...hook.plan,textY:0.7,clips:hook.plan.clips.map((c,i)=>({...c,assetId:(i?demos[1]:hooks[1]).id,duration:(i?demos[1]:hooks[1]).duration,text:i?'':bank.hooks[1]}))},'PUT');
assert.equal(hook.plan.clips[0].assetId,hooks[1].id);assert.equal(hook.plan.clips[1].assetId,demos[1].id);assert.equal(hook.plan.textY,0.7);
hook=await request(`/api/hook-videos/${hook.id}/render`,{});await playback('hook-videos',hook.id);
const old=hook.renderPath;hook=await request(`/api/hook-videos/${hook.id}/render`,{});assert.notEqual(old,hook.renderPath);assert.equal(hook.status,'ready');await playback('hook-videos',hook.id);
await writeFile('/tmp/forge-video-editor-check.json',JSON.stringify({swipe,hook}));
console.log('Saved hook-bank variations, position edits, full clip replacement, and repeated rendering passed.');
