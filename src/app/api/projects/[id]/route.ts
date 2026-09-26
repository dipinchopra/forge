import { projectEditSchema } from '@/lib/creative';
import { saveProject } from '@/lib/server/creatives';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}) {
 const blocked=mutationGuard(request);if(blocked)return blocked;
 try {const {name,slides,height}=projectEditSchema.parse(await request.json());return Response.json(saveProject((await params).id,name,slides,height));}catch(error){return apiError(error);}
}
