import type {Asset} from '../models';
import {importPinterest} from './pinterest';
import {importDupe} from './dupe';
import {ImportError} from './import-errors';
export type ProjectImageSource='dupe'|'pinterest'|'local';
export interface ImageSourcing {requested:ProjectImageSource;status:'dupe'|'pinterest'|'local'|'fallback';query:string;warning?:string;}
export async function sourceProjectImages(appId:string,source:ProjectImageSource,query:string,boardUrl?:string,importer?:typeof importPinterest):Promise<{assets:Asset[];sourcing:ImageSourcing}>{
 if(source==='local')return {assets:[],sourcing:{requested:source,status:'local',query}};
 try{if(source==='dupe')return {assets:await importDupe(appId,query),sourcing:{requested:source,status:'dupe',query}};
  return {assets:await (importer||importPinterest)(appId,query,boardUrl),sourcing:{requested:source,status:'pinterest',query}};}
 catch(error){if(!(error instanceof ImportError)||error.status!==502)throw error;
  const label=source==='dupe'?'Dupe photos':'Pinterest images';
  return {assets:[],sourcing:{requested:source,status:'fallback',query,warning:`${label} unavailable for “${query}”. This draft uses relevant app assets where possible; unmatched slides are left without an image. ${error.message}`}};
 }
}
