'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="empty-studio"><h1>Something interrupted the studio.</h1><p>Check that your data directory is writable, then try again.</p><button className="button" onClick={reset}>Try again</button></div>;}
