import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { registerAsset } from '@/lib/server/assets';
import { apiError, mutationGuard } from '@/lib/server/http';
export async function POST(request:Request) {
  const blocked=mutationGuard(request,true);if(blocked)return blocked;
  try {
    const form=await request.formData();const appId=z.uuid().parse(form.get('appId'));
    const category=z.enum(['PRODUCT','TEMPLATE','VIDEO','DEMO','OUTPUT','MARKETING','BRAND','OTHER']).parse(form.get('category')||'OTHER');
    const files=form.getAll('files').filter((file):file is File=>file instanceof File);
    if(!files.length||files.length>50)return Response.json({error:'Choose between 1 and 50 files.'},{status:400});
    const assets=[];const warnings=[];
    for(const file of files) {
      try {if(file.size>150_000_000)throw new Error(`${file.name}: larger than 150 MB.`);assets.push(await registerAsset({appId,bytes:Buffer.from(await file.arrayBuffer()),filename:file.name,category,sourceKind:'upload',sourceKey:randomUUID()}));}
      catch(error){warnings.push(error instanceof Error?error.message:'Could not read file.');}
    }
    return Response.json({assets,warnings});
  } catch(error){return apiError(error);}
}
