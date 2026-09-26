import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {initializeStorage} from './storage';
import {ImportError} from './import-errors';
import {registerAsset} from './assets';
import {getDatabase} from './database';

export interface DupeImage {id:string;imageId:string;previewId:string;sourceUrl:string;title:string;creator:string;width:number;height:number;}
const api='https://content-api-prod-6gxsdymdsq-ue.a.run.app/api/v1/content/search';
const cdn='https://d3p3fw3rutb1if.cloudfront.net/photos/';
const generic=new Set(['a','an','the','and','or','for','of','in','on','with','my','your','this','that','from','to','how','ideas','idea','aesthetic','inspiration','photo','photos','photography','image','images','dupe']);
function words(value:string){return [...new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).map(w=>w.replace(/s$/,'')).filter(w=>w.length>2&&!generic.has(w)&&!generic.has(w+'s')))];}
function imageUrl(id:string){if(!/^[a-f0-9-]{36}$/i.test(id))throw new ImportError('Dupe returned an invalid image id.',502);return cdn+id;}
function parse(row:Record<string,unknown>,query:string):DupeImage|null{
 if(row.content_type!=='PHOTO'||typeof row.id!=='string'||typeof row.img_id!=='string'||typeof row.img_preview_id!=='string')return null;
 const width=Number(row.img_width)||0,height=Number(row.img_height)||0;if(width<500||height<500)return null;
 const creator=typeof row.user==='string'?row.user.trim():'';const username=typeof row.username==='string'?row.username.trim():'';
 const labels=Array.isArray(row.labels)?row.labels.map((label:unknown)=>typeof label==='object'&&label&&'label' in label?String((label as {label:unknown}).label):'').filter(Boolean):[];
 const aesthetics=Array.isArray(row.aesthetics)?row.aesthetics.map((item:unknown)=>typeof item==='object'&&item&&'aesthetic' in item?String((item as {aesthetic:unknown}).aesthetic):'').filter(Boolean):[];
 const title=[typeof row.title==='string'?row.title:'',typeof row.description==='string'?row.description:'',...labels,...aesthetics].filter(Boolean).join(' · ')||query;
 return {id:row.id,imageId:row.img_id,previewId:row.img_preview_id,sourceUrl:`https://dupephotos.com/results?search=${encodeURIComponent(query)}`,title:title.slice(0,180),creator:creator||username,width,height};
}
export function rankDupeImages(images:DupeImage[],query:string){
 const terms=words(query);if(!terms.length)return images;
 return images.map(image=>{const haystack=words([image.title,image.creator].join(' '));const matches=terms.filter(term=>haystack.includes(term));return {image,score:matches.length/terms.length};}).sort((a,b)=>b.score-a.score).map(item=>item.image);
}
async function fetchJson(query:string,page=1){
 const response=await fetch(api,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','User-Agent':'ForgeLocal/1.0'},body:JSON.stringify({label:query,orientation:'All',sort_by:'Newest',page,content_type:'PHOTO'})});
 if(!response.ok)throw new ImportError(`Dupe returned ${response.status}. Try local images or a simpler topic.`,502);
 const data=await response.json();if(!Array.isArray(data))throw new ImportError('Dupe returned an unreadable response.',502);
 return data as Record<string,unknown>[];
}
export async function crawlDupe(query:string){
 const root=initializeStorage(),key=createHash('sha256').update('dupe-v1|'+query).digest('hex'),file=path.join(root,'cache',`dupe-${key}.json`);
 try{const cached=JSON.parse(await readFile(file,'utf8'));if(Date.now()-cached.time<43_200_000)return cached.images as DupeImage[];}catch{}
 const rows=[...(await fetchJson(query,1)),...(await fetchJson(query,2).catch(()=>[]))];
 const parsed=rows.map(row=>parse(row,query)).filter(Boolean) as DupeImage[];
 const images=rankDupeImages([...new Map(parsed.map(image=>[image.imageId,image])).values()],query).slice(0,24);
 if(!images.length)throw new ImportError(`Dupe returned no readable photos for “${query}”. Try a more concrete subject or local assets.`,502);
 await writeFile(file,JSON.stringify({time:Date.now(),images}));return images;
}
export async function importDupe(appId:string,query:string){
 const candidates=await crawlDupe(query);const assets=[];
 for(const candidate of candidates){
  if(assets.length>=8)break;
  try{const raw=await fetch(imageUrl(candidate.imageId),{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'ForgeLocal/1.0','Accept':'image/*'}});
   if(!raw.ok)continue;
   const bytes=await sharp(Buffer.from(await raw.arrayBuffer())).rotate().resize({width:1800,height:2200,fit:'inside',withoutEnlargement:true}).jpeg({quality:91}).toBuffer();
   const asset=await registerAsset({appId,bytes,filename:`dupe-${createHash('sha256').update(candidate.imageId).digest('hex').slice(0,12)}.jpg`,category:'OTHER',sourceKind:'dupe',sourceKey:candidate.imageId,description:candidate.title});
   getDatabase().prepare('UPDATE assets SET sourceUrl=?,attribution=?,description=? WHERE id=?').run(candidate.sourceUrl,`Dupe photo${candidate.creator?` by ${candidate.creator}`:''}; free commercial use under Dupe License.`,candidate.title,asset.id);
   asset.sourceUrl=candidate.sourceUrl;asset.attribution=`Dupe photo${candidate.creator?` by ${candidate.creator}`:''}; free commercial use under Dupe License.`;asset.description=candidate.title;assets.push(asset);
  }catch{}
 }
 if(!assets.length)throw new ImportError('Dupe photos could not be downloaded. No unrelated images were substituted.',502);return assets;
}
