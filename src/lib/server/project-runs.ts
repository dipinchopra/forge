import {createHash} from 'node:crypto';
import type {ConceptBatch} from '../creative';
import {getDatabase} from './database';
import {ImportError} from './import-errors';

// A new click uses a new run id; retrying that same click reuses its saved drafts.
export function projectRunBatch(source:ConceptBatch,runId:string|undefined,options:unknown):ConceptBatch{
 if(!runId)return source;
 const signature=createHash('sha256').update(JSON.stringify({sourceId:source.id,options})).digest('hex'),db=getDatabase();
 const input={...source.input,buildSignature:signature};
 db.prepare('INSERT OR IGNORE INTO concept_batches(id,appId,input,concepts,provider,createdAt) VALUES(?,?,?,?,?,?)').run(runId,source.appId,JSON.stringify(input),JSON.stringify(source.concepts),'project-run',new Date().toISOString());
 const row=db.prepare('SELECT * FROM concept_batches WHERE id=?').get(runId)!;
 const stored=JSON.parse(String(row.input));if(stored.buildSignature!==signature||row.appId!==source.appId)throw new ImportError('This build identifier belongs to another selection. Start a new build.',409);
 return {...source,id:runId,input:stored,concepts:JSON.parse(String(row.concepts)),provider:'project-run'};
}
