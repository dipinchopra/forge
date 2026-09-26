import { videoPlanSchema } from '@/lib/template-video';
import { updateVideoPlan } from '@/lib/server/template-videos';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(updateVideoPlan((await params).id,videoPlanSchema.parse(await request.json())));}catch(error){return apiError(error);}}
