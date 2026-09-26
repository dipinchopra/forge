import { PageHeading } from '@/components/page-heading';
import { LurkerWorkspace } from '@/components/lurker-workspace';
import { listApps } from '@/lib/server/apps';
import { listInspirations } from '@/lib/server/lurker';
export default function Page(){return <><PageHeading eyebrow="SAVE THE SPARK. REMIX THE FORMAT." title="Good ideas leave clues." description="Understand what makes a post work, then make something original for your apps."/><LurkerWorkspace apps={listApps()} initialItems={listInspirations()}/></>;}
