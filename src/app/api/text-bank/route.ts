import {z} from 'zod';
import {getTextBank,refreshTextBank,saveTextBank} from '@/lib/server/text-bank';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function GET(request:Request){try{return Response.json(await getTextBank(z.uuid().parse(new URL(request.url).searchParams.get('appId'))));}catch(error){return apiError(error);}}
export async function POST(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{const {appId,kind,count}=z.object({appId:z.uuid(),kind:z.enum(['hooks','ctas']).default('hooks'),count:z.number().int().min(1).max(25).default(25)}).parse(await request.json());return Response.json(await refreshTextBank(appId,kind,count));}catch(error){return apiError(error);}}
export async function PUT(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{const {appId,...bank}=await request.json();return Response.json(await saveTextBank(z.uuid().parse(appId),bank));}catch(error){return apiError(error);}}
