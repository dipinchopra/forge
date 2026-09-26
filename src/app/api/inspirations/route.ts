import { z } from 'zod';
import { listInspirations,saveInspiration } from '@/lib/server/lurker';
import { apiError,mutationGuard } from '@/lib/server/http';
export async function GET(){return Response.json(listInspirations());}
export async function POST(request:Request){const blocked=mutationGuard(request,true);if(blocked)return blocked;try{const form=await request.formData();const input=z.object({url:z.string().max(2048),notes:z.string().max(8000),title:z.string().max(300)}).parse({url:form.get('url'),notes:form.get('notes')||'',title:form.get('title')||''});const image=form.get('image');return Response.json(await saveInspiration({...input,image:image instanceof File?image:undefined}));}catch(error){return apiError(error);}}
