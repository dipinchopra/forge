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
  ['POV: your photo dump finally makes sense','POV: your photo dump finally makes sense','Turn a messy camera roll into a clean swipe story.','messy camera roll photos',['Hook the messy camera roll','Show the layout fix','Show the clean result',`Try it in ${appName}`]],
  ['Vacation photos need an order','Your vacation photos need an order','Help travel photos feel like a story, not a random dump.','beach vacation photos',['Start with the problem','Pick one cover photo','Group tiny details','End with the finished swipe']],
  ['Stop posting every photo alone','Stop posting every photo alone','Show how one collage can hold more moments without spam.','friends travel photos',['Call out the pain','Show too many photos','Show one clean layout','Ask them to save it']],
  ['Your camera roll is not boring','Your camera roll is not boring','The photos are fine; the layout needs help.','summer camera roll',['Reframe the problem','Show ordinary photos','Show the better layout','Invite them to try it']],
  ['Make random photos look planned','Make random photos look planned','Teach a simple before-and-after for scattered photos.','city travel details',['Show random photos','Add one rule','Show the polished swipe','CTA']],
  ['One swipe for the whole trip','One swipe for the whole trip','Package a whole trip into one clean carousel-style post.','travel collage aesthetic',['Open with the promise','Show trip moments','Show the swipe result','Download CTA']],
  ['Before you post 40 photos','Before you post 40 photos','Give a quick fix before someone dumps every image.','phone photo gallery',['Name the mistake','Pick the best moments','Build one layout','Show the final post']],
  ['Your beach photos can look cleaner','Your beach photos can look cleaner','Use beach pictures to show a simple photo dump upgrade.','beach vacation collage',['Hook with beach photos','Show clutter','Show clean spacing','CTA']],
  ['Make food, friends, and views fit','Make food, friends, and views fit','Show how mixed trip photos can still feel connected.','food friends travel photos',['Show mixed moments','Choose one layout style','Show connected result','Try the app']],
  ['Turn a weekend into one post','Turn a weekend into one post','Make weekend memories easier to share.','weekend photo dump',['Weekend hook','Select moments','Show swipe layout','CTA']],
  ['Your recap needs one cover','Your recap needs one cover','Start with a strong first slide so people keep swiping.','travel recap cover photo',['Show weak start','Choose cover photo','Add supporting shots','Finish with CTA']],
  ['Post more photos without clutter','Post more photos without clutter','Show a simple way to share more while staying clean.','clean photo collage',['Problem','Simple layout rule','Before after','CTA']],
 ];
 const carousel=[
  ['5 ways to fix a photo dump','5 ways to fix your photo dump','Give five simple layout rules creators can save.','photo dump layout ideas',['Show the problem','Pick a clear cover','Group similar photos','Use white space','End with the app']],
  ['Photo dump order that works','A simple order for photo dumps','Teach the order: cover, people, places, details, ending.','travel photo dump',['Why order matters','Cover photo','People and places','Small details','CTA']],
  ['Make vacation photos look cleaner','Make vacation photos look cleaner','Show practical layout tips for travel photos.','vacation photo collage',['Messy vs clean','Choose one theme','Balance close and wide shots','Add the layout','CTA']],
  ['3 mistakes that clutter carousels','3 mistakes that clutter carousels','Help users spot common carousel mistakes.','cluttered photo grid',['Mistake one','Mistake two','Mistake three','Better layout','CTA']],
  ['Build a swipe post from 20 photos','Turn 20 photos into one swipe post','Show how to reduce a large camera roll into one post.','phone gallery travel',['Start with 20 photos','Choose a cover','Group the rest','Show final swipe','CTA']],
  ['Clean layouts for messy moments','Clean layouts for messy moments','Teach layout choices for imperfect real photos.','candid travel photos',['Messy moments are fine','Use one strong frame','Pair small details','Leave space','CTA']],
  ['How to choose your first slide','How to choose your first slide','Make the first slide clear enough to earn the swipe.','instagram carousel cover',['What the cover must do','Pick the best image','Add short text','Show example','CTA']],
  ['Photo dump captions need structure','Photo dumps need a little structure','Teach why layout comes before caption.','editorial photo dump',['Start with layout','Set the mood','Arrange details','Then write caption','CTA']],
  ['Before and after photo dump fix','Before and after photo dump fix','Show a plain before and a cleaner after.','before after collage',['Before','What changed','Why it works','How to copy it','CTA']],
  ['Travel carousel checklist','Travel carousel checklist','Give a saveable checklist for travel posts.','travel checklist photos',['Cover','People','Place','Details','CTA']],
  ['Make small moments look bigger','Make small moments look bigger','Show how tiny details can anchor a post.','coffee beach travel detail',['Pick small moments','Give them space','Pair with wide shots','Show result','CTA']],
  ['Simple photo dump layout formula','Simple photo dump layout formula','Give a repeatable layout formula for creators.','minimal collage layout',['One hero photo','Two detail photos','One result slide','Repeat the formula','CTA']],
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
 const batch:ConceptBatch={id:randomUUID(),appId,input:{appId,type,start:'surprise',idea:'',selectedAssetIds:[],imageSource:'dupe',formula:'hpsc'},concepts,provider:'topics-v1',createdAt:new Date().toISOString()};
 getDatabase().prepare('INSERT INTO concept_batches(id,appId,input,concepts,provider,createdAt) VALUES(?,?,?,?,?,?)').run(batch.id,appId,JSON.stringify(batch.input),JSON.stringify(concepts),batch.provider,batch.createdAt);
 return batch;
}
