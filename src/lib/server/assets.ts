import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Asset, AssetCategory } from '../models';
import { getApp } from './apps';
import { getDatabase } from './database';
import { dataRoot, initializeStorage } from './storage';
import { ImportError } from './import-errors';
const exec = promisify(execFile);
const imageExtensions = new Set(['.jpg','.jpeg','.png','.webp','.gif','.heic','.avif','.tif','.tiff']);
const videoExtensions = new Set(['.mp4','.mov','.m4v','.webm']);
function decode(row: Record<string,unknown>): Asset {
  const asset = {...row};
  for(const key of ['tags','subjects','style','useCases']) asset[key]=JSON.parse(asset[key] as string);
  return asset as unknown as Asset;
}
export function listAssets(appId: string, query = '') {
  const assets = getDatabase().prepare('SELECT * FROM assets WHERE appId=? AND active=1 ORDER BY usageCount ASC, createdAt DESC').all(appId).map(decode);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return assets.filter(asset=>terms.every(term=>[asset.filename,asset.description,...asset.tags,...asset.style,...asset.useCases].join(' ').toLowerCase().includes(term)));
}
export function getAsset(id: string) { const row=getDatabase().prepare('SELECT * FROM assets WHERE id=?').get(id);return row?decode(row):null; }
export async function registerAsset(input: {appId:string; bytes:Buffer; filename:string; category:AssetCategory; sourceKind:Asset['sourceKind'];sourceKey:string; description?:string}) {
  if(!getApp(input.appId)) throw new ImportError('App not found.',404);
  if(input.bytes.length>150_000_000) throw new ImportError('Files must be smaller than 150 MB.');
  const db=getDatabase();
  const hash=createHash('sha256').update(input.bytes).digest('hex');
  const existing=db.prepare('SELECT id FROM assets WHERE appId=? AND contentHash=?').get(input.appId,hash);
  if(existing) {db.prepare("UPDATE assets SET active=1,category=CASE WHEN category='OTHER' THEN ? ELSE category END WHERE id=?").run(input.category,existing.id);return getAsset(String(existing.id))!;}
  const extension=path.extname(input.filename).toLowerCase();
  const video=videoExtensions.has(extension);
  if(!video&&!imageExtensions.has(extension)) throw new ImportError('Use an image or MP4, MOV, M4V, or WebM video.');
  const id=randomUUID();const root=initializeStorage();
  const relative=`assets/${id}${extension}`;
  await writeFile(path.join(root,relative),input.bytes);
  let width:number|null=null,height:number|null=null,duration:number|null=null,thumbnailPath:string|null=null;
  if(!video) {
    try {
      const meta=await sharp(input.bytes).metadata();width=meta.autoOrient?.width||meta.width||null;height=meta.autoOrient?.height||meta.height||null;
      thumbnailPath=`thumbnails/${id}.jpg`;
      await sharp(input.bytes).rotate().resize({width:720,height:1000,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85}).toFile(path.join(root,thumbnailPath));
    } catch { throw new ImportError(`Could not read image ${input.filename}. Try a JPEG or PNG export.`); }
  } else {
    try {
      const result=await exec('ffprobe',['-v','error','-show_entries','stream=width,height:format=duration','-of','json',path.join(root,relative)],{timeout:15000});
      const meta=JSON.parse(result.stdout);const stream=meta.streams?.find((item:{width?:number})=>item.width);
      width=stream?.width||null;height=stream?.height||null;duration=Number(meta.format?.duration)||null;
      thumbnailPath=`thumbnails/${id}.jpg`;
      await exec('ffmpeg',['-v','error','-y','-ss','0.2','-i',path.join(root,relative),'-frames:v','1','-vf','scale=480:-2',path.join(root,thumbnailPath)],{timeout:20000});
    } catch { /* Videos remain usable when ffprobe is not installed. */ }
  }
  const orientation=width&&height?(width===height?'square':width>height?'landscape':'portrait'):null;
  db.prepare(`INSERT OR IGNORE INTO assets (id,appId,filename,path,type,category,description,orientation,width,height,duration,contentHash,createdAt,sourceKind,sourceKey,thumbnailPath)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,input.appId,path.basename(input.filename),relative,video?'video':'image',input.category,input.description||'',orientation,width,height,duration,hash,new Date().toISOString(),input.sourceKind,input.sourceKey,thumbnailPath);
  const saved=db.prepare('SELECT id FROM assets WHERE appId=? AND contentHash=?').get(input.appId,hash)!;
  return getAsset(String(saved.id))!;
}
export async function syncStoreAssets(appId:string) {
  const app=getApp(appId);if(!app)throw new ImportError('App not found.',404);
  const added:Asset[]=[];
  for(const [index,relative] of [...app.screenshots,...(app.iconPath?[app.iconPath]:[])].entries()) {
    const icon=relative===app.iconPath;
    const bytes=await readFile(path.join(dataRoot(),relative));
    added.push(await registerAsset({appId,bytes,filename:`${icon?'app-icon':`store-screenshot-${index+1}`}${path.extname(relative)}`,category:icon?'BRAND':'PRODUCT',sourceKind:'app-store',sourceKey:relative,description:icon?`${app.name} app icon`:`${app.name} current App Store screenshot ${index+1}`}));
  }
  const ids=new Set(added.map(asset=>asset.id));
  // Retain superseded files for existing projects, exclude them from new work.
  for(const row of getDatabase().prepare("SELECT id FROM assets WHERE appId=? AND sourceKind='app-store'").all(appId)) {
    getDatabase().prepare('UPDATE assets SET active=? WHERE id=?').run(ids.has(String(row.id))?1:0,row.id);
  }
  return added;
}
export async function localFolders() {
  try {return (await readdir(path.join(process.cwd(),'Apps'),{withFileTypes:true})).filter(entry=>entry.isDirectory()&&!entry.name.startsWith('.')).map(entry=>entry.name);}
  catch {return [];}
}
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export async function syncLocalFolder(appId:string, folder?:string) {
  const app=getApp(appId);if(!app)throw new ImportError('App not found.',404);
  const folders=await localFolders();
  const chosen=folder ?? app.sourceFolder ?? folders.find(name=>normalize(name)===normalize(app.name)) ?? folders.find(name=>normalize(name).length>=3&&normalize(app.name).startsWith(normalize(name))) ?? null;
  if(!chosen)return {folder:null,imported:0,warnings:[] as string[]};
  if(!folders.includes(chosen))throw new ImportError('Choose one of the local app folders.');
  const base=await realpath(path.join(process.cwd(),'Apps',chosen));
  const appsRoot=await realpath(path.join(process.cwd(),'Apps'));
  if(!base.startsWith(appsRoot+path.sep))throw new ImportError('Invalid app folder.');
  getDatabase().prepare('UPDATE apps SET sourceFolder=? WHERE id=?').run(chosen,appId);
  const warnings:string[]=[];let imported=0;let visited=0;
  async function walk(directory:string,depth=0) {
    if(depth>16)return;
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
      const absolute=path.join(directory,entry.name);
      if(entry.isDirectory()){if(!/canvas assets/i.test(entry.name))await walk(absolute,depth+1);continue;}
      if(!entry.isFile())continue;
      const ext=path.extname(entry.name).toLowerCase();if(!imageExtensions.has(ext)&&!videoExtensions.has(ext))continue;
      if(++visited>5000){if(visited===5001)warnings.push('Only the first 5,000 media files were checked. Split larger folders.');continue;}
      try {
        const file=await stat(absolute);
        if(file.size>150_000_000){warnings.push(`${entry.name}: larger than 150 MB.`);continue;}
        const relative=path.relative(base,absolute);
        const sourceKey=path.join(chosen!,relative);
        const previous=getDatabase().prepare('SELECT * FROM asset_sources WHERE appId=? AND sourceKey=?').get(appId,sourceKey);
        if(previous?.size===file.size&&previous?.modified===file.mtimeMs){imported++;continue;}
        const saved=await registerAsset({appId,bytes:await readFile(absolute),filename:entry.name,category:/canvas assets/i.test(relative)?'OTHER':/brand|logo|icon/i.test(relative)?'BRAND':videoExtensions.has(ext)?'DEMO':/template/i.test(relative)?'TEMPLATE':'OTHER',sourceKind:'local',sourceKey:path.join(chosen!,relative),description:`Local app asset: ${relative}`});
        getDatabase().prepare('INSERT INTO asset_sources(appId,sourceKey,assetId,size,modified) VALUES(?,?,?,?,?) ON CONFLICT(appId,sourceKey) DO UPDATE SET assetId=excluded.assetId,size=excluded.size,modified=excluded.modified').run(appId,sourceKey,saved.id,file.size,file.mtimeMs);
        imported++;
      } catch(error){warnings.push(error instanceof Error?error.message:`Could not import ${entry.name}`);}
    }
  }
  await walk(base);
  // Raw layer files are useful building blocks, not completed template previews.
  getDatabase().prepare("UPDATE assets SET category='OTHER' WHERE appId=? AND sourceKind='local' AND lower(sourceKey) LIKE '%canvas assets%'").run(appId);
  for(const asset of listAssets(appId).filter(a=>a.type==='video'&&!a.thumbnailPath)){
    try{const thumbnailPath=`thumbnails/${asset.id}.jpg`;await exec('ffmpeg',['-v','error','-y','-ss','0.2','-i',path.join(dataRoot(),asset.path),'-frames:v','1','-vf','scale=480:-2',path.join(dataRoot(),thumbnailPath)],{timeout:15000});getDatabase().prepare('UPDATE assets SET thumbnailPath=? WHERE id=?').run(thumbnailPath,asset.id);}catch{}
  }
  return {folder:chosen,imported,warnings};
}
export async function syncAssets(appId:string,folder?:string) {
  await syncStoreAssets(appId);
  const local=await syncLocalFolder(appId,folder);
  return {...local,assets:listAssets(appId)};
}
