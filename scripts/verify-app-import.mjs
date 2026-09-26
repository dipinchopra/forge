import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:3000';
const stateFile='/tmp/forge-panoslice-import-preview.json';
async function post(route, body) {
 const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});
 const result=await response.json();
 assert.ok(response.ok,JSON.stringify(result));
 return result;
}
if(process.argv[2]==='preview') {
 const draft=await post('/api/apps/import',{url:'https://apps.apple.com/in/app/panoslice-photo-swipe-collage/id1592547810'});
 assert.equal(draft.metadata.appleAppId,'1592547810');
 assert.ok(draft.iconPath);assert.ok(draft.screenshots.length>=1);
 for(const image of [draft.iconPath,...draft.screenshots]) {
   const response=await fetch(base+'/api/media/'+image);
   assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith('image/'));
 }
 await writeFile(stateFile,JSON.stringify(draft,null,2));
 console.log(JSON.stringify({id:draft.id,name:draft.metadata.name,subtitle:draft.metadata.subtitle,screenshots:draft.screenshots.length,warnings:draft.warnings}));
} else if(process.argv[2]==='generate') {
 const draft=JSON.parse(await readFile(stateFile,'utf8'));
 const generated=await post('/api/apps/import/generate',{draftId:draft.id});
 assert.equal(generated.profileSource,'codex');assert.ok(generated.profile.features.length);
 await writeFile(stateFile,JSON.stringify(generated,null,2));
 console.log(JSON.stringify(generated.profile,null,2));
} else if(process.argv[2]==='save') {
 const draft=JSON.parse(await readFile(stateFile,'utf8'));
 const app=await post('/api/apps/import/commit',{draftId:draft.id,profile:draft.profile});
 assert.equal(app.appleAppId,'1592547810');assert.equal(app.screenshots.length,draft.screenshots.length);
 assert.equal((await fetch(base+'/apps/'+app.id)).status,200);
 const retry=await post('/api/apps/import/commit',{draftId:draft.id,profile:draft.profile});assert.equal(retry.id,app.id);
 console.log('Saved Panoslice: '+base+'/apps/'+app.id);
}
