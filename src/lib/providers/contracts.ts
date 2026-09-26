import type { z } from 'zod';
import type { App, Asset, Inspiration, Project } from '../models';
// Implementations stay behind these boundaries; Apple and Codex support app onboarding.
export interface AIProvider { generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T>; analyzeImage<T>(path: string, prompt: string, schema: z.ZodType<T>): Promise<T>; generateText(prompt: string): Promise<string>; }
export interface ImageCandidate { id: string; path: string; source: 'selected' | 'local' | 'external' | 'generated'; reusable: boolean; attribution?: string; }
export interface ImageProvider { search(input: { appId: string; query: string; selectedAssets?: Asset[] }): Promise<ImageCandidate[]>; }
export interface InspirationProvider { capture(url: string): Promise<Partial<Inspiration>>; }
export interface AppMetadataProvider { retrieve(url: string): Promise<Partial<App>>; }
export interface Renderer { render(project: Project, options: { ratio: '9:16' | '4:5' | '1:1'; outputDirectory: string }): Promise<string[]>; }
