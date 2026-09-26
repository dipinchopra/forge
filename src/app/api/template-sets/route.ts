import {z} from 'zod';
import {listTemplateSets} from '@/lib/server/template-sets';
import {listTemplateVideos} from '@/lib/server/template-videos';
import {apiError} from '@/lib/server/http';
export async function GET(request:Request){try{const id=z.uuid().parse(new URL(request.url).searchParams.get('appId'));return Response.json({sets:listTemplateSets(id),videos:listTemplateVideos(id)});}catch(error){return apiError(error);}}
