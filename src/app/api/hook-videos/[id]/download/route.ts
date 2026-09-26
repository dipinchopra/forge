import {getHookVideo} from '@/lib/server/hook-videos';
import {videoResponse} from '@/lib/server/video-response';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return videoResponse(request,getHookVideo((await params).id));}
export const HEAD=GET;
