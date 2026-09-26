import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { dataRoot } from '@/lib/server/storage';
export const runtime = 'nodejs';
export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  const parts = (await context.params).path;
  // Expose only generated import image names, never arbitrary data-directory files.
  if (parts.length !== 3 || parts[0] !== 'apps' || !/^[0-9a-f-]{36}$/.test(parts[1]) || !/^(icon|screenshot-\d+)\.(png|jpg|webp)$/.test(parts[2])) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const root = await realpath(dataRoot());
    const file = await realpath(path.join(root, ...parts));
    if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
    const bytes = await readFile(file);
    const type = parts[2].endsWith('.png') ? 'image/png' : parts[2].endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
    return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
