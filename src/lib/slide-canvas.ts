import {cropRect} from './crop';
import {wrapText,safeTextTop} from './text-layout';
import type {Asset,Slide} from './models';
function fit(context:CanvasRenderingContext2D,text:string,startSize:number,maxLines:number,width=880){let size=startSize,lines:string[]=[];for(;size>=24;size-=2){context.font=`700 ${size}px "TikTok Sans"`;lines=wrapText(text,width,s=>context.measureText(s).width);if(lines.length<=maxLines||size===24)break;}return {size,lines,height:lines.length*size*1.22};}
function paint(context:CanvasRenderingContext2D,block:ReturnType<typeof fit>,y:number,x=540,color='#fff'){context.font=`700 ${block.size}px "TikTok Sans"`;context.textAlign='center';context.textBaseline='top';context.lineJoin='round';context.strokeStyle='#000';context.fillStyle=color;context.lineWidth=Math.max(5,block.size/8);for(const [i,line]of block.lines.entries()){context.strokeText(line,x,y+i*block.size*1.22);context.fillText(line,x,y+i*block.size*1.22);}}
function drawImageBox(ctx:CanvasRenderingContext2D,image:HTMLImageElement,source:ReturnType<typeof cropRect>,box:{x:number;y:number;width:number;height:number},zoom:number,mode:'contain'|'cover'){
 const fit=mode==='cover'?Math.max(box.width/source.width,box.height/source.height):Math.min(box.width/source.width,box.height/source.height),scale=fit*zoom,w=source.width*scale,h=source.height*scale;
 ctx.save();ctx.beginPath();ctx.rect(box.x,box.y,box.width,box.height);ctx.clip();ctx.drawImage(image,source.x,source.y,source.width,source.height,box.x+(box.width-w)/2,box.y+(box.height-h)/2,w,h);ctx.restore();
}
export async function drawSlide(canvas:HTMLCanvasElement,slide:Slide,asset:Asset|undefined,height:number){
 await document.fonts.load('700 64px "TikTok Sans"');
 const image=asset?.type==='image'?await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load this image.'));img.src=`/api/assets/${asset.id}/media${/\.(jpg|jpeg|png|webp|avif|gif)$/i.test(asset.path)?'':'?thumbnail=1'}`;}):null;
 canvas.width=1080;canvas.height=height;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#000000';ctx.fillRect(0,0,1080,height);
 const cta=slide.role==='CTA';
 const source=image?cropRect(slide.crop,image.naturalWidth,image.naturalHeight):null,zoom=slide.imageZoom??1,isSlideshow=slide.template==='slideshow-photo';
 if(image&&source){const logo=cta&&asset?.category==='BRAND'&&/logo|icon/i.test(asset.filename);if(isSlideshow&&!cta){drawImageBox(ctx,image,source,{x:0,y:0,width:1080,height},zoom,'cover');ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(0,0,1080,height);}else{const boxW=logo?300:cta?760:1080,boxH=logo?300:cta?height*0.53:height;drawImageBox(ctx,image,source,{x:(1080-boxW)/2,y:(height-boxH)/2,width:boxW,height:boxH},zoom,'contain');}}
 const heading=fit(ctx,slide.headline,isSlideshow?76:68,isSlideshow?2:3,isSlideshow?930:880),body=fit(ctx,cta?slide.body||'Download on the App Store':slide.body,isSlideshow?42:40,isSlideshow?2:3,isSlideshow?820:880),gap=body.lines.length?22:0,margin=height===1920?120:80;
 const y=safeTextTop((slide.textY??0.3)*height,heading.height+(cta?0:gap+body.height),height,margin);
 const textColor=slide.textColor||'#ffffff';
 paint(ctx,heading,y,540,textColor);
 paint(ctx,body,cta?safeTextTop(height-margin-body.height,body.height,height,margin):y+heading.height+gap,540,textColor);
 if(isSlideshow&&!cta&&slide.position>0){ctx.font='700 34px "TikTok Sans"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=6;ctx.strokeStyle='#000';ctx.fillStyle='#fff';const label=String(slide.position).padStart(2,'0');ctx.beginPath();ctx.arc(74,74,36,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.58)';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#000';ctx.lineWidth=5;ctx.fillStyle='#fff';ctx.strokeText(label,74,76);ctx.fillText(label,74,76);}
}
