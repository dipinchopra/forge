import type {Concept} from '../creative';

type DraftSlide={headline:string;body:string;assetId:string|null;assetQuery:string};

const banned=/\b(include less|fewer photos|less photos|post less|delete photos|cut photos|remove moments|less is more|minimal photos|only one photo|shrink your dump)\b/i;
const filler=/\b(unlock|elevate|transform|enhance|stunning|vibes?|aesthetic journey|visual story|stand out|next level|curate|seamless|magic|perfect memories|beautiful moments|make it pop|fresh look|creative flow)\b/i;
const useful=/\b(include|add|use|pick|start|show|save|try|photo|slide|dump|font|color|combo|detail|food|friend|view|outfit|receipt|blur|sky|coffee|caption|comment|question|weekend|trip|camera|roll|cover|closer|layout|template)\b/i;
const sales=/\b(download now|install now|best app|game changer|revolutionary|must-have|boost engagement|go viral)\b/i;

function words(text:string){return text.trim().split(/\s+/).filter(Boolean).length;}
function simple(text:string){return text.replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');}
function visualQuery(concept:Concept,line:string){const base=concept.imageQuery||concept.title;return simple(`${base} ${line}`).split(/\s+/).slice(0,8).join(' ');}
function hasWeakCopy(slides:DraftSlide[],type:string){
 if(type!=='slideshow')return false;
 const body=slides.slice(0,-1);
 if(slides.some(s=>banned.test(`${s.headline} ${s.body}`)||sales.test(`${s.headline} ${s.body}`)))return true;
 const weak=body.filter(s=>!useful.test(`${s.headline} ${s.body}`)||filler.test(`${s.headline} ${s.body}`)||words(s.headline)>10||words(s.body)>14).length;
 const duplicate=new Set(body.map(s=>simple(s.headline).toLowerCase())).size<body.length;
 return weak>=Math.ceil(body.length/2)||duplicate;
}
function topicKind(concept:Concept){const text=[concept.title,concept.hook,concept.angle,...concept.outline].join(' ').toLowerCase();
 if(/font/.test(text))return 'fonts';
 if(/color|combo|butter|yellow|red|blue|sage|pink/.test(text))return 'colors';
 if(/comment|answer|prompt/.test(text))return 'prompts';
 if(/mistake|avoid|missing/.test(text))return 'missing';
 if(/weekend|order|formula/.test(text))return 'order';
 if(/trip|vacation|travel/.test(text))return 'travel';
 return 'include';
}
const banks:Record<string,string[]>= {
 include:['A cover that says the vibe','One photo with people in it','A tiny detail you almost skipped','Something messy or funny','A food, drink, or receipt shot','A closer that feels calm','One layout with more than one moment','A photo that starts a question','The view plus the little thing','A blurry one that feels real'],
 travel:['Start with the best view','Add who came with you','Show what you ate','Include one tiny detail','Add the messy travel moment','End with the photo you miss most','Mix wide shots with close-ups','Use one slide for the whole day','Add a sign, ticket, or receipt','Show the color of the place'],
 fonts:['Clean serif for soft trips','Bold sans for loud weekends','Handwritten for diary dumps','Condensed type for city photos','Soft italic for pretty details','Tiny captions for quiet moments','Big type for the first slide','Mix one font, not five','Use white when photos are busy','Use butter yellow on warm shots'],
 colors:['Butter yellow with white','Cherry red with cream','Sky blue with cocoa','Sage green with black','Pink with espresso brown','White text on dark photos','Cream on beach photos','Red for one spicy detail','Blue for travel skies','Black when the photo is bright'],
 prompts:['Which slide are you?','Guess where this was','Pick your favorite tiny detail','Which photo feels most like summer?','Save this for your next dump','Send this to your camera-roll friend','What would you add?','Slide 3 is always the best one','Are you the food-photo friend?','Comment your photo-dump rule'],
 missing:['No clear first slide','No people, just places','No tiny detail shot','No funny or messy photo','No final mood slide','No food, sign, or receipt','No contrast between close and wide','No layout for extra memories','No question for comments','No slide that feels real'],
 order:['Best moment first','Then show the people','Add the place next','Drop in food or drinks','Add one tiny detail','Put the chaotic photo here','End with the quiet closer','Keep the strongest color together','Break up selfies with details','Save the app layout for the end'],
};
export function improveSlideshowSlides(type:string,concept:Concept,slides:DraftSlide[],count:number):DraftSlide[]{
 if(type!=='slideshow'||!hasWeakCopy(slides,type))return slides.map(s=>({...s,headline:simple(s.headline).slice(0,150),body:simple(s.body).slice(0,100)}));
 const kind=topicKind(concept),items=banks[kind]||banks.include,hook=simple(concept.hook||concept.title).replace(/^hook:\s*/i,'');
 const middle=Math.max(0,count-2);
 const improved:DraftSlide[]=[{headline:hook||'Things to include in your photo dump',body:'',assetId:slides[0]?.assetId||null,assetQuery:visualQuery(concept,hook||'photo dump cover')}];
 for(let i=0;i<middle;i++){const line=items[i%items.length];improved.push({headline:line,body:i%3===0?'Save this idea for later':'',assetId:slides[i+1]?.assetId||null,assetQuery:visualQuery(concept,line)});}
 improved.push({headline:'Build it in Panoslice',body:'Add more moments in one layout',assetId:slides[count-1]?.assetId||null,assetQuery:'Panoslice app logo download'});
 return improved.slice(0,count);
}
