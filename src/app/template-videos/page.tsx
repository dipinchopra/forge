import { PageHeading } from '@/components/page-heading';
import { TemplateVideos } from '@/components/template-videos';
import { listApps } from '@/lib/server/apps';
export default async function Page({searchParams}:{searchParams:Promise<{appId?:string}>}){return <><PageHeading eyebrow="BULK VIDEO" title="Template Swipes" description="Pick designs. Vary the hook and CTA. Render a batch."/><TemplateVideos apps={listApps()} initialAppId={(await searchParams).appId}/></>;}
