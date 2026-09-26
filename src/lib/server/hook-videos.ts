import {randomUUID,randomInt} from 'node:crypto';
import {mkdtemp,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {hookRequest,type HookPlan,type HookVideo} from '../hook-video';
import {isTemplateAsset,footageRole} from '../asset-policy';
import {getDatabase} from './database';
import {getAsset,listAssets} from './assets';
import {getApp} from './apps';
import {getBatch} from './creatives';
import {initializeStorage} from './storage';
import {captionOverlay} from './caption';
import {ImportError} from './import-errors';
const exec=promisify(execFile);
function decode(row:Record<string,unknown>):HookVideo{return {...row,plan:JSON.parse(String(row.plan))} as unknown as HookVideo;}
export function listHookVideos(appId:string){return getDatabase().prepare("SELECT * FROM hook_videos WHERE appId=? AND json_extract(plan,'$.fullLength')=1 ORDER BY createdAt DESC").all(appId).map(decode);}
export function getHookVideo(id:string){const row=getDatabase().prepare('SELECT * FROM hook_videos WHERE id=?').get(id);return row?decode(row):null;}
export function validateHookPlan(appId:string,plan:HookPlan){
 if(plan.clips.length!==2||!plan.fullLength)throw new ImportError('Create a new full-length hook and demo pair.');
 for(const [i,clip] of plan.clips.entries()){
  const asset=getAsset(clip.assetId);
  if(clip.kind!==(['HOOK','DEMO'][i]))throw new ImportError('Segments must remain Hook → Demo.');
  if(!asset||asset.appId!==appId||asset.type!=='video'||isTemplateAsset(asset)||!['local','upload'].includes(asset.sourceKind))throw new ImportError('Hook + Demo uses this app’s local video assets only.');
  if(!asset.duration||clip.trimStart!==0||Math.abs(clip.duration-asset.duration)>0.05)throw new ImportError(`Use the complete uploaded clip: ${asset.filename}. No trimming is allowed.`);
 }
}
export function generateHookVideos(raw:unknown){
 const input=hookRequest.parse(raw),app=getApp(input.appId);if(!app)throw new ImportError('App not found.',404);
 const all=listAssets(app.id).filter(a=>a.type==='video'&&!isTemplateAsset(a)&&['local','upload'].includes(a.sourceKind));
 const hooks=input.hookAssetIds?.length?input.hookAssetIds.map(getAsset):all.filter(a=>footageRole(a)==='hook');
 const demos=input.demoAssetIds?.length?input.demoAssetIds.map(getAsset):all.filter(a=>footageRole(a)==='demo');
 if(!hooks.length||!demos.length)throw new ImportError('Sync your Hook + Demo/Hooks and demo folders first.');
 for(const [pool,role] of [[hooks,'hook'],[demos,'demo']] as const){if(pool.some(asset=>!asset||asset.appId!==app.id||asset.type!=='video'||(footageRole(asset)!==role&&asset.sourceKind!=='upload')))throw new ImportError(`Choose local ${role} footage for this app.`);}
 // Shuffle complete pairs, avoiding repetition until every pair has been used.
 const combinations=hooks.flatMap(hook=>demos.map(demo=>({hook:hook!,demo:demo!})));
 for(let i=combinations.length-1;i>0;i--){const j=randomInt(i+1);[combinations[i],combinations[j]]=[combinations[j],combinations[i]];}
 const texts=[...input.texts];for(let i=texts.length-1;i>0;i--){const j=randomInt(i+1);[texts[i],texts[j]]=[texts[j],texts[i]];}
 const plans:HookPlan[]=[];
 for(let i=0;i<input.count;i++){
  const {hook,demo}=combinations[i%combinations.length],text=texts[i%texts.length];
  if(!hook.duration||!demo.duration)throw new ImportError('A video duration is missing. Sync with FFmpeg installed.');
  plans.push({fullLength:true,name:`${text} · ${i+1}`.slice(0,120),audio:input.audio,clips:[{kind:'HOOK',assetId:hook.id,text,trimStart:0,duration:hook.duration},{kind:'DEMO',assetId:demo.id,text:'',trimStart:0,duration:demo.duration}]});
 }
 plans.forEach(plan=>validateHookPlan(app.id,plan));const db=getDatabase(),videos:HookVideo[]=[];db.exec('BEGIN IMMEDIATE');
 try{for(const plan of plans){const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO hook_videos(id,appId,name,plan,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(id,app.id,plan.name,JSON.stringify(plan),now,now);videos.push(getHookVideo(id)!);}db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}return videos;
}
export function updateHookVideo(id:string,plan:HookPlan){const video=getHookVideo(id);if(!video)throw new ImportError('Video not found.',404);if(video.status==='rendering')throw new ImportError('Wait for rendering to finish.',409);validateHookPlan(video.appId,plan);getDatabase().prepare("UPDATE hook_videos SET name=?,plan=?,status='draft',renderPath=NULL,error=NULL,updatedAt=? WHERE id=?").run(plan.name,JSON.stringify(plan),new Date().toISOString(),id);return getHookVideo(id)!;}
const rendering=new Set<string>();
export async function renderHookVideo(id:string){
 const video=getHookVideo(id);if(!video)throw new ImportError('Video not found.',404);if(rendering.size)throw new ImportError('Another Hook + Demo video is rendering.',409);validateHookPlan(video.appId,video.plan);
 try{await exec('ffmpeg',['-version']);}catch{throw new ImportError('Install FFmpeg locally to render videos.',503);}
 const db=getDatabase(),root=initializeStorage();rendering.add(id);let directory:string|undefined;db.prepare("UPDATE hook_videos SET status='rendering',error=NULL WHERE id=?").run(id);
 try{
  directory=await mkdtemp(path.join(root,'renders','hook-'));
  for(const [index,clip]of video.plan.clips.entries()){
   const asset=getAsset(clip.assetId)!;await writeFile(path.join(directory,`text-${index}.png`),await captionOverlay(clip.text,{y:(video.plan.textY??0.094)*1920}));
   const source=path.join(root,asset.path);const probe=JSON.parse((await exec('ffprobe',['-v','error','-select_streams','a','-show_entries','stream=index','-of','json',source])).stdout);
   const audio=video.plan.audio==='original'&&probe.streams?.length;
   const args=['-v','error','-y','-filter_complex_threads','1','-i',source,'-i',`text-${index}.png`];
   if(!audio)args.push('-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
   args.push('-filter_complex','[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[v];[v][1:v]overlay=0:0:format=auto:shortest=0,format=yuv420p[out]','-map','[out]','-map',audio?'0:a:0':'2:a:0','-af','apad','-shortest','-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-ar','48000','-ac','2',`clip-${index}.mp4`);
   await exec('ffmpeg',args,{cwd:directory,timeout:900000,maxBuffer:1_000_000});
  }
  await writeFile(path.join(directory,'concat.txt'),video.plan.clips.map((_,i)=>`file 'clip-${i}.mp4'`).join('\n'));
  await exec('ffmpeg',['-v','error','-y','-f','concat','-safe','1','-i','concat.txt','-c','copy','-movflags','+faststart','output.mp4'],{cwd:directory,timeout:120000});
  const relative=`renders/${id}-${Date.now()}.mp4`;await rename(path.join(directory,'output.mp4'),path.join(root,relative));db.prepare("UPDATE hook_videos SET status='ready',renderPath=?,updatedAt=? WHERE id=?").run(relative,new Date().toISOString(),id);return getHookVideo(id)!;
 }catch(error){db.prepare("UPDATE hook_videos SET status='failed',error='Render failed. Check your source files and FFmpeg, then retry.' WHERE id=?").run(id);console.error(error);throw new ImportError('Local Hook + Demo rendering failed. Your editable plan is saved.',500);}finally{rendering.delete(id);if(directory)await rm(directory,{recursive:true,force:true});}
}
