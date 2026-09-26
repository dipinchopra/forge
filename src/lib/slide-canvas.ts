import {cropRect} from './crop';
import {wrapText,safeTextTop} from './text-layout';
import type {Asset,Slide} from './models';
function fit(context:CanvasRenderingContext2D,text:string,startSize:number,maxLines:number){let size=startSize,lines:string[]=[];for(;size>=24;size-=2){context.font=`700 ${size}px "TikTok Sans"`;lines=wrapText(text,880,s=>context.measureText(s).width);if(lines.length<=maxLines||size===24)break;}return {size,lines,height:lines.length*size*1.22};}
function paint(context:CanvasRenderingContext2D,block:ReturnType<typeof fit>,y:number){context.font=`700 ${block.size}px "TikTok Sans"`;context.textAlign='center';context.textBaseline='top';context.lineJoin='round';context.strokeStyle='#000';context.fillStyle='#fff';context.lineWidth=Math.max(4,block.size/9);for(const [i,line]of block.lines.entries()){context.strokeText(line,540,y+i*block.size*1.22);context.fillText(line,540,y+i*block.size*1.22);}}
export async function drawSlide(canvas:HTMLCanvasElement,slide:Slide,asset:Asset|undefined,height:number){
 await document.fonts.load('700 64px "TikTok Sans"');
 const image=asset?.type==='image'?await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load this image.'));img.src=`/api/assets/${asset.id}/media${/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(asset.path)?'':'?thumbnail=1'}`;}):null;
 canvas.width=1080;canvas.height=height;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000000';ctx.fillRect(0,0,1080,height);
 const cta=slide.role==='CTA';
 if(image){const logo=cta&&asset?.category==='BRAND'&&/logo|icon/i.test(asset.filename);const boxW=logo?300:cta?760:1080,boxH=logo?300:cta?height*0.53:height;const source=cropRect(slide.crop,image.naturalWidth,image.naturalHeight);const scale=Math.min(boxW/source.width,boxH/source.height);const w=source.width*scale,h=source.height*scale;ctx.drawImage(image,source.x,source.y,source.width,source.height,(1080-w)/2,(height-h)/2,w,h);}
 const heading=fit(ctx,slide.headline,68,3),body=fit(ctx,cta?slide.body||'Download on the App Store':slide.body,40,3),gap=body.lines.length?26:0,margin=height===1920?120:80;
 const y=safeTextTop((slide.textY??0.08)*height,heading.height+(cta?0:gap+body.height),height,margin);
 paint(ctx,heading,y);
 paint(ctx,body,cta?safeTextTop(height-margin-body.height,body.height,height,margin):y+heading.height+gap);
}
