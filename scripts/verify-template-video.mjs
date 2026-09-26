import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:3000',appId='a7237d83-fe3b-4a97-a947-9ee67cf394df',state='/tmp/forge-template-video-check.json';
async function post(route,body={}){const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});const result=await response.json();assert.ok(response.ok,JSON.stringify(result));return result;}
if(process.argv[2]==='plan'){
 await post('/api/assets/sync',{appId});const {sets}=await fetch(`${base}/api/template-sets?appId=${appId}`).then(r=>r.json());const chosen=sets.find(set=>set.slides.length>1);assert.ok(chosen);
 const plans=await post('/api/template-videos',{appId,templateKeys:[chosen.key],hold:2});assert.equal(plans.length,1);
 await writeFile(state,JSON.stringify(plans[0]));console.log(JSON.stringify({templates:sets.length,name:plans[0].name,clips:plans[0].plan.clips.length,id:plans[0].id}));
}else{
 const plan=JSON.parse(await readFile(state,'utf8'));const rendered=await post(`/api/template-videos/${plan.id}/render`);assert.equal(rendered.status,'ready');await writeFile(state,JSON.stringify(rendered));
 const response=await fetch(`${base}/api/template-videos/${plan.id}/download`);assert.equal(response.headers.get('content-type'),'video/mp4');assert.ok((await response.arrayBuffer()).byteLength>10000);console.log(JSON.stringify({renderPath:rendered.renderPath,url:`${base}/api/template-videos/${plan.id}/download`}));
}
