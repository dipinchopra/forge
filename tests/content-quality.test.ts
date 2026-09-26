import {test} from 'node:test';
import assert from 'node:assert/strict';
import {textBankSchema,mergeTextBank} from '../src/lib/server/text-bank';
import {hookRequest} from '../src/lib/hook-video';
import {rankPinterestImages} from '../src/lib/server/pinterest';
import {wrapText,safeTextTop} from '../src/lib/text-layout';

test('500-entry banks survive saving and hook-video validation; appending preserves existing lines',()=>{
 const hooks=Array.from({length:500},(_,i)=>`Hook number ${i}`),ctas=Array.from({length:500},(_,i)=>`CTA number ${i}`);
 assert.equal(textBankSchema.parse({hooks,ctas}).ctas.length,500);
 assert.equal(hookRequest.parse({appId:'11111111-1111-4111-8111-111111111111',texts:hooks,count:1}).texts.length,500);
 assert.throws(()=>textBankSchema.parse({hooks:[...hooks,'Too many'],ctas}));
 const merged=mergeTextBank({hooks:['Try this photo layout'],ctas:['Download the app']},{hooks:['try this photo layout','Keep your trip in one post'],ctas:['Make your own']});
 assert.deepEqual(merged.hooks,['Try this photo layout','Keep your trip in one post']);assert.deepEqual(merged.ctas,['Download the app','Make your own']);
});
test('Pinterest candidates require subject evidence, and unrelated or uncaptioned pins are excluded',()=>{
 const titles=['Beach vacation photos at sunset','Kitchen storage ideas','Vacation packing list','Image from https://www.pinterest.com/user/board/','Beach cafe in Paris'];
 const images=titles.map((title,i)=>({title,url:`https://i.pinimg.com/${i}.jpg`,sourceUrl:`https://www.pinterest.com/pin/${i}/`}));
 const ranked=rankPinterestImages(images,'beach vacation sunset photos');
 assert.deepEqual(ranked.map(i=>i.title),[titles[0]]);
 assert.equal(rankPinterestImages(images,'aesthetic ideas').length,0);
});
test('long words wrap without squashing and bottom-positioned text stays within the canvas',()=>{
 const lines=wrapText('A short line Supercalifragilisticexpialidocious',10,s=>s.length);
 assert.ok(lines.every(l=>l.length<=10));assert.equal(lines.join('').replaceAll(' ',''),'AshortlineSupercalifragilisticexpialidocious');
 for(const height of [1080,1350,1920]){const top=safeTextTop(height*.85,400,height,80);assert.ok(top>=80);assert.ok(top+400<=height-80);}
});
