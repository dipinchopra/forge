import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';
import { AppForm } from '@/components/app-form';
import { AppImport } from '@/components/app-import';
export default async function Page({searchParams}:{searchParams:Promise<{manual?:string;url?:string}>}) {
  const query = await searchParams;
  const manual = query.manual === '1';
  return <>
    <PageHeading eyebrow="A NEW CHAPTER" title="Add your app." description={manual?'Give your app a voice in your own words.':'Paste your App Store link. Forge will take it from there.'}/>
    {manual ? <><Link className="back-link" href="/apps/new">← Import from App Store instead</Link><AppForm/></> : <AppImport initialUrl={query.url?.slice(0,2048)}/>}
  </>;
}
