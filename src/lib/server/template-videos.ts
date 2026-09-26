import {getTextBank} from './text-bank';
import {isTemplateAsset} from '../asset-policy';
import { randomUUID,randomInt } from 'node:crypto';
import { mkdtemp,rename,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import { z } from 'zod';
import { videoPlanSchema,videoRequestSchema,type TemplateVideo,type VideoPlan } from '../template-video';
import { getDatabase } from './database';
import { getApp } from './apps';
import { getAsset,listAssets,syncAssets } from './assets';
import { listTemplateSets } from './template-sets';
import { dataRoot,initializeStorage } from './storage';
import { captionOverlay } from './caption';
import { ImportError } from './import-errors';
const exec=promisify(execFile);
function decode(row:Record<string,unknown>):TemplateVideo{return {...row,plan:JSON.parse(row.plan as string)} as unknown as TemplateVideo;}
export function listTemplateVideos(appId:string){return getDatabase().prepare("SELECT * FROM template_videos WHERE appId=? AND json_extract(plan,'$.format')='template-swipe' ORDER BY createdAt DESC").all(appId).map(decode);}
export function getTemplateVideo(id:string){const row=getDatabase().prepare('SELECT * FROM template_videos WHERE id=?').get(id);return row?decode(row):null;}
export function validateVideoAssets(appId:string,plan:VideoPlan){
 if(plan.cta?.enabled){const asset=plan.cta.assetId?getAsset(plan.cta.assetId):null;if(!asset||asset.appId!==appId||asset.type!=='image'||isTemplateAsset(asset)||!(asset.category==='BRAND'||asset.sourceKind==='app-store'))throw new ImportError('Choose a brand image or App Store image from this app for the CTA.');}
 const group=listTemplateSets(appId).find(set=>set.key===plan.templateKey);
 if(!group||group.slides.length!==plan.clips.length||plan.clips.some((clip,index)=>clip.assetId!==group.slides[index]))throw new ImportError('Use one complete template from this app, in its original slide order.');
}
export async function generateVideoPlans(raw:unknown){
 const input=videoRequestSchema.parse(raw);const app=getApp(input.appId);if(!app)throw new ImportError('App not found.',404);
 await syncAssets(app.id);const sets=listTemplateSets(app.id);
 const chosen=input.templateKeys.length?input.templateKeys.map(key=>sets.find(set=>set.key===key)):sets.slice(0,input.count);
 if(!chosen.length||chosen.some(set=>!set))throw new ImportError('Sync a template dump containing Display Image folders first.');
 if(chosen.length*input.variations>50)throw new ImportError('Limit each batch to 50 videos.');
 const bank=await getTextBank(app.id);
 const brand=listAssets(app.id).find(a=>a.category==='BRAND'&&/logo|icon/i.test(a.filename))||listAssets(app.id).find(a=>a.category==='BRAND'||a.sourceKind==='app-store');
 if(input.ctaEnabled&&!input.ctaAssetId&&!brand)throw new ImportError('Add a brand image or disable the CTA end card.');
 const db=getDatabase(),videos:TemplateVideo[]=[];db.exec('BEGIN IMMEDIATE');
 try {for(const set of chosen){const offset=randomInt(bank.hooks.length),ctaOffset=randomInt(bank.ctas.length);for(let variation=0;variation<input.variations;variation++){
  const headline=input.randomizeText?bank.hooks[(offset+variation)%bank.hooks.length]:input.caption||bank.hooks[0];
  const ctaText=(input.randomizeCta??input.randomizeText)?bank.ctas[(ctaOffset+variation)%bank.ctas.length]:input.ctaText||bank.ctas[0];
  const plan:VideoPlan={textY:0.094,headline,cta:{enabled:input.ctaEnabled,assetId:input.ctaAssetId||brand?.id||null,text:ctaText,duration:3,textY:0.27,downloadY:0.6},name:`${app.name} · ${set!.name}${input.variations>1?' · V'+(variation+1):''}`.slice(0,120),templateKey:set!.key,format:'template-swipe',clips:set!.slides.map((assetId,index)=>({assetId,caption:headline,duration:input.hold,motion:'swipe'}))};
  validateVideoAssets(app.id,plan);
  const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO template_videos (id,appId,name,plan,createdAt,updatedAt) VALUES (?,?,?,?,?,?)').run(id,app.id,plan.name,JSON.stringify(plan),now,now);videos.push(getTemplateVideo(id)!);
 }}db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
 return videos;
}
export function updateVideoPlan(id:string,plan:VideoPlan){const video=getTemplateVideo(id);if(!video)throw new ImportError('Video not found.',404);if(video.status==='rendering')throw new ImportError('Wait for the current render before editing.',409);validateVideoAssets(video.appId,plan);getDatabase().prepare("UPDATE template_videos SET name=?,plan=?,status='draft',renderPath=NULL,error=NULL,updatedAt=? WHERE id=?").run(plan.name,JSON.stringify(plan),new Date().toISOString(),id);return getTemplateVideo(id)!;}
const renderQueue=new Set<string>();
export async function renderTemplateVideo(id:string){
 const video=getTemplateVideo(id);if(!video)throw new ImportError('Video not found.',404);
 if(renderQueue.size)throw new ImportError('Another template video is rendering. Try again when it finishes.',409);
 validateVideoAssets(video.appId,video.plan);
 // Verify FFmpeg availability before changing persistent status.
 try{await exec('ffmpeg',['-version'],{timeout:5000});}catch{throw new ImportError('FFmpeg is required for local MP4 rendering. Install it with brew install ffmpeg, then restart Forge.',503);}
 renderQueue.add(id);const db=getDatabase();db.prepare("UPDATE template_videos SET status='rendering',error=NULL WHERE id=?").run(id);
 const root=initializeStorage();let directory:string|undefined;
 try {
  directory=await mkdtemp(path.join(root,'renders','job-'));
  for(const [index,clip] of video.plan.clips.entries()){
   const asset=getAsset(clip.assetId)!;
   const art=await sharp(path.join(root,asset.path)).rotate().resize(1000,1420,{fit:'contain',background:'#10110f'}).png().toBuffer();
   await sharp({create:{width:1080,height:1920,channels:3,background:'#10110f'}}).composite([{input:art,left:40,top:300}]).png().toFile(path.join(directory,`frame-${index}.png`));
   await writeFile(path.join(directory,`caption-${index}.png`),await captionOverlay(video.plan.headline??video.plan.clips[0]?.caption??'',{y:(video.plan.textY??0.094)*1920}));
  }
  for(const [index,clip] of video.plan.clips.entries()){
   const args=['-hide_banner','-loglevel','error','-y','-filter_complex_threads','1','-loop','1','-framerate','30','-i',`frame-${index}.png`];
   if(index<video.plan.clips.length-1)args.push('-loop','1','-framerate','30','-i',`frame-${index+1}.png`,'-i',`caption-${index}.png`,'-filter_complex',`[0:v][1:v]xfade=transition=slideleft:duration=0.4:offset=${clip.duration-0.4}[swipe];[swipe][2:v]overlay=0:0,format=yuv420p[out]`,'-map','[out]');
   else args.push('-i',`caption-${index}.png`,'-filter_complex','[0:v][1:v]overlay=0:0,format=yuv420p[out]','-map','[out]');
   args.push('-t',String(clip.duration),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p',`clip-${index}.mp4`);
   await exec('ffmpeg',args,{cwd:directory,timeout:120000,maxBuffer:1_000_000});
  }
  const clipFiles=video.plan.clips.map((_,index)=>`clip-${index}.mp4`);
  if(video.plan.cta?.enabled){
   const cta=video.plan.cta,asset=getAsset(cta.assetId!)!;
   const logo=/logo|icon/i.test(asset.filename);const brand=await sharp(path.join(root,asset.path)).rotate().resize(logo?400:850,logo?400:1150,{fit:'inside'}).png().toBuffer();const meta=await sharp(brand).metadata();
   await sharp({create:{width:1080,height:1920,channels:3,background:'#000000'}}).composite([{input:brand,left:Math.round((1080-meta.width!)/2),top:Math.round((1920-meta.height!)/2)},{input:await captionOverlay(cta.text,{y:(cta.textY??0.27)*1920}),left:0,top:0},{input:await captionOverlay('Download on the App Store',{y:(cta.downloadY??0.6)*1920,size:48}),left:0,top:0}]).png().toFile(path.join(directory,'cta.png'));
   await exec('ffmpeg',['-v','error','-y','-loop','1','-framerate','30','-i','cta.png','-t',String(cta.duration),'-an','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','cta.mp4'],{cwd:directory,timeout:120000});clipFiles.push('cta.mp4');
  }
  await writeFile(path.join(directory,'concat.txt'),clipFiles.map(file=>`file '${file}'`).join('\n'));
  await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','1','-i','concat.txt','-c','copy','-movflags','+faststart','output.mp4'],{cwd:directory,timeout:120000});
  const relative=`renders/${id}-${Date.now()}.mp4`;await rename(path.join(directory,'output.mp4'),path.join(root,relative));
  db.prepare("UPDATE template_videos SET status='ready',renderPath=?,error=NULL,updatedAt=? WHERE id=?").run(relative,new Date().toISOString(),id);
  for(const assetId of new Set(video.plan.clips.map(clip=>clip.assetId)))db.prepare('UPDATE assets SET usageCount=usageCount+1,lastUsedAt=? WHERE id=?').run(new Date().toISOString(),assetId);
  return getTemplateVideo(id)!;
 }catch(error){db.prepare("UPDATE template_videos SET status='failed',error=?,updatedAt=? WHERE id=?").run('Local rendering failed. Check FFmpeg and the source images, then retry.',new Date().toISOString(),id);console.error('Template render failed',error instanceof Error?error.message:error);throw new ImportError('Local rendering failed. Your video plan is saved; check FFmpeg and retry.',500);}
 finally{renderQueue.delete(id);if(directory)await rm(directory,{recursive:true,force:true});}
}
