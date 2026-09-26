'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function StoreRefresh({appId}:{appId:string}) {
 const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 return <div className="refresh-store"><button className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);setMessage('');try{const response=await fetch(`/api/apps/${appId}/refresh`,{method:'POST',headers:{'Content-Type':'application/json'}});const result=await response.json();if(!response.ok)throw new Error(result.error);setMessage(`${result.screenshots.length} current screenshots refreshed and added to Library.`);router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'Refresh failed.');}finally{setBusy(false);}}}>{busy?'Fetching current screenshots…':'Refresh from App Store'}</button>{message&&<p role="status" className="muted">{message}</p>}</div>;
}
