import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
export const metadata: Metadata = { title: 'Forge — Creative studio', description: 'Your local-first marketing studio.' };
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="en"><body><Shell>{children}</Shell></body></html>; }
