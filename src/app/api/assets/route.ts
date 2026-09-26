import { listAssets, localFolders } from '@/lib/server/assets';
import { getApp } from '@/lib/server/apps';
import { apiError } from '@/lib/server/http';
import { z } from 'zod';
export async function GET(request:Request) {
  try {
    const url=new URL(request.url);const appId=z.uuid().parse(url.searchParams.get('appId'));
    if(!getApp(appId))return Response.json({error:'App not found.'},{status:404});
    return Response.json({assets:listAssets(appId,url.searchParams.get('q')||''),folders:await localFolders(),folder:getApp(appId)?.sourceFolder});
  } catch(error){return apiError(error);}
}
