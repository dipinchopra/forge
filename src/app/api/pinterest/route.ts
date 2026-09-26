import {z} from 'zod';
import {importPinterest} from '@/lib/server/pinterest';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function POST(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{const input=z.object({appId:z.uuid(),query:z.string().trim().min(1).max(200),boardUrl:z.url().optional()}).parse(await request.json());return Response.json({assets:await importPinterest(input.appId,input.query,input.boardUrl)});}catch(error){return apiError(error);}}
