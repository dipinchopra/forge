import {stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import path from 'node:path';
import {dataRoot} from './storage';
export function byteRange(header:string|null,size:number):{start:number;end:number}|null|'invalid'{
 if(!header)return null;const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2]))return 'invalid';
 const suffix=!match[1],start=suffix?Math.max(0,size-Number(match[2])):Number(match[1]),end=suffix?size-1:match[2]?Math.min(Number(match[2]),size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start||(suffix&&Number(match[2])===0))return 'invalid';return {start,end};
}
export async function videoResponse(request:Request,record:{id:string;renderPath:string|null}|null){
 if(!record?.renderPath)return new Response('Render this video first.',{status:404});
 try{const root=await realpath(dataRoot()),file=await realpath(path.join(root,record.renderPath));if(!file.startsWith(root+path.sep))return new Response('Not found',{status:404});const info=await stat(file),range=byteRange(request.headers.get('range'),info.size);
 const headers:Record<string,string>={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-store','Content-Disposition':`inline; filename="${record.id}.mp4"`,'X-Content-Type-Options':'nosniff'};
 if(range==='invalid')return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${info.size}`}});
 const start=range?.start||0,end=range?.end??info.size-1;headers['Content-Length']=String(end-start+1);if(range)headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
 return new Response(request.method==='HEAD'?null:Readable.toWeb(createReadStream(file,{start,end})) as ReadableStream<Uint8Array>,{status:range?206:200,headers});
 }catch{return new Response('Render file missing. Re-render this saved video.',{status:404});}
}
