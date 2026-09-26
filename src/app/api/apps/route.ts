import { createApp, listApps } from '@/lib/server/apps';
import { apiError, mutationGuard } from '@/lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() { return Response.json(listApps()); }
export async function POST(request: Request) { const blocked = mutationGuard(request); if (blocked) return blocked; try { return Response.json(createApp(await request.json()), { status: 201 }); } catch (error) { return apiError(error); } }
