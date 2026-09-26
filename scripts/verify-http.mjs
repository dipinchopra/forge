import assert from 'node:assert/strict';
const base = process.env.FORGE_TEST_URL || 'http://127.0.0.1:3000';
const request = (path, method='GET', body, origin=base) => fetch(base+path,{method,headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});
for (const path of ['/','/apps','/apps/new','/library','/lurker','/projects','/settings','/template-videos']) {
 const response=await request(path);assert.equal(response.status,200,path);const html=await response.text();assert.ok(html.includes('forge'),path);console.log(`PASS ${path}`);
}
assert.equal((await request('/api/apps','POST',{name:' '})).status,400);
assert.equal((await request('/api/apps','POST',{name:'Blocked'},'https://example.com')).status,403);
let id;
try {
 const response=await request('/api/apps','POST',{name:'Forge HTTP verification',oneLineDescription:'Temporary test app',features:['Collages'],tone:['Warm']});assert.equal(response.status,201);const app=await response.json();id=app.id;
 assert.equal((await request(`/api/apps/${id}`)).status,200);
 assert.equal((await request(`/apps/${id}`)).status,200);
 assert.equal((await request(`/apps/${id}/edit`)).status,200);
 const changed=await request(`/api/apps/${id}`,'PUT',{name:'Forge HTTP revised',audiences:['Creators'],keywords:['Travel']});assert.equal(changed.status,200);assert.deepEqual((await changed.json()).audiences,['Creators']);
 const listing=await (await request('/api/apps')).json();assert.ok(listing.some(app=>app.id===id&&app.name==='Forge HTTP revised'));
 const page=await (await request(`/apps/${id}`)).text();assert.ok(page.includes('Forge HTTP revised'));assert.ok(page.includes('Creators'));
 console.log('PASS live create, list, view and update');
} finally { if(id) { assert.equal((await request(`/api/apps/${id}`,'DELETE')).status,204);assert.equal((await request(`/api/apps/${id}`)).status,404);assert.equal((await request(`/apps/${id}`)).status,404);console.log('PASS delete and not-found handling'); } }
console.log('PASS validation and cross-origin protection');
