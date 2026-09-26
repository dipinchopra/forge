import {randomUUID} from 'node:crypto';
import type {OutputType} from '../models';
import type {Concept,ConceptBatch} from '../creative';
import {getApp} from './apps';
import {getDatabase} from './database';
import {getBatch} from './creatives';
import {ImportError} from './import-errors';

const PHOTO_KEYWORDS=/photo|photos|collage|carousel|dump|camera|travel|layout|template|instagram|post|swipe/i;

function clean(value:string){return value.replace(/\s+/g,' ').trim();}
function seed(app:{name:string;oneLineDescription:string;features:string[];audiences:string[];keywords:string[];contentAngles:string[]}){
 const haystack=[app.name,app.oneLineDescription,...app.features,...app.audiences,...app.keywords,...app.contentAngles].join(' ');
 const feature=clean(app.features.find(Boolean)||app.oneLineDescription||`${app.name} feature`);
 const audience=clean(app.audiences.find(Boolean)||'creators');
 return {isPhoto:PHOTO_KEYWORDS.test(haystack),feature,audience,keywords:app.keywords.filter(Boolean).slice(0,3).join(' ')};
}
function photoTopics(type:OutputType,appName:string):Concept[]{
 const slideshow=[
  ['Things to include in your photo dump','things to include in your photo dump','A list-style post that makes people compare it with their own camera roll.','photo dump details',['Hook: things to include','People','Place','Tiny details','Messy moment','CTA']],
  ['Photos that make people swipe','photos that make people swipe','Show the photo types that keep a dump from feeling flat.','friends travel details',['Strong first photo','People shot','Wide place shot','Tiny detail','Unexpected ending']],
  ['What your vacation dump needs','what your vacation dump needs','A simple checklist for a vacation photo dump people want to save.','vacation photo dump',['Cover photo','Food or drink','View','Candid moment','Final recap']],
  ['Camera roll moments worth posting','camera roll moments worth posting','Pull out the small moments people forget to include.','camera roll memories',['The random photo','The detail','The friend shot','The place','The final mood']],
  ['Photo dump ideas when nothing happened','photo dump ideas when nothing happened','Turn ordinary days into a relatable post format.','everyday photo dump',['Mirror photo','Coffee or food','Walk or sky','Desk or room','Small win']],
  ['A photo dump people comment on','a photo dump people comment on','Use prompts that make followers answer, relate, or ask where it was.','social photo dump',['Relatable hook','One funny photo','One pretty photo','One question','CTA']],
  ['Include this in every trip dump','include this in every trip dump','A trip checklist with people, place, details, and proof.','trip photo details',['Where you went','Who was there','What you ate','Small detail','Best view']],
  ['The “main character” dump checklist','main character dump checklist','A format built around mood and identity, not product pitching.','aesthetic photo dump',['Outfit','Street or room','Close detail','Blurry candid','End card']],
  ['Boring photo dump fix','boring photo dump fix','Show what to add when a dump feels too samey.','mixed photo collage',['Problem','Add a close-up','Add a human moment','Add contrast','CTA']],
  ['Weekend dump slide order','weekend dump slide order','A clear order for weekend recaps that feels natural.','weekend photo dump',['Best moment first','Friends','Food','Place','Small detail','End']],
  ['The tiny details slide','the tiny details slide','Teach why detail photos make the whole dump feel richer.','travel detail photos',['Hook','Detail examples','Why it works','Where to place it','CTA']],
  ['Photo dump prompts for comments','photo dump prompts for comments','Use interactive prompts that invite replies without sounding desperate.','instagram comments photos',['Pick a side','Guess the place','Which slide is you','Save the idea','CTA']],
 ];
 const carousel=[
  ['Things to include in your photo dump','Things to include in your photo dump','A saveable checklist of photo types: cover, people, place, food, details, and chaos.','photo dump checklist',['Cover photo','People photo','Place photo','Food or drink','Tiny detail','Messy moment']],
  ['10 photos that make a dump better','10 photos that make a dump better','List concrete photo types people can hunt for in their camera roll.','camera roll photo ideas',['The cover','The laugh','The view','The close-up','The receipt','The ending']],
  ['Photo dump checklist for trips','Photo dump checklist for trips','A travel-specific checklist built for saves and shares.','travel photo checklist',['Where you went','Who came','What you ate','What surprised you','Best view','Final mood']],
  ['What to post from a normal day','What to post from a normal day','Make everyday photo dumps feel easy and relatable.','everyday photo ideas',['Outfit','Coffee or snack','Sky or street','Desk or room','Small win','Funny detail']],
  ['Slides your photo dump is missing','Slides your photo dump is missing','Point out missing slide types that make people want to improve their next post.','photo dump missing slides',['A clear opener','A people slide','A texture slide','A funny slide','A quiet slide','A closer']],
  ['Photo dump prompts people answer','Photo dump prompts people answer','Give engagement prompts that invite comments naturally.','social media photo prompts',['Which slide are you','Guess the place','Pick the best photo','Rate the weekend','Save this list']],
  ['The perfect weekend dump order','The perfect weekend dump order','Show a repeatable slide order for weekend recaps.','weekend photo dump order',['Best moment','People','Food','Place','Tiny detail','Ending']],
  ['Tiny details to include','Tiny details to include','Teach detail shots that make posts feel more personal.','detail photos aesthetic',['Hands','Receipts','Food close-up','Shoes','Room corner','Street sign']],
  ['Photo dump mistakes to avoid','Photo dump mistakes to avoid','Keep it useful without pitching: too many same shots, weak first slide, no detail.','photo dump mistakes',['Same photo repeated','No cover','No people','No details','No ending']],
  ['Camera roll scavenger hunt','Camera roll scavenger hunt','A playful checklist people can use right away.','camera roll scavenger hunt',['Find a laugh','Find a view','Find a meal','Find a blur','Find a tiny thing','Build the dump']],
  ['First slide ideas for photo dumps','First slide ideas for photo dumps','Help users choose an opener that earns the swipe.','instagram carousel cover',['Best face','Best view','Clean layout','Funny moment','Before-after','Question slide']],
  ['A dump formula people save','A dump formula people save','A repeatable structure: hook, vibe, people, place, detail, chaos, closer.','photo dump formula',['Hook','Vibe','People','Place','Detail','Chaos','Closer']],
 ];
 return (type==='carousel'?carousel:slideshow).map(([title,hook,angle,imageQuery,outline])=>({title,hook,angle,imageQuery,outline,assetIds:[]} as Concept));
}
function genericTopics(type:OutputType,app:{name:string;oneLineDescription:string;features:string[];audiences:string[];keywords:string[];contentAngles:string[]}):Concept[]{
 const s=seed(app);const base=type==='carousel'?
  [`5 ways to use ${app.name}`,`What to fix before you start`,`${s.audience} checklist for ${s.feature}`,`Simple ${app.name} workflow`,`${s.feature} mistakes to avoid`,`Before and after with ${app.name}`,`How to get started fast`,`What ${s.audience} should try first`,`One feature that saves time`,`A cleaner way to finish faster`,`Turn a messy task into a simple one`,`Save this ${app.name} checklist`]:
  [`POV: ${s.feature} gets easier`,`Stop doing this the hard way`,`Your next task can be simpler`,`Try this before you give up`,`This is the faster way`,`One small fix changes the result`,`I wish I tried this sooner`,`Make the messy part easier`,`This took less time than expected`,`Your workflow needs this step`,`Do this before the final result`,`The simple way to start`];
 return base.map((title,i)=>({
  title:clean(title).slice(0,70),
  hook:clean(title).slice(0,90),
  angle:`Show ${s.audience} one clear way ${app.name} helps with ${s.feature}.`.slice(0,160),
  imageQuery:(s.keywords||s.feature).split(/\s+/).slice(0,5).join(' ').slice(0,80),
  outline:type==='carousel'?['Name the problem','Give one clear tip','Show the app helping','Show the result',`Try ${app.name}`]:['Hook','Problem','Simple fix','Result',`Try ${app.name}`],
  assetIds:[]
 }));
}
export function ideaBank(appId:string,type:OutputType):ConceptBatch {
 const app=getApp(appId);if(!app)throw new ImportError('App not found.',404);
 const rows=getDatabase().prepare('SELECT id FROM concept_batches WHERE appId=? AND json_extract(input,\'$.type\')=? AND createdAt>=? ORDER BY createdAt DESC LIMIT 20').all(appId,type,app.updatedAt);
 for(const row of rows){const batch=getBatch(String(row.id));if(batch&&batch.concepts.length>=10&&batch.input.formula&&batch.provider==='topics-v1')return batch;}
 const concepts=(seed(app).isPhoto?photoTopics(type,app.name):genericTopics(type,app)).slice(0,12);
 const batch:ConceptBatch={id:randomUUID(),appId,input:{appId,type,start:'surprise',idea:'',selectedAssetIds:[],imageSource:'dupe',formula:'hpsc',slideCount:6},concepts,provider:'topics-v1',createdAt:new Date().toISOString()};
 getDatabase().prepare('INSERT INTO concept_batches(id,appId,input,concepts,provider,createdAt) VALUES(?,?,?,?,?,?)').run(batch.id,appId,JSON.stringify(batch.input),JSON.stringify(concepts),batch.provider,batch.createdAt);
 return batch;
}
