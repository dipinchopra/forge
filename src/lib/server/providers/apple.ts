import { z } from 'zod';
import type { StoreMetadata } from '../../import-types';
import type { AppMetadataProvider } from '../../providers/contracts';
import { ImportError } from '../import-errors';

export function parseAppStoreUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new ImportError('Paste a valid Apple App Store URL.'); }
  const id = url.pathname.match(/\/id(\d+)(?:\/|$)/)?.[1];
  if (url.protocol !== 'https:' || url.hostname !== 'apps.apple.com' || url.port || url.username || url.password || !id) {
    throw new ImportError('Use an https://apps.apple.com/…/id123456789 URL.');
  }
  const country = url.pathname.match(/^\/([a-z]{2})\/app\//i)?.[1].toLowerCase() || 'us';
  return { id, country, url: `https://apps.apple.com/${country}/app/id${id}` };
}

export async function boundedResponse(response: Response, maximum: number) {
  if (!response.ok) throw new Error(`Apple returned HTTP ${response.status}.`);
  if (Number(response.headers.get('content-length')) > maximum) throw new Error('The downloaded file is too large.');
  if (!response.body) throw new Error('Apple returned an empty response.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('The downloaded file is too large.');
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { await reader.cancel(); }
}

export function isAppleImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.mzstatic.com') && !url.port && !url.username && !url.password;
  } catch { return false; }
}

const lookupSchema = z.object({ results: z.array(z.object({
  trackId: z.number(), trackName: z.string().min(1), description: z.string().default(''),
  primaryGenreName: z.string().default(''), sellerName: z.string().optional(), artistName: z.string().default(''),
  artworkUrl512: z.string().optional(), artworkUrl100: z.string().optional(),
  screenshotUrls: z.array(z.string()).default([]), ipadScreenshotUrls: z.array(z.string()).default([]),
})) });

export function parseCurrentScreenshots(html: string): string[] {
  const script = html.match(/<script[^>]*id=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!script) throw new Error('Apple listing data was not found.');
  const payload = JSON.parse(script[1]);
  const results: string[] = [];
  // Only the app's own product-media shelves, never recommendations or events.
  for (const page of payload.data || []) {
    const shelves = page?.data?.shelfMapping || {};
    for (const [name, shelf] of Object.entries(shelves)) {
      if (!name.startsWith('product_media_')) continue;
      for (const item of (shelf as {items?: Array<{screenshot?: {template?: string; width?:number; height?:number}}>}).items || []) {
        const image = item.screenshot;
        if (!image?.template) continue;
        const width = Math.min(image.width || 1284, 1600);
        const height = Math.round(width * (image.height || 2778) / (image.width || 1284));
        const url = image.template.replaceAll('{w}',String(width)).replaceAll('{h}',String(height)).replaceAll('{c}','bb').replaceAll('{f}','jpg');
        if (isAppleImageUrl(url)) results.push(url);
      }
    }
  }
  if (!results.length) throw new Error('No current screenshots were found on the listing.');
  return [...new Set(results)].slice(0,20);
}

export class AppleMetadataProvider implements AppMetadataProvider {
  async retrieve(value: string): Promise<StoreMetadata> {
    const parsed = parseAppStoreUrl(value);
    let data: z.infer<typeof lookupSchema>;
    try {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${parsed.id}&country=${parsed.country}&entity=software`, {
        signal: AbortSignal.timeout(20000), redirect: 'error', cache: 'no-store',
      });
      data = lookupSchema.parse(JSON.parse((await boundedResponse(response, 2_000_000)).toString('utf8')));
    } catch { throw new ImportError('Apple could not be reached. Check your connection and try again.', 502); }
    const app = data.results.find(item => String(item.trackId) === parsed.id);
    if (!app) throw new ImportError(`This app was not found in the ${parsed.country.toUpperCase()} App Store. Check the URL or try its listing in another country.`, 404);
    const metadata: StoreMetadata = {
      name: app.trackName, appleAppId: parsed.id, appStoreUrl: parsed.url,
      subtitle: '', description: app.description, category: app.primaryGenreName,
      developer: app.sellerName || app.artistName,
      iconUrl: app.artworkUrl512 || app.artworkUrl100 || null,
      screenshotUrls: [],
      screenshotSource: 'live-storefront',
    };
    // The public lookup does not expose subtitles. Enrich from the public page
    // when its current markup provides one; failure never blocks the import.
    try {
      let listingUrl = parsed.url;
      const signal = AbortSignal.timeout(15000);
      let response: Response | undefined;
      for (let hop = 0; hop < 4; hop++) {
        response = await fetch(listingUrl, { signal, redirect: 'manual', cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB,en;q=0.9' } });
        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.get('location');
        if (!location) throw new Error('Missing redirect destination.');
        const next = new URL(location, listingUrl);
        if (next.origin !== 'https://apps.apple.com') throw new Error('Unexpected listing redirect.');
        listingUrl = next.href;
      }
      if (!response) throw new Error('No listing response.');
      const html = (await boundedResponse(response, 4_000_000)).toString('utf8');
      metadata.screenshotUrls = parseCurrentScreenshots(html);
      const match = html.match(/<(?:h2|p)\b[^>]*class="[^"]*(?:subtitle|product-header__subtitle)[^"]*"[^>]*>([^<]+)<\/(?:h2|p)>/i);
      if (match) metadata.subtitle = match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
    } catch { throw new ImportError('The current App Store screenshots could not be verified. Try again shortly. Forge will not substitute older lookup images.', 502); }
    return metadata;
  }
}
