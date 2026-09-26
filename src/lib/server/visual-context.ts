import {createHash} from 'node:crypto';
import {access} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type {Asset} from '../models';
import {initializeStorage} from './storage';

// Contact sheets let every concept see its own candidates within the provider's image limit.
export async function visualContext(assets:Asset[],prefix='A'){
 const images=assets.filter(a=>a.type==='image'&&a.thumbnailPath).slice(0,24),root=initializeStorage(),paths:string[]=[];
 for(let start=0;start<images.length;start+=12){
  const group=images.slice(start,start+12),key=createHash('sha256').update(JSON.stringify(group.map(a=>[a.id,a.thumbnailPath]))+prefix+start+'v1').digest('hex'),file=path.join(root,'cache',`visual-${key}.jpg`);
  try{await access(file);}catch{
   const layers=[];for(const [i,a]of group.entries()){
    const art=await sharp(path.join(root,a.thumbnailPath!)).resize(240,260,{fit:'contain',background:'#171717'}).jpeg().toBuffer();
    const label=Buffer.from(`<svg width="240" height="28"><rect width="240" height="28" fill="white"/><text x="12" y="20" font-size="17" fill="black">${prefix}${start+i+1}</text></svg>`);
    layers.push({input:art,left:(i%4)*240,top:Math.floor(i/4)*288},{input:label,left:(i%4)*240,top:Math.floor(i/4)*288+260});
   }
   await sharp({create:{width:960,height:Math.ceil(group.length/4)*288,channels:3,background:'#171717'}}).composite(layers).jpeg({quality:85}).toFile(file);
  }paths.push(file);
 }
 return {paths,catalog:assets.map(a=>({id:a.id,filename:a.filename,description:a.description.slice(0,240),category:a.category,sourceKind:a.sourceKind,type:a.type,imageLabel:images.some(i=>i.id===a.id)?prefix+(images.findIndex(i=>i.id===a.id)+1):null}))};
}
