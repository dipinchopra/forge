import { z } from 'zod';
const list = z.array(z.string().trim().min(1).max(300)).max(100).default([]);
export const appInputSchema = z.object({
  name: z.string().trim().min(1, 'Give your app a name.').max(100),
  oneLineDescription: z.string().trim().max(500).default(''),
  audiences: list, features: list, contentAngles: list, tone: list, keywords: list,
  appStoreUrl: z.union([z.literal(''), z.url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'apps.apple.com'; }, 'Use an https://apps.apple.com URL.')]).default(''),
}).strict();
export type AppInput = z.infer<typeof appInputSchema>;
