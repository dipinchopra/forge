import { z } from 'zod';
export const slideshowStyle = {
  fontFamily:'TikTok Sans',fontWeight:700,textColor:'#ffffff',strokeColor:'#000000',strokeWidth:5,
  width:1080,height:1920,template:'tiktok-outlined',
} as const;
export const creativeInputSchema=z.object({
  boardUrl:z.url().optional(),formula:z.enum(['hpsc','aida','pas','hero']).default('hpsc'),ratio:z.enum(['9:16','4:5','1:1']).optional(),slideCount:z.number().int().min(2).max(12).default(6),imageSource:z.enum(['dupe','pinterest','local']).default('local'),appId:z.uuid(),inspirationId:z.uuid().optional(),type:z.enum(['slideshow','carousel','hook-demo']),
  start:z.enum(['idea','inspiration','asset','surprise']),idea:z.string().trim().max(3000).default(''),
  selectedAssetIds:z.array(z.uuid()).max(12).default([]),
}).refine(value=>value.start!=='asset'||value.selectedAssetIds.length>0,{message:'Select at least one asset.'});
export type CreativeInput=z.infer<typeof creativeInputSchema>;
export const conceptSchema=z.object({
  imageQuery:z.string().max(80).default(''),title:z.string().min(1).max(70),hook:z.string().min(1).max(90),angle:z.string().min(1).max(160),
  outline:z.array(z.string().min(1).max(90)).min(4).max(6),
  assetIds:z.array(z.string()).max(8),
});
export const conceptsSchema=z.object({concepts:z.array(conceptSchema).length(12)});
export type Concept=z.infer<typeof conceptSchema>;
export interface ConceptBatch {id:string;appId:string;input:CreativeInput;concepts:Concept[];provider:string;createdAt:string;}
export const slideDraftItemSchema=z.object({headline:z.string().min(1).max(150),body:z.string().max(100),assetId:z.string().nullable(),assetQuery:z.string().max(100)});
export const slideDraftSchema=z.object({slides:z.array(slideDraftItemSchema).min(2).max(12)});
export const slideDraftSchemaFor=(count:number)=>z.object({slides:z.array(slideDraftItemSchema).length(count)});
export const projectChoiceSchema=z.object({runId:z.uuid().optional(),boardUrl:z.url().optional(),batchId:z.uuid(),conceptIndex:z.number().int().min(0).max(14),imageSource:z.enum(['dupe','pinterest','local']).optional(),selectedAssetIds:z.array(z.uuid()).max(12).optional(),formula:z.enum(['hpsc','aida','pas','hero']).optional(),ratio:z.enum(['9:16','4:5','1:1']).optional(),slideCount:z.number().int().min(2).max(12).optional()});
export const projectEditSchema=z.object({
  name:z.string().trim().min(1).max(150),height:z.union([z.literal(1920),z.literal(1350),z.literal(1080)]).optional(),
  slides:z.array(z.object({crop:z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),width:z.number().min(0.01).max(1),height:z.number().min(0.01).max(1)}).refine(c=>c.x+c.width<=1.001&&c.y+c.height<=1.001,'Crop must remain inside the image.').optional(),textY:z.number().min(0.03).max(0.85).optional(),role:z.string().max(30).optional(),id:z.uuid(),position:z.number().int(),headline:z.string().min(1).max(150),body:z.string().max(300),assetQuery:z.string().max(200),assetId:z.uuid().nullable(),template:z.string().max(80),textEmphasis:z.array(z.string()).max(20)})).min(1).max(20),
});
