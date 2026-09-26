export interface ImageCrop {x:number;y:number;width:number;height:number;}
export const fullCrop:ImageCrop={x:0,y:0,width:1,height:1};
export function cropRect(crop:ImageCrop|undefined,width:number,height:number){const c=crop||fullCrop;const x=Math.max(0,Math.min(0.99,c.x)),y=Math.max(0,Math.min(0.99,c.y));return {x:x*width,y:y*height,width:Math.max(0.01,Math.min(1-x,c.width))*width,height:Math.max(0.01,Math.min(1-y,c.height))*height};}
