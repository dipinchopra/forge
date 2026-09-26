'use client';
import { useEffect, useState } from 'react';
export function CodexStatus() {
  const [status,setStatus] = useState<{connected:boolean;message:string} | null>(null);
  async function check() {
    setStatus(null);
    try { const response = await fetch('/api/codex/status'); if(!response.ok) throw new Error(); setStatus(await response.json()); }
    catch { setStatus({connected:false,message:'Could not check Codex. Try again.'}); }
  }
  useEffect(()=>{ void check(); },[]);
  return <div className="codex-status"><h2>Codex powers your creative studio.</h2><p role="status">{status?.message || 'Checking your local Codex connection…'}</p><p>Uses your ChatGPT allowance for profiles, concepts, slides, reference analysis, and template-video plans. Requires internet; assets and rendering stay local.</p>{status && !status.connected && <small>Run <code>codex login</code> in Terminal and choose ChatGPT. If Codex is installed outside PATH, set FORGE_CODEX_BIN in .env.local and restart Forge.</small>}<button type="button" className="button secondary" onClick={()=>void check()} disabled={!status}>Check connection</button></div>;
}
