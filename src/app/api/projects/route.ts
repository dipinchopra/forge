import { projectChoiceSchema } from '@/lib/creative';
import { createProject } from '@/lib/server/creatives';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function POST(request:Request) {
 const blocked=mutationGuard(request);if(blocked)return blocked;
 try {const {batchId,conceptIndex,...options}=projectChoiceSchema.parse(await request.json());return Response.json(await createProject(batchId,conceptIndex,undefined,options),{status:201});}catch(error){return apiError(error);}
}
