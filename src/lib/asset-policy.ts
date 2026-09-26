import type { Asset, OutputType } from './models';
export function isTemplateAsset(asset:Asset) {
 return asset.category==='TEMPLATE'||/template dump|templates? dump|canvas assets|display images?/i.test(asset.sourceKey||'');
}
export function eligibleAssets(assets:Asset[],type:OutputType) {
 return assets.filter(asset=>!isTemplateAsset(asset)&&(type==='hook-demo'?asset.sourceKind==='local'||asset.sourceKind==='upload':asset.type==='image'));
}
export function footageRole(asset:Asset):'hook'|'demo'|'other' {
 const key=(asset.sourceKey||'').replaceAll('\\','/');
 if(/\/hooks?\s*\//i.test(key))return 'hook';
 if(/\/demo\s*\//i.test(key))return 'demo';
 return 'other';
}
