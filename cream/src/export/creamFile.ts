// `.cream` design files: portable JSON with every `asset:` blob embedded as a data URL.

import type { Design } from '../model/types';
import { srcToDataUrl, storeBlob } from '../store/blobs';
import { uid, cloneElements } from '../model/defaults';
import { useApp } from '../store/app';

export interface CreamFile {
  format: 'cream';
  version: 1;
  exportedAt: number;
  design: Design;
  assets: Record<string, string>; // asset:<id> -> data URL
}

function walkStrings(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => walkStrings(x, fn));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) o[k] = walkStrings(x, fn);
    return o;
  }
  return v;
}

export function assetRefs(design: Design): string[] {
  const set = new Set<string>();
  walkStrings(design, (s) => {
    if (s.startsWith('asset:')) set.add(s);
    return s;
  });
  return [...set];
}

export async function packCream(design: Design): Promise<CreamFile> {
  const assets: Record<string, string> = {};
  for (const ref of assetRefs(design)) {
    try {
      assets[ref] = await srcToDataUrl(ref);
    } catch {
      /* missing blob */
    }
  }
  return { format: 'cream', version: 1, exportedAt: Date.now(), design: structuredClone(design), assets };
}

export async function creamBlob(design: Design): Promise<Blob> {
  return new Blob([JSON.stringify(await packCream(design))], { type: 'application/json' });
}

/** Re-create a design (with fresh ids) from parsed `.cream` content or a bare Design JSON. */
export async function importCream(data: CreamFile | Design, opts: { title?: string } = {}): Promise<Design> {
  const file: CreamFile = (data as CreamFile).format === 'cream' ? (data as CreamFile) : { format: 'cream', version: 1, exportedAt: Date.now(), design: data as Design, assets: {} };
  const map = new Map<string, string>();
  for (const [ref, url] of Object.entries(file.assets ?? {})) {
    try {
      const blob = await (await fetch(url)).blob();
      map.set(ref, await storeBlob(blob));
    } catch {
      /* skip */
    }
  }
  const src = walkStrings(file.design, (s) => map.get(s) ?? s) as Design;
  const now = Date.now();
  const d: Design = {
    ...src,
    id: uid(),
    title: opts.title ?? src.title ?? 'Imported design',
    createdAt: now,
    updatedAt: now,
    openedAt: now,
    starred: false,
    folderId: null,
    trashedAt: null,
    comments: [],
    isBrandTemplate: false,
    approval: undefined,
    website: undefined,
    pages: (src.pages ?? []).map((p) => ({ ...p, id: uid(), elements: cloneElements(p.elements ?? []) })),
    audio: (src.audio ?? []).map((a) => ({ ...a, id: uid() })),
  };
  return useApp.getState().addDesign(d);
}

export async function importCreamFile(file: File): Promise<Design> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || (!(data.format === 'cream') && !Array.isArray(data.pages))) throw new Error('Not a Cream design file');
  return importCream(data);
}
