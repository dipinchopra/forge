import { commitImportSchema } from '@/lib/import-types';
import { commitAppImport } from '@/lib/server/app-import';
import { apiError, mutationGuard } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const blocked = mutationGuard(request); if (blocked) return blocked;
  try { const { draftId, profile } = commitImportSchema.parse(await request.json()); return Response.json(await commitAppImport(draftId,profile), { status: 201 }); }
  catch (error) { return apiError(error); }
}
