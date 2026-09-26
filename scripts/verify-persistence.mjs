import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const base = 'http://127.0.0.1:3000';
const record = path.join(tmpdir(), 'forge-persistence-verification.json');
if (process.argv[2] === 'create') {
 const response = await fetch(`${base}/api/apps`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Forge restart verification',keywords:['persisted']})});
 assert.equal(response.status,201);
 writeFileSync(record,JSON.stringify(await response.json()));
 console.log('Created temporary profile. Restart Forge, then run this script with check.');
} else {
 const saved = JSON.parse(readFileSync(record,'utf8'));
 const response = await fetch(`${base}/api/apps/${saved.id}`);
 assert.equal(response.status,200);
 const app = await response.json();
 assert.deepEqual(app.keywords,['persisted']);
 assert.equal(app.name,saved.name);
 const deleted = await fetch(`${base}/api/apps/${saved.id}`,{method:'DELETE',headers:{'Content-Type':'application/json'}});
 assert.equal(deleted.status,204);
 unlinkSync(record);
 console.log('PASS profile persisted across server restart; temporary profile removed.');
}
