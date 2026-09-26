import {createBulkProjects} from '@/lib/server/bulk-projects';
import {apiError,mutationGuard} from '@/lib/server/http';
export async function POST(request:Request){const blocked=mutationGuard(request);if(blocked)return blocked;try{return Response.json(await createBulkProjects(await request.json()));}catch(error){return apiError(error);}}
