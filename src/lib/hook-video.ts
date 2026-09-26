import {z} from 'zod';
export const hookClip=z.object({kind:z.enum(['HOOK','DEMO']),assetId:z.uuid(),text:z.string().max(150),trimStart:z.literal(0),duration:z.number().positive().max(86400)});
export const hookPlanSchema=z.object({textY:z.number().min(0.04).max(0.85).optional(),fullLength:z.literal(true),name:z.string().min(1).max(120),audio:z.enum(['muted','original']),clips:z.array(hookClip).length(2)});
export type HookPlan=z.infer<typeof hookPlanSchema>;
export interface HookVideo {id:string;appId:string;name:string;plan:HookPlan;status:string;renderPath:string|null;error:string|null;createdAt:string;updatedAt:string;}
export const hookRequest=z.object({appId:z.uuid(),hookAssetIds:z.array(z.uuid()).min(1).max(100).optional(),demoAssetIds:z.array(z.uuid()).min(1).max(100).optional(),texts:z.array(z.string().trim().min(1).max(100)).min(1).max(500),count:z.number().int().min(1).max(50),audio:z.enum(['muted','original']).default('original')});
