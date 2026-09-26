import { notFound } from 'next/navigation';
import { getApp } from '@/lib/server/apps';
import { PageHeading } from '@/components/page-heading';
import { AppForm } from '@/components/app-form';
export default async function Page({params}:{params:Promise<{id:string}>}){const app=getApp((await params).id);if(!app)notFound();return <><PageHeading eyebrow="MAKE IT YOURS" title={`Edit ${app.name}.`} description="Your positioning can evolve. Your profile should too."/><AppForm app={app}/></>;}
