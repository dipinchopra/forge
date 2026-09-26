import { randomUUID } from 'node:crypto';
import { AppleMetadataProvider } from './providers/apple';
import { downloadImage } from './app-import';
import { getApp } from './apps';
import { getDatabase } from './database';
import { syncStoreAssets } from './assets';
import { ImportError } from './import-errors';
export async function refreshStore(appId:string) {
  const app=getApp(appId);if(!app?.appStoreUrl)throw new ImportError('Add an App Store URL first.');
  const metadata=await new AppleMetadataProvider().retrieve(app.appStoreUrl);
  const group=randomUUID();
  const screenshots:string[]=[];
  for(let i=0;i<metadata.screenshotUrls.length;i+=4) {
    screenshots.push(...await Promise.all(metadata.screenshotUrls.slice(i,i+4).map((url,index)=>downloadImage(url,group,`screenshot-${i+index+1}`))));
  }
  let iconPath=app.iconPath;
  if(metadata.iconUrl) iconPath=await downloadImage(metadata.iconUrl,group,'icon');
  // Do not replace working images until every current screenshot is downloaded.
  getDatabase().prepare(`UPDATE apps SET screenshots=?,iconPath=?,subtitle=?,description=?,category=?,developer=?,screenshotSource=?,screenshotsRefreshedAt=?,updatedAt=? WHERE id=?`).run(
    JSON.stringify(screenshots),iconPath,metadata.subtitle,metadata.description,metadata.category,metadata.developer,'live-storefront',new Date().toISOString(),new Date().toISOString(),appId,
  );
  await syncStoreAssets(appId);
  return getApp(appId)!;
}
