import type {Asset} from '../models';
import {importPinterest} from './pinterest';
import {ImportError} from './import-errors';
export interface ImageSourcing {requested:'pinterest'|'local';status:'pinterest'|'local'|'fallback';query:string;warning?:string;}
export async function sourceProjectImages(appId:string,source:'pinterest'|'local',query:string,boardUrl?:string,importer=importPinterest):Promise<{assets:Asset[];sourcing:ImageSourcing}>{
 if(source==='local')return {assets:[],sourcing:{requested:source,status:'local',query}};
 try{return {assets:await importer(appId,query,boardUrl),sourcing:{requested:source,status:'pinterest',query}};}
 catch(error){if(!(error instanceof ImportError)||error.status!==502)throw error;
  return {assets:[],sourcing:{requested:source,status:'fallback',query,warning:`Pinterest images unavailable for “${query}”. This draft uses relevant app assets where possible; unmatched slides are left without an image. ${error.message}`}};
 }
}
