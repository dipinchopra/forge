import type {Concept} from '../creative';
import type {App} from '../models';

type DraftSlide={headline:string;body:string;assetId:string|null;assetQuery:string};
type AppProfile=Pick<App,'name'|'oneLineDescription'|'features'|'audiences'|'contentAngles'|'keywords'>;

const photoRe=/photo|photos|collage|carousel|dump|camera roll|scrapbook|instagram|template|layout/i;
const photoBanned=/\b(include less|fewer photos|less photos|post less|delete photos|cut photos|remove moments|less is more|minimal photos|only one photo|shrink your dump)\b/i;
const filler=/\b(unlock|elevate|transform|enhance|stunning|vibes?|aesthetic journey|visual story|stand out|next level|curate|seamless|magic|perfect memories|beautiful moments|make it pop|fresh look|creative flow|revolutionize|supercharge)\b/i;
const useful=/\b(include|add|use|pick|start|show|save|try|check|list|step|tip|avoid|fix|choose|plan|make|find|keep|write|track|learn|build|create|compare|review|question|prompt|order|template|example|result)\b/i;
const sales=/\b(download now|install now|best app|game changer|revolutionary|must-have|boost engagement|go viral)\b/i;

function words(text:string){return text.trim().split(/\s+/).filter(Boolean).length;}
function simple(text:string){return text.replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');}
function titleCase(text:string){return simple(text).replace(/\b\w/g,c=>c.toUpperCase());}
function visualQuery(concept:Concept,line:string){const base=concept.imageQuery||concept.title;return simple(`${base} ${line}`).split(/\s+/).slice(0,8).join(' ');}
function appText(app:AppProfile){return [app.name,app.oneLineDescription,...app.features,...app.audiences,...app.contentAngles,...app.keywords].join(' ');}
function hasWeakCopy(slides:DraftSlide[],type:string,isPhotoApp:boolean){
 if(type!=='slideshow')return false;
 const body=slides.slice(0,-1),all=slides.map(s=>`${s.headline} ${s.body}`);
 if(all.some(text=>sales.test(text)||filler.test(text)||(isPhotoApp&&photoBanned.test(text))))return true;
 const weak=body.filter(s=>!useful.test(`${s.headline} ${s.body}`)||words(s.headline)>10||words(s.body)>14).length;
 const duplicate=new Set(body.map(s=>simple(s.headline).toLowerCase())).size<body.length;
 return weak>=Math.ceil(body.length/2)||duplicate;
}
function topicKind(concept:Concept,app:AppProfile){const text=[appText(app),concept.title,concept.hook,concept.angle,...concept.outline].join(' ').toLowerCase();
 if(photoRe.test(appText(app))){
  if(/font/.test(text))return 'photoFonts';
  if(/color|combo|butter|yellow|red|blue|sage|pink/.test(text))return 'photoColors';
  if(/comment|answer|prompt/.test(text))return 'photoPrompts';
  if(/mistake|avoid|missing/.test(text))return 'photoMissing';
  if(/weekend|order|formula/.test(text))return 'photoOrder';
  if(/trip|vacation|travel/.test(text))return 'photoTravel';
  return 'photoInclude';
 }
 if(/mistake|avoid|wrong/.test(text))return 'avoid';
 if(/checklist|include|need|setup|starter/.test(text))return 'checklist';
 if(/prompt|question|comment|answer/.test(text))return 'prompts';
 if(/order|routine|workflow|formula|step/.test(text))return 'steps';
 return 'generic';
}
function cleanItem(value:string){return simple(value).replace(/^\d+[.)]\s*/,'').replace(/^(feature|angle|benefit):\s*/i,'').slice(0,64);}
function appDerivedItems(app:AppProfile,concept:Concept){
 const audience=cleanItem(app.audiences[0]||'people like you').toLowerCase();
 const featureItems=[...app.contentAngles,...app.features,...app.keywords].map(cleanItem).filter(Boolean);
 const base=featureItems.length?featureItems:[cleanItem(app.oneLineDescription||concept.title||app.name)];
 const verbs=['Start with','Try','Check','Use','Save','Compare','Fix','Make','Pick','Review'];
 return base.flatMap((item,i)=>[
  `${verbs[i%verbs.length]} ${item}`,
  `${titleCase(item)} for ${audience}`.slice(0,64),
 ]).filter((item,index,self)=>item.length>3&&self.indexOf(item)===index);
}
const banks:Record<string,string[]>= {
 photoInclude:['A cover that says the vibe','One photo with people in it','A tiny detail you almost skipped','Something messy or funny','A food, drink, or receipt shot','A closer that feels calm','One layout with more than one moment','A photo that starts a question'],
 photoTravel:['Start with the best view','Add who came with you','Show what you ate','Include one tiny detail','Add the messy travel moment','End with the photo you miss most','Mix wide shots with close-ups','Use one slide for the whole day'],
 photoFonts:['Clean serif for soft trips','Bold sans for loud weekends','Handwritten for diary dumps','Condensed type for city photos','Soft italic for pretty details','Tiny captions for quiet moments','Big type for the first slide','Use butter yellow on warm shots'],
 photoColors:['Butter yellow with white','Cherry red with cream','Sky blue with cocoa','Sage green with black','Pink with espresso brown','White text on dark photos','Cream on beach photos','Blue for travel skies'],
 photoPrompts:['Which slide are you?','Guess where this was','Pick your favorite tiny detail','Which photo feels most like summer?','Save this for your next dump','What would you add?','Comment your photo-dump rule'],
 photoMissing:['No clear first slide','No people, just places','No tiny detail shot','No funny or messy photo','No final mood slide','No food, sign, or receipt','No question for comments'],
 photoOrder:['Best moment first','Then show the people','Add the place next','Drop in food or drinks','Add one tiny detail','Put the chaotic photo here','End with the quiet closer'],
 checklist:['A clear starting point','One thing to set up first','A small win to aim for','One mistake to avoid','A result you can check','A repeatable next step'],
 steps:['Start with the goal','Pick the easiest first step','Use the key feature','Check the result','Save what worked','Repeat it tomorrow'],
 avoid:['Skipping the first setup','Trying too much at once','Ignoring the useful feature','Stopping before the result','Forgetting to save progress','Making it harder than needed'],
 prompts:['What would you try first?','Which step do you skip?','Save this checklist','Send this to someone who needs it','What would you add?','Try one step today'],
 generic:['Start with the real problem','Pick one small action','Use the feature that helps','Check the result','Save the useful part','Try it again later'],
};
export function improveSlideshowSlides(type:string,app:AppProfile,concept:Concept,slides:DraftSlide[],count:number):DraftSlide[]{
 const isPhotoApp=photoRe.test(appText(app));
 if(type!=='slideshow'||!hasWeakCopy(slides,type,isPhotoApp))return slides.map(s=>({...s,headline:simple(s.headline).slice(0,150),body:simple(s.body).slice(0,100)}));
 const kind=topicKind(concept,app),profileItems=appDerivedItems(app,concept),items=[...(banks[kind]||banks.generic),...profileItems].filter(Boolean);
 const hook=simple(concept.hook||concept.title).replace(/^hook:\s*/i,'')||`${app.name} checklist`;
 const middle=Math.max(0,count-2);
 const improved:DraftSlide[]=[{headline:hook,body:'',assetId:slides[0]?.assetId||null,assetQuery:visualQuery(concept,hook)}];
 for(let i=0;i<middle;i++){const line=items[i%items.length];improved.push({headline:line,body:i%3===0?'Save this for later':'',assetId:slides[i+1]?.assetId||null,assetQuery:visualQuery(concept,line)});}
 improved.push({headline:`Try ${app.name}`,body:(app.oneLineDescription||`Make it with ${app.name}`).slice(0,70),assetId:slides[count-1]?.assetId||null,assetQuery:`${app.name} app logo download`});
 return improved.slice(0,count);
}
