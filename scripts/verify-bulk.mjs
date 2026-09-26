import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3000',appId='a7237d83-fe3b-4a97-a947-9ee67cf394df';
async function get(url){const r=await fetch(base+url);const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
async function post(url,body){const r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
const media=await post('/api/assets/sync',{appId});
const {sets}=await get(`/api/template-sets?appId=${appId}`);const set=sets.find(s=>s.slides.length===3);assert.ok(set);
const [video]=await post('/api/template-videos',{appId,templateKeys:[set.key],hold:2,caption:'Swipe for the full layout'});
assert.deepEqual(video.plan.clips.map(c=>c.assetId),set.slides);
const render=await post(`/api/template-videos/${video.id}/render`,{});assert.equal(render.status,'ready');
console.log({templates:sets.length,template:render.id,path:render.renderPath});
const ideas=await get(`/api/concepts?appId=${appId}&type=hook-demo`);assert.equal(ideas.concepts.length,12);
const hooks=media.assets.filter(a=>a.type==='video'&&/\/hooks?\s*\//i.test(a.sourceKey||''));const demos=media.assets.filter(a=>a.type==='video'&&/\/demo\s*\//i.test(a.sourceKey||''));
const [hook]=await post('/api/hook-videos',{appId,batchId:ideas.id,conceptIndices:[0],hookAssetIds:[hooks[0].id],demoAssetIds:[demos[0].id],count:1,texts:['Your next photo dump could look like this'],audio:'muted'});
const hookRender=await post(`/api/hook-videos/${hook.id}/render`,{});assert.equal(hookRender.status,'ready');console.log({hooks:hooks.length,demos:demos.length,hook:hook.id,path:hookRender.renderPath});
await writeFile('/tmp/forge-bulk-check.json',JSON.stringify({template:render,hook:hookRender}));
