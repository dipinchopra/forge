import { PageHeading } from '@/components/page-heading';
import { CreateWorkspace } from '@/components/create-workspace';
import { getBatch } from '@/lib/server/creatives';
import { listApps } from '@/lib/server/apps';
export default async function CreatePage({searchParams}:{searchParams:Promise<{batchId?:string}>}) { const {batchId}=await searchParams;const batch=batchId?getBatch(batchId):null; return <><PageHeading eyebrow="FOR YOUR APPS" title="Create" description="Choose a format and build your next batch."/><CreateWorkspace apps={listApps()} initialBatch={batch}/></>; }
