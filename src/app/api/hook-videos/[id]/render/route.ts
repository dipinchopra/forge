import {renderHookVideo} from '@/lib/server/hook-videos';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(await renderHookVideo((await params).id));}catch(error){return apiError(error);}}
