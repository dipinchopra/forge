import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse,type Font } from 'opentype.js';
import sharp from 'sharp';
let fontPromise:Promise<Font>|undefined;
async function font(){
 fontPromise ||= readFile(path.join(process.cwd(),'public/fonts/TikTokSans-Bold.ttf')).then(bytes=>parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer));
 return fontPromise;
}
export async function captionOverlay(text:string,options:{y?:number;size?:number}={}){
 const typeface=await font();const size=options.size||60;const lines:string[]=[];let line='';
 for(const word of text.split(/\s+/)){const candidate=line?`${line} ${word}`:word;if(line&&typeface.getAdvanceWidth(candidate,size)>900){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);
 const paths=lines.map((value,index)=>{const width=typeface.getAdvanceWidth(value,size);const drawing=typeface.getPath(value,(1080-width)/2,(options.y??180)+index*size*1.3,size).commands.map(command=>{switch(command.type){case 'M':case 'L':return `${command.type}${command.x} ${command.y}`;case 'Q':return `Q${command.x1} ${command.y1} ${command.x} ${command.y}`;case 'C':return `C${command.x1} ${command.y1} ${command.x2} ${command.y2} ${command.x} ${command.y}`;case 'Z':return 'Z';}}).join(' ');return `<path d="${drawing}" fill="none" stroke="#000" stroke-width="9" stroke-linejoin="round"/><path d="${drawing}" fill="#fff"/>`;}).join('');
 return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${paths}</svg>`)).png().toBuffer();
}
