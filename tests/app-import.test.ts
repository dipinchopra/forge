import sharp from 'sharp';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseAppStoreUrl, isAppleImageUrl } from '../src/lib/server/providers/apple';
import { previewAppImport, commitAppImport, readDraft } from '../src/lib/server/app-import';
import { getDatabase } from '../src/lib/server/database';
import { listApps, updateApp, getApp, createApp } from '../src/lib/server/apps';

test('App Store URLs accept regional listings and reject non-Apple destinations',()=>{
 assert.deepEqual(parseAppStoreUrl('https://apps.apple.com/in/app/panoslice/id1592547810?utm_source=test'),{id:'1592547810',country:'in',url:'https://apps.apple.com/in/app/id1592547810'});
 for(const url of ['https://evil.com/app/id123','http://apps.apple.com/app/id123','https://apps.apple.com.evil.com/app/id123','https://user:pass@apps.apple.com/app/id123','https://apps.apple.com:8443/app/id123','https://apps.apple.com/in/app/no-id']) assert.throws(()=>parseAppStoreUrl(url));
 assert.equal(isAppleImageUrl('https://is1-ssl.mzstatic.com/image/icon.png'),true);
 assert.equal(isAppleImageUrl('https://is1-ssl.mzstatic.com.evil.com/icon.png'),false);
 assert.equal(isAppleImageUrl('http://127.0.0.1/icon.png'),false);
});

test('preview, local images, partial failures, editable commit, duplicate protection and metadata preservation',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-import-test-'));
 process.env.FORGE_DATA_DIR=root;
 const originalFetch=globalThis.fetch;
 const png=await sharp({create:{width:20,height:40,channels:3,background:'#448844'}}).png().toBuffer();
 globalThis.fetch=async(input)=>{
  const url=String(input);
  if(url.startsWith('https://itunes.apple.com/')) return Response.json({results:[{
   trackId:Number(new URL(url).searchParams.get('id')),trackName:'Test App',description:'Create beautiful collages.',primaryGenreName:'Photo & Video',artistName:'Test Studio',
   artworkUrl512:'https://is1-ssl.mzstatic.com/icon.png',screenshotUrls:['https://is1-ssl.mzstatic.com/one.png','https://is1-ssl.mzstatic.com/broken.png'],
  }]});
  if(url.startsWith('https://apps.apple.com/')) return new Response('<p class="subtitle test">Photo stories &amp; more</p><script id="serialized-server-data">'+JSON.stringify({data:[{data:{shelfMapping:{product_media_phone_:{items:[{screenshot:{template:'https://is1-ssl.mzstatic.com/one.png',width:20,height:40}},{screenshot:{template:'https://is1-ssl.mzstatic.com/broken.png',width:20,height:40}}]}}}}]})+'</script>');
  if(url.endsWith('/broken.png')) return new Response('Unavailable',{status:503});
  return new Response(png,{headers:{'Content-Type':'image/png'}});
 };
 try {
  const draft=await previewAppImport('https://apps.apple.com/in/app/test/id123456');
  assert.equal(listApps().length,0,'preview must not create the app');
  assert.equal(draft.metadata.subtitle,'Photo stories & more');
  assert.equal(draft.screenshots.length,1);
  assert.equal(draft.warnings.length,1);
  assert.ok(existsSync(path.join(root,draft.iconPath!)));
  assert.equal((await readDraft(draft.id)).metadata.appleAppId,'123456');
  const profile={...draft.profile,name:'My positioning',tone:['Warm']};
  const app=await commitAppImport(draft.id,profile);
  assert.equal(app.name,'My positioning');assert.equal(app.description,'Create beautiful collages.');
  assert.equal(app.profileSource,'app-store');assert.equal(app.screenshots.length,1);
  assert.equal((await commitAppImport(draft.id,profile)).id,app.id,'save retry must be idempotent');
  await assert.rejects(()=>previewAppImport('https://apps.apple.com/us/app/test/id123456'),/already in your studio/);
  updateApp(app.id,{name:'Edited later',features:['Collages']});
  assert.equal(getApp(app.id)?.iconPath,app.iconPath);
  assert.equal(getApp(app.id)?.description,app.description);
  await assert.rejects(()=>readDraft('../escape'),/no longer available/);
  const manual = createApp({name:'Existing brand',oneLineDescription:'Keep my positioning',appStoreUrl:'https://apps.apple.com/in/app/id234567',tone:['Friendly']});
  const enrichment = await previewAppImport(manual.appStoreUrl);
  assert.equal(enrichment.existingAppId,manual.id);
  assert.equal(enrichment.profile.name,'Existing brand');
  assert.equal(enrichment.profile.oneLineDescription,'Keep my positioning');
  assert.deepEqual(enrichment.profile.tone,['Friendly']);
  const enriched = await commitAppImport(enrichment.id,enrichment.profile);
  assert.equal(enriched.id,manual.id);
  assert.ok(enriched.iconPath);
  assert.equal((await commitAppImport(enrichment.id,enrichment.profile)).id,manual.id);
  const changed = createApp({name:'Concurrent edit',appStoreUrl:'https://apps.apple.com/in/app/id345678'});
  const stale = await previewAppImport(changed.appStoreUrl);
  getDatabase().prepare('UPDATE apps SET updatedAt=? WHERE id=?').run('newer',changed.id);
  await assert.rejects(()=>commitAppImport(stale.id,stale.profile),/changed since/);
  getDatabase().close();
 } finally {globalThis.fetch=originalFetch;rmSync(root,{recursive:true,force:true});}
});
