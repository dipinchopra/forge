import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {initializeStorage} from './storage';
import {ImportError} from './import-errors';
import {registerAsset} from './assets';
import {getDatabase} from './database';
export interface PinterestImage {url:string;sourceUrl:string;title:string;}
const generic=new Set(['a','an','the','and','or','for','of','in','on','with','my','your','this','that','from','to','how','ideas','idea','aesthetic','inspiration','photo','photos','photography','image','images','board','boards','pinterest']);
function words(value:string){return [...new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).map(w=>w.replace(/s$/,'')).filter(w=>w.length>2&&!generic.has(w)&&!generic.has(w+'s')))];}
export function rankPinterestImages(images:PinterestImage[],query:string){
 const terms=words(query);if(!terms.length)return [];
 return images.filter(image=>!/^Image from https:/i.test(image.title)).map(image=>{const title=words(image.title),matches=terms.filter(term=>title.includes(term));return {image,score:matches.length/terms.length};}).filter(item=>item.score>=0.5).sort((a,b)=>b.score-a.score).map(item=>item.image);
}
export function pinterestSearchQueries(query:string){const terms=words(query);return [...new Set([query.trim(),terms.slice(0,3).join(' '),terms.slice(0,2).join(' ')])].filter(Boolean).slice(0,3);}
export function conceptImageQuery(concept:{imageQuery?:string;title:string;angle?:string;outline?:string[]}){
 const existing=concept.imageQuery||'',genericCopy=/^(photo|collage|seamless|carousel|instagram|layout|template|app|design|content|social|marketing|editor|editorial|aesthetic|inspiration|ideas|and|for|the|maker|editing|scrapbook)s?$/i;
 if(existing.split(/\s+/).some(w=>w&&!genericCopy.test(w)))return existing;
 const context=[concept.title,concept.angle,...(concept.outline||[])].join(' ').toLowerCase();
 const subjects:[RegExp,string][]=[[/beach|ocean|coastal/,'beach vacation'],[/cafe|coffee/,'coffee cafe'],[/travel|trip|vacation/,'travel photography'],[/flower|floral/,'flower photography'],[/ceramic|pottery|mug/,'ceramic mugs'],[/bedroom/,'bedroom decor'],[/food|recipe|meal/,'food photography'],[/fashion|outfit/,'fashion outfits'],[/landscape|mountain/,'landscape photography'],[/wedding/,'wedding photography']];
 return subjects.find(([match])=>match.test(context))?.[1]||existing||concept.title;
}
function allowed(raw:string,media=false){const url=new URL(raw);if(url.protocol!=='https:'||url.port||url.username||url.password||!(media?url.hostname==='i.pinimg.com':url.hostname==='www.pinterest.com'||url.hostname==='pinterest.com'||url.hostname==='html.duckduckgo.com'))throw new ImportError('Only public Pinterest boards and Pinterest image hosts are supported.');return url;}
async function fetchPublic(raw:string,media=false){let url=allowed(raw,media);for(let redirects=0;redirects<4;redirects++){
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Mozilla/5.0 (compatible; ForgeLocal/1.0)','Accept':media?'image/*':'text/html'}});
 if(response.status===202)throw new ImportError('Public search requested verification. Forge cannot crawl that response.',502);
 if(response.status>=300&&response.status<400){url=allowed(new URL(response.headers.get('location')||'',url).href,media);continue;}
 if(!response.ok)throw new ImportError(`Pinterest returned ${response.status}. Public access may be blocked; try another topic or your local library.`,502);
 const reader=response.body?.getReader();if(!reader)throw new ImportError('Pinterest returned an empty page.',502);const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>15_000_000)throw new ImportError('Pinterest response was too large.');chunks.push(next.value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks);
 }throw new ImportError('Pinterest redirected too many times.',502);}
function decoded(html:string){return html.replaceAll('\\u002F','/').replaceAll('\\/','/').replaceAll('&amp;','&').replaceAll('\\u0026','&');}
export function boardLinks(html:string){const text=decoded(html);const links=new Set<string>();for(const match of text.matchAll(/(?:href=["']|"url"\s*:\s*")(https:\/\/(?:www\.)?pinterest\.com)?(\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/)["']/g)){if(!/^\/(search|pin|ideas|login|settings|business|today)\//i.test(match[2]))links.add('https://www.pinterest.com'+match[2]);}return [...links].slice(0,6);}
export function boardImages(html:string,sourceUrl:string):PinterestImage[]{
 const embedded=html.match(/<script[^>]*id=["']__PWS_INITIAL_PROPS__["'][^>]*>([\s\S]*?)<\/script>/i);
 if(embedded){try{
  const data=JSON.parse(embedded[1]);const pins:Record<string,unknown>={...data.initialReduxState?.pins};
  function collect(value:unknown,depth=0){if(!value||typeof value!=='object'||depth>12)return;const object=value as Record<string,unknown>;if(object.type==='pin'&&object.id&&object.images)pins[String(object.id)]=object;for(const child of Object.values(object))collect(child,depth+1);}collect(data);
  const found:PinterestImage[]=[];
  for(const pin of Object.values(pins) as {type?:string;id?:string;videos?:unknown;description?:string;images?:Record<string,{url:string;width:number;height:number}>}[]){
   if(pin.type!=='pin'||pin.videos||!pin.id||!pin.images)continue;
   const best=Object.values(pin.images).filter(image=>image.width>=400&&image.height>=400&&image.url.startsWith('https://i.pinimg.com/')).sort((a,b)=>b.width-a.width)[0];
   if(best)found.push({url:best.url,sourceUrl:`https://www.pinterest.com/pin/${pin.id}/`,title:pin.description?.slice(0,160)||'Image from '+sourceUrl});
  }if(found.length)return [...new Map(found.map(image=>[image.sourceUrl,image])).values()].slice(0,24);
 }catch{}}
 return []; // Do not substitute avatars or unrelated recommendation images.
}

export function discoverBoardLinks(html:string){
 const links=new Set<string>();for(const match of html.matchAll(/uddg=([^&"<>]+)/g)){
  try{const url=new URL(decodeURIComponent(match[1]));if(!/^(?:[a-z]+\.)?pinterest\.com$/.test(url.hostname)||!/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/$/.test(url.pathname)||/^\/(pin|ideas|search)\//.test(url.pathname))continue;links.add('https://www.pinterest.com'+url.pathname);}catch{}
 }return [...links].slice(0,6);
}
export async function crawlPinterest(query:string,boardUrl?:string){
 if(boardUrl){const board=new URL(boardUrl);if(board.protocol!=='https:'||board.port||board.username||board.password||!/^(?:[a-z]+\.)?pinterest\.com$/.test(board.hostname)||!/^\/[^/]+\/[^/]+\/?$/.test(board.pathname)||/^\/(pin|ideas|search|login)\//.test(board.pathname))throw new ImportError('Enter a public Pinterest board URL.');boardUrl='https://www.pinterest.com'+board.pathname;}
 const root=initializeStorage(),key=createHash('sha256').update('relevance-v3|'+query+'|'+(boardUrl||'')).digest('hex'),file=path.join(root,'cache',`pinterest-${key}.json`);
 try{const cached=JSON.parse(await readFile(file,'utf8'));if(Date.now()-cached.time<86_400_000)return cached.images as PinterestImage[];}catch{}
 const images:PinterestImage[]=[],visited=new Set<string>(),failures:string[]=[];let discoveryBlocked=false;
 async function page(url:string){try{const html=(await fetchPublic(url)).toString();if(url.includes('/search/')&&html.includes('__PWS_INITIAL_PROPS__')&&!boardLinks(html).length&&!boardImages(html,url).length)failures.push('Pinterest returned an empty public search shell');return html;}catch(error){failures.push(error instanceof Error?error.message:'Public page unavailable');if(url.includes('duckduckgo.com'))discoveryBlocked=true;return '';}}
 async function readBoards(boards:string[]){const pending=boards.filter(b=>!visited.has(b)).slice(0,Math.max(0,12-visited.size));for(let i=0;i<pending.length;i+=3){const group=pending.slice(i,i+3);group.forEach(b=>visited.add(b));const pages=await Promise.all(group.map(page));pages.forEach((html,j)=>images.push(...boardImages(html,group[j])));}}
 if(boardUrl)await readBoards([allowed(boardUrl).href]);
 else for(const search of pinterestSearchQueries(query)){
  const searchUrl=`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(search.slice(0,200))}`;
  const [pins,boards]=await Promise.all([page(searchUrl),page(`https://www.pinterest.com/search/boards/?q=${encodeURIComponent(search.slice(0,200))}`)]);
  images.push(...boardImages(pins,searchUrl));await readBoards(boardLinks(boards));
  if(rankPinterestImages(images,query).length>=8)break;
  // Run discovery even when Pinterest search failed or its board results had no matches.
  const discovery=discoveryBlocked?'':await page(`https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:pinterest.com '+search.slice(0,100)+' board -inurl:pin -inurl:ideas')}`);
  await readBoards(discoverBoardLinks(discovery));if(rankPinterestImages(images,query).length>=8)break;
 }
 const unique=rankPinterestImages([...new Map(images.map(image=>[image.url,image])).values()],query).slice(0,24);
 if(!unique.length)throw new ImportError(images.length?`Pinterest returned images, but none matched “${query}”. Choose a more concrete visual topic or local assets.`:`Pinterest exposed no readable images for “${query}” after public search and board discovery.${failures.length?' Some public requests were blocked or timed out.':''} Try a public board URL or local assets.`,502);
 await writeFile(file,JSON.stringify({time:Date.now(),images:unique}));return unique;
}
export async function importPinterest(appId:string,query:string,boardUrl?:string){
 const candidates=await crawlPinterest(query,boardUrl);const assets=[];
 for(const candidate of candidates){
  if(assets.length>=8)break;
  try{const bytes=await sharp(await fetchPublic(candidate.url,true)).rotate().resize({width:1600,height:2000,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
   const asset=await registerAsset({appId,bytes,filename:`pinterest-${createHash('sha256').update(candidate.url).digest('hex').slice(0,12)}.jpg`,category:'OTHER',sourceKind:'pinterest',sourceKey:candidate.url,description:candidate.title});
   getDatabase().prepare('UPDATE assets SET description=? WHERE id=?').run(candidate.title,asset.id);asset.description=candidate.title;
   getDatabase().prepare('UPDATE assets SET sourceUrl=?,attribution=? WHERE id=?').run(candidate.sourceUrl,'Public Pinterest board; reuse rights not verified.',asset.id);assets.push(asset);
  }catch{}
 }
 if(!assets.length)throw new ImportError('Pinterest images could not be downloaded. No unrelated images were substituted.',502);return assets;
}
