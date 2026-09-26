import {getTemplateVideo} from '@/lib/server/template-videos';
import {videoResponse} from '@/lib/server/video-response';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return videoResponse(request,getTemplateVideo((await params).id));}
export const HEAD=GET;
