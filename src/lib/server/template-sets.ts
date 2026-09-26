import { createHash } from 'node:crypto';
import { getDatabase } from './database';
import { getAsset } from './assets';
import type { TemplateSet } from '../template-video';
export function listTemplateSets(appId:string):TemplateSet[] {
 const groups=new Map<string, {key:string;name:string;entries:{assetId:string;filename:string}[]}>();
 for(const row of getDatabase().prepare('SELECT sourceKey,assetId FROM asset_sources WHERE appId=? ORDER BY sourceKey').all(appId)) {
  const source=String(row.sourceKey).replaceAll('\\','/');
  const match=source.match(/^(.*)\/Display Images?\/([^/]+)$/i);if(!match)continue;
  const asset=getAsset(String(row.assetId));if(!asset||asset.type!=='image')continue;
  const folder=match[1];const group=groups.get(folder)||{key:createHash('sha256').update(folder).digest('hex').slice(0,24),name:folder.split('/').slice(-4).join(' / '),entries:[]};
  group.entries.push({assetId:asset.id,filename:match[2]});groups.set(folder,group);
 }
 return [...groups.entries()].map(([source,group])=>({key:group.key,name:group.name,source,slides:group.entries.sort((a,b)=>a.filename.localeCompare(b.filename,undefined,{numeric:true})).map(entry=>entry.assetId)}));
}
