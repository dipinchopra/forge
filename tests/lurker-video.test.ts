import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { getDatabase } from '../src/lib/server/database';
import { createApp } from '../src/lib/server/apps';
import { registerAsset } from '../src/lib/server/assets';
import { saveInspiration,analyzeInspiration,socialUrl } from '../src/lib/server/lurker';
import {listTemplateSets} from '../src/lib/server/template-sets';
import { generateVideoPlans,updateVideoPlan,validateVideoAssets } from '../src/lib/server/template-videos';

test('social URL guard rejects arbitrary and local destinations',()=>{
 assert.equal(socialUrl('https://www.instagram.com/p/example/').hostname,'www.instagram.com');
 for(const url of ['http://instagram.com/p/example','https://127.0.0.1/','https://instagram.com.evil.com/x','https://user:password@x.com/x'])assert.throws(()=>socialUrl(url));
});
test('blocked posts are saved, analysis needs evidence, and template plans remain separate from slide projects',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-lurker-test-'));process.env.FORGE_DATA_DIR=root;const oldFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('Blocked',{status:403});
 try{
  const saved=await saveInspiration({url:'https://www.instagram.com/p/forge-test/',notes:''});assert.ok(saved.id);await assert.rejects(()=>analyzeInspiration(saved.id),/no post content/);
  const updated=await saveInspiration({url:saved.url,notes:'The creator opens with a surprising before/after, shows three steps, then asks viewers to save.'});assert.equal(updated.id,saved.id);
  const provider={async generateStructured<T>(_prompt:string,schema:z.ZodType<T>):Promise<T>{return schema.parse({name:'Reveal and teach',description:'A transformation followed by steps',hook:'Before and after',hookType:'curiosity',hookPattern:'Show the result before explaining the method',structure:['Result','Three steps','Save CTA'],visualMechanic:'Before/after comparison',cta:'Save',topics:['design'],pacing:'Not observable from notes',remixAdvice:'Use the app output and own assets',limitations:'User notes only; video was not watched.'});}};
  const analyzed=await analyzeInspiration(saved.id,provider);assert.equal(analyzed.analysisStatus,'complete');assert.ok(analyzed.creativeFormatId);assert.match(analyzed.analysisJson.limitations!,/not watched/);
  const app=createApp({name:'Isolated template test'});const assets=[];
  for(const color of ['#bb8855','#5566bb']){const bytes=await sharp({create:{width:100,height:150,channels:3,background:color}}).png().toBuffer();assets.push(await registerAsset({appId:app.id,bytes,filename:color.slice(1)+'.png',category:'TEMPLATE',sourceKind:'upload',sourceKey:color}));}
  for(const [i,asset] of assets.entries())getDatabase().prepare('INSERT INTO asset_sources(appId,sourceKey,assetId) VALUES(?,?,?)').run(app.id,`Dump/A/Display Images/Slide ${i+1}.png`,asset.id);
  const set=listTemplateSets(app.id)[0];
  const videos=await generateVideoPlans({appId:app.id,templateKeys:[set.key],hold:2,ctaEnabled:false});
  const plan=videos[0].plan;
  assert.equal(videos.length,1);assert.equal(getDatabase().prepare('SELECT COUNT(*) AS n FROM projects').get()?.n,0,'template videos must not be slide projects');
  const variants=await generateVideoPlans({appId:app.id,templateKeys:[set.key],variations:3,ctaEnabled:false,caption:'Keep this hook fixed',randomizeText:false,randomizeCta:true});
  assert.equal(new Set(variants.map(v=>v.plan.headline)).size,1);assert.equal(variants[0].plan.headline,'Keep this hook fixed');assert.equal(new Set(variants.map(v=>v.plan.cta?.text)).size,3,'CTA variations work independently of hooks');
  assert.equal(updateVideoPlan(videos[0].id,{...plan,name:'Edited showcase'}).name,'Edited showcase');
  const positioned=updateVideoPlan(videos[0].id,{...plan,cta:{...plan.cta!,textY:0.7,downloadY:0.15}});
  assert.equal(positioned.plan.cta?.textY,0.7);assert.equal(positioned.plan.cta?.downloadY,0.15);assert.equal(positioned.plan.textY,plan.textY,'CTA edits do not move the hook');
  const other=createApp({name:'Another app'});assert.throws(()=>validateVideoAssets(other.id,plan),/this app/);
  getDatabase().close();
 }finally{globalThis.fetch=oldFetch;rmSync(root,{recursive:true,force:true});}
});
