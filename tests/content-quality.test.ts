import {test} from 'node:test';
import assert from 'node:assert/strict';
import {textBankSchema,mergeTextBank} from '../src/lib/server/text-bank';
import {hookRequest} from '../src/lib/hook-video';
import {rankPinterestImages} from '../src/lib/server/pinterest';
import {rankDupeImages,importDupe} from '../src/lib/server/dupe';
import {createApp} from '../src/lib/server/apps';
import {listAssets} from '../src/lib/server/assets';
import {wrapText,safeTextTop} from '../src/lib/text-layout';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

test('500-entry banks survive saving and hook-video validation; appending preserves existing lines',()=>{
 const hooks=Array.from({length:500},(_,i)=>`Hook number ${i}`),ctas=Array.from({length:500},(_,i)=>`CTA number ${i}`);
 assert.equal(textBankSchema.parse({hooks,ctas}).ctas.length,500);
 assert.equal(hookRequest.parse({appId:'11111111-1111-4111-8111-111111111111',texts:hooks,count:1}).texts.length,500);
 assert.throws(()=>textBankSchema.parse({hooks:[...hooks,'Too many'],ctas}));
 const merged=mergeTextBank({hooks:['Try this photo layout'],ctas:['Download the app']},{hooks:['try this photo layout','Keep your trip in one post'],ctas:['Make your own']});
 assert.deepEqual(merged.hooks,['Try this photo layout','Keep your trip in one post']);assert.deepEqual(merged.ctas,['Download the app','Make your own']);
});
test('Pinterest candidates require subject evidence, and unrelated or uncaptioned pins are excluded',()=>{
 const titles=['Beach vacation photos at sunset','Kitchen storage ideas','Vacation packing list','Image from https://www.pinterest.com/user/board/','Beach cafe in Paris'];
 const images=titles.map((title,i)=>({title,url:`https://i.pinimg.com/${i}.jpg`,sourceUrl:`https://www.pinterest.com/pin/${i}/`}));
 const ranked=rankPinterestImages(images,'beach vacation sunset photos');
 assert.deepEqual(ranked.map(i=>i.title),[titles[0]]);
 assert.equal(rankPinterestImages(images,'aesthetic ideas').length,0);
});
test('Dupe imports contextual photos with source and creator metadata',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-dupe-test-')),previous=process.env.FORGE_DATA_DIR,original=globalThis.fetch;process.env.FORGE_DATA_DIR=root;
 const bytes=await sharp({create:{width:900,height:1400,channels:3,background:'#4e8fc9'}}).jpeg().toBuffer();
 const imageId='d2b2e9d4-6c9e-4a77-915d-3304b0e39731',previewId='90bb1137-d071-4020-8b25-ccb06e440840';
 globalThis.fetch=async(input,init)=>{const url=String(input);if(url.includes('/api/v1/content/search')){assert.equal(JSON.parse(String(init?.body)).label,'beach vacation');return Response.json([{id:'f01813e9-16c2-48cc-be2a-837aadb0e94e',img_id:imageId,img_preview_id:previewId,content_type:'PHOTO',title:'Beach vacation sunset',description:'',user:'Faith Lehman',username:'faithlehman',img_width:3000,img_height:4000,labels:[{label:'beach'}],aesthetics:[]}]);}if(url.endsWith(imageId))return new Response(bytes,{headers:{'content-type':'image/jpeg'}});return new Response('not found',{status:404});};
 try{const app=createApp({name:'Dupe app'}),assets=await importDupe(app.id,'beach vacation');assert.equal(assets.length,1);assert.equal(assets[0].sourceKind,'dupe');assert.match(assets[0].attribution||'',/Faith Lehman/);assert.match(listAssets(app.id)[0].sourceUrl||'',/dupephotos.com/);
  assert.equal(rankDupeImages([{id:'1',imageId,previewId,sourceUrl:'',title:'Kitchen cabinet',creator:'',width:1000,height:1200},{id:'2',imageId,previewId,sourceUrl:'',title:'Beach vacation sunset',creator:'',width:1000,height:1200}],'beach vacation')[0].id,'2');
 }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.FORGE_DATA_DIR;else process.env.FORGE_DATA_DIR=previous;rmSync(root,{recursive:true,force:true});delete (globalThis as unknown as {forgeDb?:unknown}).forgeDb;}
});
test('long words wrap without squashing and bottom-positioned text stays within the canvas',()=>{
 const lines=wrapText('A short line Supercalifragilisticexpialidocious',10,s=>s.length);
 assert.ok(lines.every(l=>l.length<=10));assert.equal(lines.join('').replaceAll(' ',''),'AshortlineSupercalifragilisticexpialidocious');
 for(const height of [1080,1350,1920]){const top=safeTextTop(height*.85,400,height,80);assert.ok(top>=80);assert.ok(top+400<=height-80);}
});
