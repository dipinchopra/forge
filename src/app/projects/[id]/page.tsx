import {eligibleAssets,isTemplateAsset} from '@/lib/asset-policy';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject } from '@/lib/server/creatives';
import { getAsset,listAssets } from '@/lib/server/assets';
import { ProjectEditor } from '@/components/project-editor';
export default async function Page({params}:{params:Promise<{id:string}>}) {
 const project=getProject((await params).id);if(!project)notFound();
 const assets=eligibleAssets(listAssets(project.appId),project.type);
 for(const slide of project.slides)if(slide.assetId&&!assets.some(asset=>asset.id===slide.assetId)){const asset=getAsset(slide.assetId);if(asset&&!isTemplateAsset(asset))assets.push(asset);}
 return <><Link href="/projects" className="back-link">← All projects</Link><ProjectEditor project={project} assets={assets}/></>;
}
