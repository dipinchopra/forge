import { ZodError } from 'zod';
import { ImportError } from './import-errors';
export function mutationGuard(request: Request, multipart = false) {
 const origin = request.headers.get('origin');
 // Next can normalize request.url to its listening address. The Host header
 // preserves the actual browser origin (localhost or 127.0.0.1).
 const url = new URL(request.url);
 const expectedOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
 if (origin && origin !== expectedOrigin) return Response.json({ error: 'Cross-origin changes are not allowed.' }, { status: 403 });
 if (!request.headers.get('content-type')?.includes(multipart ? 'multipart/form-data' : 'application/json')) return Response.json({ error: 'Expected JSON.' }, { status: 415 });
}
export function apiError(error: unknown) {
 if (error instanceof ImportError) return Response.json({ error: error.message, existingAppId: error.existingAppId }, { status: error.status });
 if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message || 'Check your app details.' }, { status: 400 });
 if (error instanceof SyntaxError) return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
 if (error instanceof Error && error.message.includes('FOREIGN KEY')) return Response.json({ error: 'This app has assets or projects. Remove or reassign them before deleting it.' }, { status: 409 });
 console.error(error); return Response.json({ error: 'Could not save changes. Please try again.' }, { status: 500 });
}
