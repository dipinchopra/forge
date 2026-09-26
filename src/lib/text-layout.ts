export function wrapText(text:string,width:number,measure:(s:string)=>number){
 const lines:string[]=[];
 for(const paragraph of text.trim().split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){
  if(measure(word)>width){if(line){lines.push(line);line='';}for(const char of word){if(line&&measure(line+char)>width){lines.push(line);line='';}line+=char;}}
  else if(line&&measure(line+' '+word)>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;
 }if(line)lines.push(line);}return lines;
}
export function safeTextTop(requested:number,blockHeight:number,height:number,margin:number){return Math.max(margin,Math.min(requested,height-margin-blockHeight));}
