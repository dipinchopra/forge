import { codexStatus } from '@/lib/server/providers/codex';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return Response.json(await codexStatus()); }
