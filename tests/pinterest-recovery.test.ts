import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {crawlPinterest,pinterestSearchQueries,boardImages,conceptImageQuery} from '../src/lib/server/pinterest';
test('blocked Pinterest search still uses discovery, keeps relevant pins, and caches success',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'forge-pinterest-recovery-')),previous=process.env.FORGE_DATA_DIR,original=globalThis.fetch;process.env.FORGE_DATA_DIR=root;let calls=0;
 const board='https://www.pinterest.com/creator/beach-vacation/';
 const pins=Object.fromEntries(Array.from({length:8},(_,i)=>[String(i+100),{type:'pin',id:String(i+100),description:'Beach vacation sunset photography',images:{orig:{width:800,height:1200,url:`https://i.pinimg.com/${i}.jpg`}}}]));
 globalThis.fetch=async(input)=>{calls++;const url=String(input);if(url.includes('/search/'))return new Response('Blocked',{status:403});if(url.includes('duckduckgo'))return new Response(`<a href="/l/?uddg=${encodeURIComponent(board)}&amp;x=1">Board</a>`);assert.equal(url,board);return new Response(`<script id="__PWS_INITIAL_PROPS__">${JSON.stringify({resourceResponses:[{data:Object.values(pins)}]})}</script>`);};
 try{const found=await crawlPinterest('beach vacation sunset photos');assert.equal(found.length,8);assert.ok(calls>=4);const before=calls;await crawlPinterest('beach vacation sunset photos');assert.equal(calls,before,'cached matching results avoid another crawl');}finally{globalThis.fetch=original;if(previous===undefined)delete process.env.FORGE_DATA_DIR;else process.env.FORGE_DATA_DIR=previous;rmSync(root,{recursive:true,force:true});}
});
test('search retries retain the subject and nested pin parsing ignores avatars',()=>{
 assert.deepEqual(pinterestSearchQueries('handmade ceramic mug details'),['handmade ceramic mug details','handmade ceramic mug','handmade ceramic']);
 assert.equal(conceptImageQuery({imageQuery:'photo collage seamless carousel Instagram carousel',title:'Turn your beach trip into a photo story'}),'beach vacation');
 assert.equal(conceptImageQuery({imageQuery:'handmade ceramic mug details',title:'One mug, seven slides'}),'handmade ceramic mug details');
 assert.equal(boardImages('<script id="__PWS_INITIAL_PROPS__">'+JSON.stringify({resourceResponses:[{data:[{type:'user',id:'123',images:{orig:{url:'https://i.pinimg.com/avatar.jpg',width:900,height:900}}}]}]})+'</script>','https://www.pinterest.com/u/b/').length,0);
});
