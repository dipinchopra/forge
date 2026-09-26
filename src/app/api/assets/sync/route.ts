import { z } from 'zod';
import { syncAssets } from '@/lib/server/assets';
import { apiError, mutationGuard } from '@/lib/server/http';
export async function POST(request:Request) {
  const blocked=mutationGuard(request);if(blocked)return blocked;
  try {const {appId,folder}=z.object({appId:z.uuid(),folder:z.string().max(200).optional()}).parse(await request.json());return Response.json(await syncAssets(appId,folder));}
  catch(error){return apiError(error);}
}
