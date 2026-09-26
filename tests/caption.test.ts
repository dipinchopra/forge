import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { captionOverlay } from '../src/lib/server/caption';
test('TikTok Sans caption raster has white fill, black outline and transparent background without system fonts',async()=>{
 const png=await captionOverlay('Find your style · Panoslice');
 const {data,info}=await sharp(png).raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,1080);assert.equal(info.height,1920);assert.equal(info.channels,4);
 let white=0,black=0,transparent=0,rightHalf=0;
 for(let i=0;i<data.length;i+=4){if((i/4)%1080>700&&data[i+3]>240)rightHalf++;if(data[i+3]===0)transparent++;else if(data[i+3]>240){if(data[i]>240&&data[i+1]>240&&data[i+2]>240)white++;if(data[i]<10&&data[i+1]<10&&data[i+2]<10)black++;}}
 assert.ok(rightHalf>100,'The full caption must render, including the final word.');assert.ok(white>100);assert.ok(black>100);assert.ok(transparent>1_000_000);
});
