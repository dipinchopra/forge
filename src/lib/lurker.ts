import { z } from 'zod';
export const formatAnalysisSchema=z.object({name:z.string().min(1).max(120),description:z.string().max(600),hook:z.string().max(300),hookType:z.string().max(80),hookPattern:z.string().max(300),structure:z.array(z.string().max(200)).min(2).max(10),visualMechanic:z.string().max(600),cta:z.string().max(200),topics:z.array(z.string().max(80)).max(12),pacing:z.string().max(200),remixAdvice:z.string().max(600),limitations:z.string().max(500)});
export type FormatAnalysis=z.infer<typeof formatAnalysisSchema>;
export interface LurkerItem {id:string;url:string;platform:string;title:string;notes:string;caption:string;localMediaPath:string|null;analysisStatus:string;analysisJson:Partial<FormatAnalysis>;retrievalNote:string;capturedAt:string;creativeFormatId:string|null;}
