'use client';
import {useEffect,useState} from 'react';
import type {TemplateVideo} from '@/lib/template-video';
import type {HookVideo} from '@/lib/hook-video';
import styles from './video-workspace.module.css';
import {assetUrl} from './asset-library';
export function useLatestVideoBatch(appId:string,kind:string){
 const key=`forge-latest-${kind}-${appId}`;
 const [ids,setIds]=useState<string[]>([]);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'[]');setIds(Array.isArray(saved)?saved:[]);}catch{setIds([]);}},[key]);
 function remember(items:{id:string}[]){const next=items.map(v=>v.id);setIds(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{}}
 return {ids,remember};
}
export function VideoResults<T extends TemplateVideo|HookVideo>({videos,latestIds,busy,onEdit,onRender,endpoint}:{videos:T[];latestIds:string[];busy:boolean;onEdit:(video:T)=>void;onRender:(items:T[])=>void;endpoint:string}){
 const [latestOnly,setLatestOnly]=useState(false),[page,setPage]=useState(0);
 const batchKey=latestIds.join(',');
 useEffect(()=>{setPage(0);setLatestOnly(false);},[batchKey]);
 const latest=new Set(latestIds),items=videos.filter(v=>!latestOnly||latest.has(v.id)).sort((a,b)=>Number(latest.has(b.id))-Number(latest.has(a.id))||b.createdAt.localeCompare(a.createdAt));
 const newestCount=videos.filter(v=>latest.has(v.id)).length,currentPage=Math.min(page,Math.max(0,Math.ceil(items.length/12)-1));
 return <section aria-label="Created videos" className={styles.results}><div className={styles.resultHeader}><h3>Videos · {videos.length}</h3><div>{newestCount>0&&<button className="button secondary" aria-pressed={latestOnly} onClick={()=>{setLatestOnly(v=>!v);setPage(0);}}>{latestOnly?'All videos':`Latest ${newestCount}`}</button>}<button className="button secondary" disabled={busy||!videos.some(v=>v.status!=='ready')} onClick={()=>onRender(videos.filter(v=>v.status!=='ready'))}>Finish pending</button></div></div>
 {!items.length&&<p className={styles.notice}>New videos appear here.</p>}
 <div className={styles.gallery}>{items.slice(currentPage*12,currentPage*12+12).map(v=>{const text='headline' in v.plan?v.plan.headline:('text' in v.plan.clips[0]?v.plan.clips[0].text:'');return <article key={v.id} className={`${styles.card} ${latest.has(v.id)?styles.latest:''}`}><button className={styles.poster} aria-label={`Preview ${v.name}`} disabled={busy} onClick={()=>onEdit(v)}><img width={36} height={64} src={assetUrl(v.plan.clips[0].assetId,true)} alt="" loading="lazy"/><span>▶</span></button><strong title={text||v.name}>{text||v.name}</strong><small>{latest.has(v.id)&&<b className={styles.badge}>New</b>}{v.status} · <time dateTime={v.createdAt}>{new Date(v.createdAt).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</time></small><div className={styles.actions}><button disabled={busy} onClick={()=>onEdit(v)}>Edit / preview</button>{v.renderPath?<a href={`/api/${endpoint}/${v.id}/download`} download>↓ MP4</a>:<button disabled={busy} onClick={()=>onRender([v])}>Render</button>}</div></article>;})}</div>
 {items.length>12&&<div className={styles.pager}><button aria-label="Previous video page" disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>←</button><span>{currentPage+1} / {Math.ceil(items.length/12)}</span><button aria-label="Next video page" disabled={(currentPage+1)*12>=items.length} onClick={()=>setPage(currentPage+1)}>→</button></div>}</section>;
}
