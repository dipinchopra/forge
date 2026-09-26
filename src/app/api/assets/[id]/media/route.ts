import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { getAsset } from '@/lib/server/assets';
import { dataRoot } from '@/lib/server/storage';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const asset=getAsset((await params).id);if(!asset)return new Response('Not found',{status:404});
  const thumb=new URL(request.url).searchParams.has('thumbnail')&&asset.thumbnailPath;
  try {
    const root=await realpath(dataRoot());const absolute=await realpath(path.join(root,thumb||asset.path));
    if(!absolute.startsWith(root+path.sep))return new Response('Not found',{status:404});
    const bytes=await readFile(absolute);
    const ext=path.extname(absolute).slice(1);const types:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif',heic:'image/heic',tif:'image/tiff',tiff:'image/tiff',mp4:'video/mp4',mov:'video/quicktime',m4v:'video/mp4',webm:'video/webm'};
    const headers={'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    const range=request.headers.get('range');
    if(range) {
      const match=/^bytes=(\d+)-(\d*)$/.exec(range);
      if(!match)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
      const start=Number(match[1]),end=match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
      if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
      return new Response(bytes.subarray(start,end+1),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':String(end-start+1)}});
    }
    return new Response(bytes,{headers});
  } catch{return new Response('Not found',{status:404});}
}
