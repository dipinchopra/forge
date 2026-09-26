import { importRequestSchema } from '@/lib/import-types';
import { previewAppImport } from '@/lib/server/app-import';
import { apiError, mutationGuard } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const blocked = mutationGuard(request); if (blocked) return blocked;
  try { const { url } = importRequestSchema.parse(await request.json()); return Response.json(await previewAppImport(url)); }
  catch (error) { return apiError(error); }
}
