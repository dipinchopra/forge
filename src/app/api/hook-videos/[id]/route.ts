import {hookPlanSchema} from '@/lib/hook-video';
import {updateHookVideo} from '@/lib/server/hook-videos';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(updateHookVideo((await params).id,hookPlanSchema.parse(await request.json())));}catch(error){return apiError(error);}}
