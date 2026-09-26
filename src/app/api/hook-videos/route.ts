import {z} from 'zod';
import {generateHookVideos,listHookVideos} from '@/lib/server/hook-videos';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function GET(request:Request){try{return Response.json(listHookVideos(z.uuid().parse(new URL(request.url).searchParams.get('appId'))));}catch(error){return apiError(error);}}
export async function POST(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(generateHookVideos(await request.json()));}catch(error){return apiError(error);}}
