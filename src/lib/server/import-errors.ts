export class ImportError extends Error {
  constructor(message: string, public status = 400, public existingAppId?: string) { super(message); }
}
