ALTER TABLE apps ADD COLUMN profileSource TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE apps ADD COLUMN importedAt TEXT;
CREATE UNIQUE INDEX apps_apple_id ON apps(appleAppId) WHERE appleAppId IS NOT NULL;
