CREATE TABLE asset_sources (
 appId TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
 sourceKey TEXT NOT NULL, assetId TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
 size INTEGER NOT NULL DEFAULT 0, modified REAL NOT NULL DEFAULT 0,
 PRIMARY KEY(appId,sourceKey)
);
INSERT INTO asset_sources(appId,sourceKey,assetId) SELECT appId,sourceKey,id FROM assets WHERE sourceKind='local' AND sourceKey IS NOT NULL;
ALTER TABLE assets ADD COLUMN sourceUrl TEXT;
ALTER TABLE assets ADD COLUMN attribution TEXT NOT NULL DEFAULT '';
CREATE TABLE hook_videos (
 id TEXT PRIMARY KEY, appId TEXT NOT NULL REFERENCES apps(id) ON DELETE RESTRICT,
 name TEXT NOT NULL, plan TEXT NOT NULL CHECK(json_valid(plan)),
 status TEXT NOT NULL DEFAULT 'draft', renderPath TEXT, error TEXT,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX hook_videos_app ON hook_videos(appId);
