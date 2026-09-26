import {randomUUID} from 'node:crypto';
import type {OutputType} from '../models';
import type {Concept,ConceptBatch} from '../creative';
import {getApp} from './apps';
import {getDatabase} from './database';
import {getBatch} from './creatives';
import {ImportError} from './import-errors';
export function ideaBank(appId:string,type:OutputType):ConceptBatch {
 const app=getApp(appId);if(!app)throw new ImportError('App not found.',404);
 const rows=getDatabase().prepare('SELECT id FROM concept_batches WHERE appId=? AND json_extract(input,\'$.type\')=? AND createdAt>=? ORDER BY createdAt DESC LIMIT 20').all(appId,type,app.updatedAt);
 for(const row of rows){const batch=getBatch(String(row.id));if(batch&&batch.concepts.length>=10&&batch.input.formula&&['codex','profile-v2'].includes(batch.provider))return batch;}
 const subjects=[...app.contentAngles,...app.features,...app.keywords].filter(Boolean);const topic=(i:number)=>subjects[i%Math.max(subjects.length,1)]||app.oneLineDescription||app.name;
 const concepts:Concept[]=Array.from({length:12},(_,i)=>{
  const subject=topic(i);const short=subject.split(/\s+/).slice(0,9).join(' ');
  return {imageQuery:app.keywords.slice(0,3).join(' ').slice(0,80),title:short.slice(0,70),hook:i<6?short:`Try this: ${short.split(' ').slice(0,6).join(' ')}`,angle:subject.slice(0,160),outline:['Show the problem','Give one clear fix','Show the app in use',`Try ${app.name}`.slice(0,90)],assetIds:[]};
 });
 const batch:ConceptBatch={id:randomUUID(),appId,input:{appId,type,start:'surprise',idea:'',selectedAssetIds:[],imageSource:'local',formula:'hpsc'},concepts,provider:'profile-v2',createdAt:new Date().toISOString()};
 getDatabase().prepare('INSERT INTO concept_batches(id,appId,input,concepts,provider,createdAt) VALUES(?,?,?,?,?,?)').run(batch.id,appId,JSON.stringify(batch.input),JSON.stringify(concepts),batch.provider,batch.createdAt);
 return batch;
}
