import { deleteApp, getApp, updateApp } from '@/lib/server/apps';
import { apiError, mutationGuard } from '@/lib/server/http';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
const missing = () => Response.json({ error: 'App not found.' }, { status: 404 });
export async function GET(_: Request, { params }: Context) { const app = getApp((await params).id); return app ? Response.json(app) : missing(); }
export async function PUT(request: Request, { params }: Context) { const blocked = mutationGuard(request); if (blocked) return blocked; try { const app = updateApp((await params).id, await request.json()); return app ? Response.json(app) : missing(); } catch(error) { return apiError(error); } }
export async function DELETE(request: Request, { params }: Context) { const blocked = mutationGuard(request); if (blocked) return blocked; try { return deleteApp((await params).id) ? new Response(null, { status: 204 }) : missing(); } catch(error) { return apiError(error); } }
