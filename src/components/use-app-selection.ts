'use client';
import {useEffect,useState} from 'react';
import type {App} from '@/lib/models';
export function useAppSelection(apps:App[],preferred?:string){
 const [appId,update]=useState(preferred||apps.find(a=>a.sourceFolder)?.id||apps[0]?.id||'');
 useEffect(()=>{try{const saved=preferred||localStorage.getItem('forge.selectedApp');if(saved&&apps.some(app=>app.id===saved))update(saved);}catch{}},[apps,preferred]);
 function setAppId(id:string){update(id);try{localStorage.setItem('forge.selectedApp',id);}catch{}}
 return [appId,setAppId] as const;
}
