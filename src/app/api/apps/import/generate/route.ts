import { draftIdSchema } from '@/lib/import-types';
import { generateImportProfile } from '@/lib/server/app-import';
import { apiError, mutationGuard } from '@/lib/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  const blocked = mutationGuard(request); if (blocked) return blocked;
  try { const { draftId } = draftIdSchema.parse(await request.json()); return Response.json(await generateImportProfile(draftId)); }
  catch (error) { return apiError(error); }
}
