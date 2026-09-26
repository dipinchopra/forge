import {z} from 'zod';
import {ideaBank} from '@/lib/server/idea-bank';
import { generateConcepts } from '@/lib/server/creatives';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function POST(request:Request) {
 const blocked=mutationGuard(request);if(blocked)return blocked;
 try {return Response.json(await generateConcepts(await request.json()));}catch(error){return apiError(error);}
}

export async function GET(request:Request){try{const url=new URL(request.url);const appId=z.uuid().parse(url.searchParams.get('appId'));const type=z.enum(['slideshow','carousel','hook-demo']).parse(url.searchParams.get('type'));return Response.json(ideaBank(appId,type));}catch(error){return apiError(error);}}
