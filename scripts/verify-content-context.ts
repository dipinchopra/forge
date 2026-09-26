import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {getDatabase} from '../src/lib/server/database';
import {createProject} from '../src/lib/server/creatives';
import {getApp} from '../src/lib/server/apps';
async function main(){
const appId='a7237d83-fe3b-4a97-a947-9ee67cf394df',app=getApp(appId);
if(!app)throw new Error('Panoslice must be added first.');
const id=randomUUID(),concept={title:'Make your beach photo dump feel like a story',hook:'Your beach photos need a story',angle:'Turn a beach trip into a photo story with a wide shot, a small detail and a shared moment.',imageQuery:'beach vacation photos',outline:['Show the trip','Explain why repeated wide shots feel flat','Mix a wide shot with close details','Arrange the story in Panoslice'],assetIds:[]};
getDatabase().prepare('INSERT INTO concept_batches(id,appId,input,concepts,provider,createdAt) VALUES(?,?,?,?,?,?)').run(id,appId,JSON.stringify({appId,type:'slideshow',start:'idea',idea:concept.angle,selectedAssetIds:[],imageSource:'pinterest',formula:'hpsc',ratio:'9:16'}),JSON.stringify([concept]),'verification',new Date().toISOString());
const project=await createProject(id,0);
await writeFile('/tmp/forge-content-context.json',JSON.stringify(project,null,2));
console.log(JSON.stringify({projectId:project.id,slides:project.slides.map(s=>({headline:s.headline,body:s.body,assetQuery:s.assetQuery,assetId:s.assetId}))},null,2));
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
