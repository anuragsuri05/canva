// Public view / template links. Without a backend the design itself travels in the URL:
// `#/view/z<lz-string>` (heavy data: URLs are stripped when the link would get too long).

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { useEffect, useState } from 'react';
import type { Design } from '../model/types';

const MAX_LINK = 300_000;

/* Local uploads (asset:<id>) only exist in this browser, so links embed downscaled copies. */
const assetCache = new Map<string, string>();

function walk(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => walk(x, fn));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = walk(x, fn);
    return o;
  }
  return v;
}

async function shrinkAsset(ref: string): Promise<string> {
  const { srcToBlob } = await import('../store/blobs');
  const blob = await srcToBlob(ref);
  if (!blob.type.startsWith('image/')) return '';
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  let alpha = false;
  if (blob.type !== 'image/jpeg') {
    const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < px.length; i += 16) if (px[i] < 250) {
      alpha = true;
      break;
    }
  }
  return c.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.82);
}

/** Pre-load embeddable copies of a design's uploads so share links work on other devices. */
export async function warmShareAssets(d: Design): Promise<number> {
  const refs = new Set<string>();
  walk(d, (s) => (s.startsWith('asset:') && !assetCache.has(s) && refs.add(s), s));
  let n = 0;
  for (const r of refs) {
    try {
      assetCache.set(r, await shrinkAsset(r));
      n++;
    } catch {
      assetCache.set(r, '');
    }
  }
  return n;
}

function stripHeavy(v: unknown, limit: number): unknown {
  if (typeof v === 'string') return v.startsWith('data:') && v.length > limit ? '' : v;
  if (Array.isArray(v)) return v.map((x) => stripHeavy(x, limit));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = stripHeavy(x, limit);
    return o;
  }
  return v;
}

export function publicDesign(d: Design): Design {
  const pub = { ...structuredClone(d), comments: [], share: undefined, approval: undefined };
  return walk(pub, (s) => (s.startsWith('asset:') && assetCache.get(s) ? assetCache.get(s)! : s)) as Design;
}

/** Compressed id (starts with 'z') carrying the whole design. */
export function encodeDesign(d: Design, maxLen = MAX_LINK): string {
  const pub = publicDesign(d);
  let enc = 'z' + compressToEncodedURIComponent(JSON.stringify(pub));
  for (const limit of [200_000, 20_000, 2_000, 0]) {
    if (enc.length <= maxLen) break;
    enc = 'z' + compressToEncodedURIComponent(JSON.stringify(stripHeavy(pub, limit)));
  }
  return enc;
}

export function decodeDesign(id: string): Design | null {
  if (!id.startsWith('z')) return null;
  try {
    const json = decompressFromEncodedURIComponent(id.slice(1));
    if (!json) return null;
    const d = JSON.parse(json) as Design;
    return Array.isArray(d?.pages) ? d : null;
  } catch {
    return null;
  }
}

export const appBase = () => location.origin + location.pathname;

export function viewLink(d: Design, opts: { template?: boolean; maxLen?: number } = {}) {
  return `${appBase()}#/view/${encodeDesign(d, opts.maxLen)}${opts.template ? '?template=1' : ''}`;
}

/** Short link that only resolves on this device (used when a QR code can't hold the full design). */
export const localViewLink = (d: Design, template = false) => `${appBase()}#/view/${d.id}${template ? '?template=1' : ''}`;

export function qrLink(d: Design) {
  const full = viewLink(d, { maxLen: 2200 });
  return full.length <= 2300 ? full : localViewLink(d);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export const SOCIAL = [
  { id: 'x', label: 'X', icon: 'Twitter', url: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { id: 'facebook', label: 'Facebook', icon: 'Facebook', url: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', url: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: 'pinterest', label: 'Pinterest', icon: 'Pin', url: (u: string, t: string) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}` },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', url: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}` },
  { id: 'email', label: 'Email', icon: 'Mail', url: (u: string, t: string) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent('Check out my design: ' + u)}` },
];

export function recordView(designId: string) {
  try {
    const k = 'cream-insights-' + designId;
    const cur = JSON.parse(localStorage.getItem(k) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    cur.views = (cur.views ?? 0) + 1;
    cur.byDay = { ...(cur.byDay ?? {}), [today]: (cur.byDay?.[today] ?? 0) + 1 };
    cur.lastViewed = Date.now();
    localStorage.setItem(k, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

export function recordPresent(designId: string) {
  try {
    const k = 'cream-insights-' + designId;
    const cur = JSON.parse(localStorage.getItem(k) || '{}');
    cur.presents = (cur.presents ?? 0) + 1;
    localStorage.setItem(k, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
  recordView(designId);
}

/** Hook: warm embeddable asset copies for `d`; re-renders once they're ready. */
export function useWarmShareAssets(d: Design | null | undefined) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!d) return;
    let alive = true;
    warmShareAssets(d).then((k) => alive && k && setN((x) => x + 1));
    return () => {
      alive = false;
    };
  }, [d?.id, d?.updatedAt]);
  return n;
}
