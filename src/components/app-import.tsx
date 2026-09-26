'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Download, LoaderCircle, Sparkles } from 'lucide-react';
import { mediaUrl, type ImportDraft, type MarketingProfile } from '@/lib/import-types';

const fields = [
  ['audiences','Audiences'], ['features','Features'], ['contentAngles','Content angles'],
  ['tone','Tone'], ['keywords','Keywords'],
] as const;

export function AppImport({initialUrl=''}: {initialUrl?:string}) {
  const router = useRouter();
  const [url,setUrl] = useState(initialUrl);
  const [useCodex,setUseCodex] = useState(true);
  const [draft,setDraft] = useState<ImportDraft | null>(null);
  const [phase,setPhase] = useState<'idle'|'fetching'|'generating'|'saving'>('idle');
  const [error,setError] = useState('');
  const [existingAppId,setExistingAppId] = useState<string | null>(null);
  const busy = phase !== 'idle';

  async function generate(imported: ImportDraft) {
    setPhase('generating');
    try {
      const response = await fetch('/api/apps/import/generate', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({draftId:imported.id}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDraft(result);
    } catch(error) {
      setError(error instanceof Error ? error.message : 'Could not generate copy. You can still save the imported app.');
    } finally { setPhase('idle'); }
  }

  return <div className="import-workspace">
    {!draft && <form className="import-entry" onSubmit={async event => {
      event.preventDefault(); setError(''); setExistingAppId(null); setPhase('fetching');
      try {
        const response = await fetch('/api/apps/import', {
          method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url}),
        });
        const result = await response.json();
        if (!response.ok) { setExistingAppId(result.existingAppId || null); throw new Error(result.error); }
        setDraft(result);
        if (useCodex) await generate(result); else setPhase('idle');
      } catch(error) {
        setError(error instanceof Error ? error.message : 'Could not import the app. Try again.'); setPhase('idle');
      }
    }}>
      <div className="import-heading"><div className="import-symbol"><Download size={25}/></div><div><h2>One link. Your app, ready to go.</h2><p>Bring in the icon, screenshots, and details from your App Store listing.</p></div></div>
      <label htmlFor="store-url">App Store URL</label>
      <div className="import-url-row"><input id="store-url" type="url" required placeholder="https://apps.apple.com/in/app/…/id1592547810" value={url} onChange={event=>setUrl(event.target.value)} disabled={busy}/><button className="button" disabled={busy}>{phase==='fetching'?<LoaderCircle className="spinning" size={16}/>:<ArrowRight size={16}/>} {phase==='fetching'?'Fetching listing…':'Import app'}</button></div>
      <label className="checkbox-row"><input type="checkbox" checked={useCodex} onChange={event=>setUseCodex(event.target.checked)} disabled={busy}/><span><strong>Draft my marketing profile with Codex</strong><small>Uses your ChatGPT sign-in and Codex allowance. Sends the public listing text to OpenAI.</small></span><Sparkles size={18}/></label>
      <div className="import-steps"><span>01 · Fetch the listing</span><span>02 · Review your profile</span><span>03 · Save to your studio</span></div>
    </form>}

    {phase==='generating' && <div role="status" className="import-progress"><LoaderCircle className="spinning" size={20}/><div><strong>Codex is finding your app’s voice…</strong><p>Your images are downloaded. Drafting audiences, features, content angles, and copy. This may take a couple of minutes.</p></div></div>}
    {error && <div role="alert" className="error-message">{error}{existingAppId && <p><Link className="inline-link" href={`/apps/${existingAppId}`}>Open existing app →</Link></p>}</div>}

    {draft && <>
      <section className="import-preview">
        <div className="store-identity">{draft.iconPath && <img src={mediaUrl(draft.iconPath)} alt={`${draft.metadata.name} icon`} width={80} height={80}/>}<div><span className="eyebrow">IMPORTED FROM APPLE</span><h2>{draft.metadata.name}</h2><p>{draft.metadata.developer} · {draft.metadata.category}</p></div></div>
        <ScreenshotStrip paths={draft.screenshots} name={draft.metadata.name}/>
        {draft.existingAppId && <p className="import-merge-note">This will fill your existing app profile. Previously completed marketing fields are preserved.</p>}<p className="muted">{draft.screenshots.length} screenshots saved locally{draft.iconPath ? ' · App icon saved' : ''}</p>
        {draft.warnings.map(warning=><p key={warning} className="import-warning">{warning}</p>)}
        <details className="store-description"><summary>Original App Store description</summary><p>{draft.metadata.description || 'No description returned by Apple.'}</p></details>
      </section>
      <form key={`${draft.id}-${draft.profileSource}`} className="profile-form import-profile" onSubmit={async event => {
        event.preventDefault(); setPhase('saving'); setError('');
        const form = new FormData(event.currentTarget);
        const profile: MarketingProfile = {
          name:String(form.get('name') || ''), oneLineDescription:String(form.get('oneLineDescription') || ''),
          audiences:[],features:[],contentAngles:[],tone:[],keywords:[],
        };
        for (const [key] of fields) profile[key] = String(form.get(key)||'').split('\n').map(value=>value.trim()).filter(Boolean);
        try {
          const response = await fetch('/api/apps/import/commit', {
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({draftId:draft.id,profile}),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          router.push(`/apps/${result.id}`); router.refresh();
        } catch(error) { setError(error instanceof Error ? error.message : 'Could not save the app.'); setPhase('idle'); }
      }}>
        <div className="form-intro"><span className="eyebrow">{draft.profileSource==='codex'?'DRAFTED WITH CODEX · YOURS TO EDIT':'YOUR EDITABLE MARKETING PROFILE'}</span><h2>Make the positioning yours.</h2><p>{draft.profileSource==='codex'?'Review these suggestions before saving. The original listing stays alongside your profile.':'Save the imported details now, or let Codex suggest your positioning.'}</p></div>
        {draft.profileSource!=='codex' && <button type="button" className="button secondary draft-button" disabled={busy} onClick={()=>{setError('');void generate(draft);}}><Sparkles size={16}/>Draft with Codex</button>}
        <fieldset disabled={busy} className="import-fieldset">
          <label>App name<input name="name" required maxLength={100} defaultValue={draft.profile.name}/></label>
          <label>One-line description<textarea name="oneLineDescription" maxLength={500} rows={2} defaultValue={draft.profile.oneLineDescription}/></label>
          <p className="muted list-hint">One item per line. Audiences, angles, and tone are suggestions you can refine.</p>
          <div className="form-grid">{fields.map(([key,label])=><label key={key}>{label}<textarea name={key} rows={4} defaultValue={draft.profile[key].join('\n')}/></label>)}</div>
          <div className="form-actions"><button type="button" className="button secondary" onClick={()=>{setDraft(null);setError('');}}>Start over</button><button type="submit" className="button">{phase==='saving'?'Saving…':draft.existingAppId?'Update app in studio':'Save app to studio'}<ArrowRight size={16}/></button></div>
        </fieldset>
      </form>
    </>}
    {!draft && <p className="manual-entry">Prefer to start from scratch? <Link href="/apps/new?manual=1">Enter app details manually →</Link></p>}
  </div>;
}

export function ScreenshotStrip({paths,name}: {paths:string[];name:string}) {
  if (!paths.length) return null;
  return <div className="screenshot-strip" aria-label="App Store screenshots">{paths.map((path,index)=><a href={mediaUrl(path)} target="_blank" rel="noreferrer" key={path}><img src={mediaUrl(path)} alt={`${name} App Store screenshot ${index+1}`} loading="lazy"/></a>)}</div>;
}
