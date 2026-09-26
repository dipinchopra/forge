import { z } from 'zod';
import { appInputSchema } from './validation';
export const marketingSchema = appInputSchema.omit({ appStoreUrl: true });
export type MarketingProfile = z.infer<typeof marketingSchema>;
export interface StoreMetadata {
  screenshotSource?: string;
  name: string;
  appleAppId: string;
  appStoreUrl: string;
  subtitle: string;
  description: string;
  category: string;
  developer: string;
  iconUrl: string | null;
  screenshotUrls: string[];
}
export interface ImportDraft {
  id: string;
  existingAppId?: string;
  existingUpdatedAt?: string;
  preservedProfile?: Partial<MarketingProfile>;
  metadata: StoreMetadata;
  profile: MarketingProfile;
  profileSource: 'app-store' | 'codex';
  iconPath: string | null;
  screenshots: string[];
  warnings: string[];
  createdAt: string;
}
export const importRequestSchema = z.object({ url: z.string().trim().max(2048) }).strict();
export const draftIdSchema = z.object({ draftId: z.uuid() }).strict();
export const commitImportSchema = z.object({ draftId: z.uuid(), profile: marketingSchema }).strict();
export function mediaUrl(relativePath: string) {
  return `/api/media/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}
