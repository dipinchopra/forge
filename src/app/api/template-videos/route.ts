import { z } from 'zod';
import { generateVideoPlans,listTemplateVideos } from '@/lib/server/template-videos';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function GET(request:Request){try{return Response.json(listTemplateVideos(z.uuid().parse(new URL(request.url).searchParams.get('appId'))));}catch(error){return apiError(error);}}
export async function POST(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(await generateVideoPlans(await request.json()));}catch(error){return apiError(error);}}
