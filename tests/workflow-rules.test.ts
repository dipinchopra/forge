import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {boardImages,discoverBoardLinks} from '../src/lib/server/pinterest';
import {getDatabase} from '../src/lib/server/database';
import {createApp} from '../src/lib/server/apps';
import {registerAsset} from '../src/lib/server/assets';
import {listTemplateSets} from '../src/lib/server/template-sets';
import {validateVideoAssets} from '../src/lib/server/template-videos';
import {eligibleAssets} from '../src/lib/asset-policy';
import {generateHookVideos,validateHookPlan} from '../src/lib/server/hook-videos';
import {ideaBank} from '../src/lib/server/idea-bank';

test('public Pinterest parser uses pin images, ignores avatars, and retains exact source links',()=>{
 const html=`<img src="https://i.pinimg.com/originals/aa/bb/cc/aabbcc.jpg"><script id="__PWS_INITIAL_PROPS__" type="application/json">${JSON.stringify({initialReduxState:{pins:{one:{id:'123',type:'pin',images:{orig:{width:900,height:1200,url:'https://i.pinimg.com/originals/11/22/33/112233.jpg'}}}}}})}</script>`;
 assert.deepEqual(boardImages(html,'https://www.pinterest.com/test/board/'),[{url:'https://i.pinimg.com/originals/11/22/33/112233.jpg',sourceUrl:'https://www.pinterest.com/pin/123/',title:'Image from https://www.pinterest.com/test/board/'}]);
 assert.deepEqual(discoverBoardLinks('uddg=https%3A%2F%2Fin.pinterest.com%2Ftest%2Fboard%2F&x=1 uddg=https%3A%2F%2Fwww.pinterest.com%2Fpin%2F123%2F&x=1'),['https://www.pinterest.com/test/board/']);
});
test('template folder identity and numeric order survive dedup; full-length hook videos and app isolation are enforced',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-rules-'));process.env.FORGE_DATA_DIR=root;
 try{
  const app=createApp({name:'Test app'}),other=createApp({name:'Other'}),db=getDatabase();
  const bytes=await sharp({create:{width:50,height:70,channels:3,background:'#648'}}).png().toBuffer();
  const asset=await registerAsset({appId:app.id,bytes,filename:'Slide 1.png',category:'TEMPLATE',sourceKind:'local',sourceKey:'Template dump/A/Display Images/Slide 1.png'});
  for(const key of ['A/Slide 10.png','A/Slide 2.png','B/Slide 1.png']){const [group,file]=key.split('/');db.prepare('INSERT INTO asset_sources(appId,sourceKey,assetId) VALUES(?,?,?)').run(app.id,`Template dump/${group}/Display Images/${file}`,asset.id);}
  const sets=listTemplateSets(app.id);assert.equal(sets.length,2);assert.equal(sets[0].slides.length,2,'identical file bytes do not erase membership');
  const plan={name:'Swipe',format:'template-swipe' as const,templateKey:sets[0].key,clips:sets[0].slides.map(assetId=>({assetId,caption:'',duration:2,motion:'swipe' as const}))};validateVideoAssets(app.id,plan);assert.throws(()=>validateVideoAssets(app.id,{...plan,clips:plan.clips.slice(0,1)}));assert.equal(eligibleAssets([asset],'slideshow').length,0);
  const video=await registerAsset({appId:app.id,bytes:Buffer.from('test-video'),filename:'hook.mp4',category:'VIDEO',sourceKind:'upload',sourceKey:'hook'});db.prepare('UPDATE assets SET duration=10 WHERE id=?').run(video.id);
  const ideas=ideaBank(app.id,'hook-demo');assert.equal(ideas.concepts.length,12);
  const [draft]=generateHookVideos({appId:app.id,batchId:ideas.id,conceptIndices:[0],hookAssetIds:[video.id],demoAssetIds:[video.id],count:1,texts:['Your next photo dump could look like this']});assert.equal(draft.plan.clips[0].kind,'HOOK');assert.equal(draft.plan.clips.length,2);assert.equal(draft.plan.clips[0].duration,10);assert.equal(draft.plan.clips[1].duration,10);
  assert.throws(()=>validateHookPlan(other.id,draft.plan),/local video/);assert.throws(()=>validateHookPlan(app.id,{...draft.plan,clips:draft.plan.clips.map(c=>({...c,duration:9}))}),/complete uploaded clip/);
  db.close();
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('crop coordinates remain bounded and edits preserve crop settings',async()=>{
 const {cropRect}=await import('../src/lib/crop');const {projectEditSchema}=await import('../src/lib/creative');
 assert.deepEqual(cropRect({x:0.25,y:0.1,width:0.5,height:0.6},1000,2000),{x:250,y:200,width:500,height:1200});
 const slide={id:'e579e7ae-5bb9-4e12-a5d3-c220d59d306a',position:0,headline:'Keep this part',body:'',assetQuery:'',assetId:null,template:'tiktok-outlined',textEmphasis:[],crop:{x:0.1,y:0.2,width:0.7,height:0.6},imageZoom:1.4};
 const parsed=projectEditSchema.parse({name:'Crop',slides:[slide]}).slides[0];assert.deepEqual(parsed.crop,slide.crop);assert.equal(parsed.imageZoom,1.4);
 assert.throws(()=>projectEditSchema.parse({name:'Bad crop',slides:[{...slide,crop:{x:0.8,y:0,width:0.5,height:1}}]}));
});

test('image zoom is bounded in slide edits',async()=>{
 const {projectEditSchema}=await import('../src/lib/creative');
 const slide={id:'e579e7ae-5bb9-4e12-a5d3-c220d59d306a',position:0,headline:'Keep this part',body:'',assetQuery:'',assetId:null,template:'tiktok-outlined',textEmphasis:[]};
 assert.equal(projectEditSchema.parse({name:'Zoom',slides:[{...slide,imageZoom:0.5}]}).slides[0].imageZoom,0.5);
 assert.throws(()=>projectEditSchema.parse({name:'Bad zoom',slides:[{...slide,imageZoom:0.2}]}));
 assert.throws(()=>projectEditSchema.parse({name:'Bad zoom',slides:[{...slide,imageZoom:3}]}));
});
