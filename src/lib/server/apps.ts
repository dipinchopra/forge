import { randomUUID } from 'node:crypto';
import type { App } from '../models';
import { appInputSchema, type AppInput } from '../validation';
import { getDatabase } from './database';
function decode(row: Record<string, unknown>): App { const app = { ...row }; for (const key of ['audiences', 'features', 'contentAngles', 'tone', 'keywords', 'screenshots']) app[key] = JSON.parse(app[key] as string); return app as unknown as App; }
export function listApps(): App[] { return getDatabase().prepare('SELECT * FROM apps ORDER BY createdAt DESC, id').all().map(decode); }
export function getApp(id: string): App | null { const row = getDatabase().prepare('SELECT * FROM apps WHERE id = ?').get(id); return row ? decode(row) : null; }
function values(input: AppInput) { return [input.name, input.oneLineDescription, JSON.stringify(input.audiences), JSON.stringify(input.features), JSON.stringify(input.contentAngles), JSON.stringify(input.tone), JSON.stringify(input.keywords), input.appStoreUrl]; }
export function createApp(raw: unknown): App { const input = appInputSchema.parse(raw); const id = randomUUID(); const now = new Date().toISOString(); getDatabase().prepare('INSERT INTO apps (name, oneLineDescription, audiences, features, contentAngles, tone, keywords, appStoreUrl, id, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...values(input), id, now, now); return getApp(id)!; }
export function updateApp(id: string, raw: unknown): App | null { const input = appInputSchema.parse(raw); const result = getDatabase().prepare('UPDATE apps SET name=?, oneLineDescription=?, audiences=?, features=?, contentAngles=?, tone=?, keywords=?, appStoreUrl=?, updatedAt=? WHERE id=?').run(...values(input), new Date().toISOString(), id); return result.changes ? getApp(id) : null; }
export function deleteApp(id: string): boolean { return Boolean(getDatabase().prepare('DELETE FROM apps WHERE id = ?').run(id).changes); }
