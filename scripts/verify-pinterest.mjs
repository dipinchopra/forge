import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';const start=Date.now();
const r=await fetch(base+'/api/pinterest',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({appId:'a7237d83-fe3b-4a97-a947-9ee67cf394df',query:'photo dump'})});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));assert.ok(data.assets.length>0);console.log({count:data.assets.length,seconds:(Date.now()-start)/1000,source:data.assets[0].sourceKey});
