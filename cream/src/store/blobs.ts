import { useEffect, useState } from 'react';
import { db } from './persist';
import { uid } from '../model/defaults';

// Resolves `asset:<id>` references (blobs stored in IndexedDB) to object URLs.
// Remote http(s) URLs and data: URLs pass straight through.

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export const isAssetRef = (src?: string) => !!src && src.startsWith('asset:');

export function resolveSrcSync(src?: string): string {
  if (!src) return '';
  if (!isAssetRef(src)) return src;
  return urlCache.get(src) ?? '';
}

export async function resolveSrc(src?: string): Promise<string> {
  if (!src) return '';
  if (!isAssetRef(src)) return src;
  const hit = urlCache.get(src);
  if (hit) return hit;
  let p = pending.get(src);
  if (!p) {
    p = db.getBlob(src.slice(6)).then((b) => {
      const url = b ? URL.createObjectURL(b) : '';
      if (url) urlCache.set(src, url);
      pending.delete(src);
      return url;
    });
    pending.set(src, p);
  }
  return p;
}

/** React hook: returns a displayable URL for any src (asset ref or URL). */
export function useSrc(src?: string): string {
  const [url, setUrl] = useState(() => resolveSrcSync(src));
  useEffect(() => {
    let alive = true;
    const sync = resolveSrcSync(src);
    if (sync) setUrl(sync);
    else resolveSrc(src).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [src]);
  return url;
}

/** Store a blob and return its `asset:<id>` reference. */
export async function storeBlob(blob: Blob, id = uid()): Promise<string> {
  await db.putBlob(id, blob);
  const ref = 'asset:' + id;
  urlCache.set(ref, URL.createObjectURL(blob));
  return ref;
}

/** Read any src as a Blob (asset ref, data URL or remote URL). */
export async function srcToBlob(src: string): Promise<Blob> {
  if (isAssetRef(src)) {
    const b = await db.getBlob(src.slice(6));
    if (!b) throw new Error('Missing asset ' + src);
    return b;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error('Fetch failed ' + res.status);
  return res.blob();
}

/** Convert any src to a data URL (used by export so rendering is self-contained). */
const dataUrlCache = new Map<string, string>();
export async function srcToDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith('data:')) return src;
  const c = dataUrlCache.get(src);
  if (c) return c;
  const blob = await srcToBlob(src);
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  dataUrlCache.set(src, url);
  return url;
}

export function loadImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = rej;
    img.src = url;
  });
}

export function loadMediaInfo(url: string, kind: 'video' | 'audio'): Promise<{ w: number; h: number; duration: number }> {
  return new Promise((res, rej) => {
    const m = document.createElement(kind);
    m.preload = 'metadata';
    m.crossOrigin = 'anonymous';
    m.onloadedmetadata = () =>
      res({ w: (m as HTMLVideoElement).videoWidth || 0, h: (m as HTMLVideoElement).videoHeight || 0, duration: isFinite(m.duration) ? m.duration : 10 });
    m.onerror = rej;
    m.src = url;
  });
}
