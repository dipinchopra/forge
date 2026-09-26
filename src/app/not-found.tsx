import Link from 'next/link';
export default function NotFound(){return <div className="empty-studio"><h1>This page isn’t in the studio.</h1><p>The app may have been deleted, or the link may be out of date.</p><Link className="button" href="/apps">Back to apps</Link></div>;}
