import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { createApp } from '../src/lib/server/apps';
import { registerAsset,listAssets } from '../src/lib/server/assets';
import { chooseAssets,generateConcepts,createProject,saveProject } from '../src/lib/server/creatives';
import { getDatabase } from '../src/lib/server/database';
import { parseCurrentScreenshots } from '../src/lib/server/providers/apple';

test('live storefront screenshots exclude recommendations and expand full-resolution templates',()=>{
 const screenshot={template:'https://is1-ssl.mzstatic.com/current/{w}x{h}{c}.{f}',width:1284,height:2778};
 const html='<script id="serialized-server-data">'+JSON.stringify({data:[{data:{shelfMapping:{product_media_phone_:{items:[{screenshot}]},moreByDeveloper:{items:[{screenshot:{...screenshot,template:'https://is1-ssl.mzstatic.com/unrelated.jpg'}}]}}}}]})+'</script>';
 assert.deepEqual(parseCurrentScreenshots(html),['https://is1-ssl.mzstatic.com/current/1284x2778bb.jpg']);
 assert.throws(()=>parseCurrentScreenshots('<html>unavailable</html>'));
});

test('assets deduplicate per app; real project flow validates IDs, preserves choices and saves edits',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-creative-test-'));process.env.FORGE_DATA_DIR=root;
 try {
  const app=createApp({name:'Isolated creative test'}),other=createApp({name:'Other test'});
  const bytes=await sharp({create:{width:120,height:200,channels:3,background:'#bb7722'}}).png().toBuffer();
  const storeBytes=await sharp({create:{width:120,height:200,channels:3,background:'#2255bb'}}).png().toBuffer();
  const input={appId:app.id,bytes,filename:'travel.png',category:'OUTPUT' as const,sourceKind:'dupe' as const,sourceKey:'dupe-test'};
  const asset=await registerAsset(input);assert.equal((await registerAsset(input)).id,asset.id);
  const appStore=await registerAsset({...input,bytes:storeBytes,filename:'store.png',sourceKind:'app-store' as const,sourceKey:'store-test'});assert.equal(listAssets(app.id).length,2);
  const foreign=await registerAsset({...input,appId:other.id});
  assert.throws(()=>chooseAssets(listAssets(app.id),[foreign.id]));
  let calls=0;
  const provider={async generateStructured<T>(_prompt:string,schema:z.ZodType<T>,images?:string[]):Promise<T>{
    calls++;assert.equal(images?.length,1);
    return schema.parse(calls===1?{concepts:Array.from({length:12},(_,i)=>i).map(index=>({title:`Concept ${index}`,hook:`Hook ${index}`,angle:'Travel collage ideas',outline:['Hook','First tip','Second tip','CTA'],assetIds:[asset.id]}))}:{slides:Array.from({length:6},(_,index)=>({headline:`Slide ${index}`,body:'A little detail',assetId:index<5?appStore.id:null,assetQuery:'travel'}))});
  }};
  const batch=await generateConcepts({appId:app.id,start:'idea',type:'slideshow',idea:'Travel photo dump',selectedAssetIds:[asset.id]},provider);
  assert.equal(batch.concepts.length,12);
  const project=await createProject(batch.id,0,provider);assert.equal(project.slides.length,6);assert.ok(project.slides.slice(0,-1).every(slide=>slide.assetId===asset.id),'slideshow body slides use Dupe/Pinterest images instead of App Store screenshots');assert.equal(project.style.fontFamily,'TikTok Sans');assert.equal(project.style.textColor,'#ffffff');assert.equal(project.style.strokeColor,'#000000');
  assert.equal((await createProject(batch.id,0,provider)).id,project.id);assert.equal(calls,2,'retry must not consume another AI call');
  assert.equal(listAssets(app.id)[0].usageCount,1);
  const edited=saveProject(project.id,'Edited title',project.slides.map((slide,index)=>({...slide,headline:index===0?'New hook':slide.headline})));
  assert.equal(edited.slides[0].headline,'New hook');
  assert.throws(()=>saveProject(project.id,'Invalid',project.slides.map(slide=>({...slide,assetId:foreign.id}))),/belonging/);
  getDatabase().close();
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('bulk drafts use one provider call and retries reuse saved projects',async()=>{
 const {createBulkProjects}=await import('../src/lib/server/bulk-projects');
 // This test file's earlier test closed its connection; make an independent one.
 delete (globalThis as unknown as {forgeDb?:unknown}).forgeDb;
 const root=mkdtempSync(path.join(tmpdir(),'forge-bulk-test-'));process.env.FORGE_DATA_DIR=root;
 try{
  const app=createApp({name:'Bulk app'});const {ideaBank}=await import('../src/lib/server/idea-bank');const batch=ideaBank(app.id,'carousel');let calls=0;
  const provider={async generateStructured<T>(_prompt:string,schema:z.ZodType<T>):Promise<T>{calls++;return schema.parse({drafts:[0,1].map(conceptIndex=>({conceptIndex,slides:Array.from({length:6},(_,i)=>({headline:`Short line ${i}`,body:'',assetId:null,assetQuery:'morning coffee'}))}))});}};
  const input={batchId:batch.id,conceptIndices:[0,1],imageSource:'local',formula:'aida',ratio:'1:1'};
  const projects=await createBulkProjects(input,provider);assert.equal(calls,1);assert.equal(projects.length,2);assert.equal(projects[0].style.height,1080);assert.equal(projects[0].slides.at(-1)?.role,'CTA');
  await createBulkProjects(input,provider);assert.equal(calls,1,'a retry must not spend another model call');
  getDatabase().close();
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('slideshow drafts rewrite weak sales copy into useful Panoslice-safe list slides',async()=>{
 delete (globalThis as unknown as {forgeDb?:unknown}).forgeDb;
 const root=mkdtempSync(path.join(tmpdir(),'forge-slideshow-quality-'));process.env.FORGE_DATA_DIR=root;
 try{
  const app=createApp({name:'Panoslice',oneLineDescription:'Create swipeable photo collages for photo dumps',features:['Share more photos in seamless carousel layouts'],keywords:['photo dump','collage','carousel']});
  const bytes=await sharp({create:{width:300,height:500,channels:3,background:'#f2c66d'}}).png().toBuffer();
  const asset=await registerAsset({appId:app.id,bytes,filename:'beach-detail.png',category:'MARKETING',sourceKind:'dupe',sourceKey:'quality-dupe'});
  const provider={async generateStructured<T>(_prompt:string,schema:z.ZodType<T>):Promise<T>{return schema.parse({slides:Array.from({length:6},(_,i)=>({headline:i===0?'Unlock stunning visual storytelling':i===1?'Include less photos':`Elevate your memories ${i}`,body:'Transform your content today',assetId:asset.id,assetQuery:'generic vibes'}))});}};
  const {ideaBank}=await import('../src/lib/server/idea-bank');
  const batch=ideaBank(app.id,'slideshow');
  const project=await createProject(batch.id,0,provider,{imageSource:'local',slideCount:6,selectedAssetIds:[asset.id]});
  const copy=project.slides.map(slide=>`${slide.headline} ${slide.body}`).join(' ').toLowerCase();
  assert.equal(/include less|fewer photos|unlock|elevate|transform/.test(copy),false);
  assert.ok(project.slides.some(slide=>/people|tiny detail|messy|food|cover|closer|layout/i.test(slide.headline)),copy);
  assert.equal(project.slides.at(-1)?.headline,'Try Panoslice');
  getDatabase().close();
 }finally{rmSync(root,{recursive:true,force:true});}
});

