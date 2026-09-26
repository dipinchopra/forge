ALTER TABLE inspirations ADD COLUMN analysisJson TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(analysisJson));
ALTER TABLE inspirations ADD COLUMN retrievalNote TEXT NOT NULL DEFAULT '';
CREATE TABLE template_videos (
 id TEXT PRIMARY KEY, appId TEXT NOT NULL REFERENCES apps(id) ON DELETE RESTRICT,
 name TEXT NOT NULL, plan TEXT NOT NULL CHECK(json_valid(plan)),
 status TEXT NOT NULL DEFAULT 'draft', renderPath TEXT, error TEXT,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX template_videos_app ON template_videos(appId);
