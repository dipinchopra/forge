import { PageHeading } from '@/components/page-heading';
import { AssetLibrary } from '@/components/asset-library';
import { listApps } from '@/lib/server/apps';
export default function Page(){return <><PageHeading eyebrow="YOUR ASSETS FIRST" title="Your creative ingredients." description="Current App Store screenshots, local app assets, and everything you add next."/><AssetLibrary apps={listApps()}/></>;}
