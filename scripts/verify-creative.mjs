import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:3000';
const appId='a7237d83-fe3b-4a97-a947-9ee67cf394df';
const state='/tmp/forge-creative-check.json';
async function post(route,body={}) {const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;}
const command=process.argv[2];
if(command==='refresh') {
 const app=await post(`/api/apps/${appId}/refresh`);assert.equal(app.screenshotSource,'live-storefront');assert.equal(app.screenshots.length,7);
 const synced=await post('/api/assets/sync',{appId});
 assert.ok(synced.assets.some(asset=>asset.sourceKind==='local'));
 assert.ok(synced.assets.filter(asset=>asset.sourceKind==='app-store').length>=7);
 await writeFile(state,JSON.stringify({app,assets:synced.assets}));
 console.log(JSON.stringify({screenshots:app.screenshots.length,source:app.screenshotSource,folder:synced.folder,assets:synced.assets.length,firstScreenshot:app.screenshots[0]}));
} else if(command==='concepts') {
 const saved=JSON.parse(await readFile(state,'utf8'));
 const selected=saved.assets.find(asset=>asset.sourceKind==='app-store'&&asset.category==='PRODUCT');
 const batch=await post('/api/concepts',{appId,start:'idea',type:'slideshow',idea:'5 ways to make your photo dumps look better',selectedAssetIds:[selected.id]});
 assert.equal(batch.concepts.length,12);assert.equal(batch.provider,'codex');
 saved.batch=batch;await writeFile(state,JSON.stringify(saved));
 console.log(JSON.stringify(batch.concepts.map(concept=>({hook:concept.hook,assets:concept.assetIds.length})),null,2));
} else if(command==='project') {
 const saved=JSON.parse(await readFile(state,'utf8'));
 const project=await post('/api/projects',{batchId:saved.batch.id,conceptIndex:1});
 assert.ok(project.slides.length>=5);assert.ok(project.slides.some(slide=>slide.assetId));
 assert.equal(project.style.fontFamily,'TikTok Sans');assert.equal(project.style.textColor,'#ffffff');assert.equal(project.style.strokeColor,'#000000');
 assert.equal((await fetch(base+'/projects/'+project.id)).status,200);
 saved.project=project;await writeFile(state,JSON.stringify(saved));
 console.log(JSON.stringify({url:base+'/projects/'+project.id,slides:project.slides.length,style:project.style},null,2));
}
