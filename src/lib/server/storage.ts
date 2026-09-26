import { mkdirSync } from 'node:fs';
import path from 'node:path';
export const dataDirectories = ['apps', 'assets', 'projects', 'inspiration', 'renders', 'thumbnails', 'cache', 'settings'] as const;
export function dataRoot() { return path.resolve(process.env.FORGE_DATA_DIR || path.join(process.cwd(), 'forge-data')); }
export function initializeStorage() { const root = dataRoot(); mkdirSync(root, { recursive: true }); for (const directory of dataDirectories) mkdirSync(path.join(root, directory), { recursive: true }); return root; }
