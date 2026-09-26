import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp, getApp, listApps, updateApp, deleteApp } from '../src/lib/server/apps';
import { getDatabase } from '../src/lib/server/database';
import { dataDirectories } from '../src/lib/server/storage';

test('foundation: migrations, validated CRUD, isolation and relationship protection', () => {
 const root = mkdtempSync(path.join(os.tmpdir(), 'forge-test-'));
 process.env.FORGE_DATA_DIR = root;
 try {
  const db = getDatabase();
  for (const folder of dataDirectories) assert.ok(existsSync(path.join(root, folder)));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get()?.n, 5);
  for (const table of ['apps','assets','projects','inspirations','creative_formats','trends']) assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table));
  assert.throws(()=>createApp({name:'   '}));
  assert.throws(()=>createApp({name:'Bad URL',appStoreUrl:'https://evil.example'}));
  const app=createApp({name:'Panoslice test',audiences:['Travel creators'],features:['Collages']});
  const second=createApp({name:'Another app'});
  assert.equal(getApp(app.id)?.name,'Panoslice test');
  assert.deepEqual(getApp(app.id)?.features,['Collages']);
  assert.equal(listApps().length,2);
  assert.equal(updateApp(app.id,{name:'Panoslice revised',tone:['Warm']})?.name,'Panoslice revised');
  assert.deepEqual(getApp(app.id)?.tone,['Warm']);
  assert.equal(getApp(second.id)?.name,'Another app');
  assert.equal(updateApp('missing',{name:'Missing'}),null);
  assert.equal(deleteApp('missing'),false);
  db.prepare("INSERT INTO assets (id,appId,filename,path,type,createdAt) VALUES ('asset',?,'photo.jpg','assets/photo.jpg','image',?)").run(app.id,new Date().toISOString());
  assert.throws(()=>deleteApp(app.id),/FOREIGN KEY/);
  db.prepare("DELETE FROM assets WHERE id='asset'").run();
  assert.equal(deleteApp(app.id),true);
  assert.equal(getApp(app.id),null);
  assert.equal(listApps().length,1);
  assert.equal(deleteApp(second.id),true);
  db.close();
 } finally { rmSync(root,{recursive:true,force:true}); }
});
