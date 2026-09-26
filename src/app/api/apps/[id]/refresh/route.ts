import { refreshStore } from '@/lib/server/store-refresh';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const blocked=mutationGuard(request);if(blocked)return blocked;
 try {return Response.json(await refreshStore((await params).id));}catch(error){return apiError(error);}
}
