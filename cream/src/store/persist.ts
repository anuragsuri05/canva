import { createStore, del, get, keys, set, getMany } from 'idb-keyval';
import type { Asset, BrandKit, Design, DesignVersion, Folder, Notification, Settings } from '../model/types';

// Two IndexedDB databases: one for JSON documents, one for binary blobs (uploads, cached assets).
const kv = createStore('cream-db', 'kv');
const blobs = createStore('cream-blobs', 'blobs');

export const db = {
  async loadDesigns(): Promise<Design[]> {
    const all = (await keys(kv)).filter((k) => typeof k === 'string' && k.startsWith('d:')) as string[];
    const vals = await getMany<Design>(all, kv);
    return vals.filter(Boolean) as Design[];
  },
  saveDesign: (d: Design) => set('d:' + d.id, d, kv),
  deleteDesign: async (id: string) => {
    await del('d:' + id, kv);
    await del('v:' + id, kv);
  },
  loadFolders: async () => ((await get<Folder[]>('folders', kv)) ?? []) as Folder[],
  saveFolders: (f: Folder[]) => set('folders', f, kv),
  loadAssets: async () => ((await get<Asset[]>('assets', kv)) ?? []) as Asset[],
  saveAssets: (a: Asset[]) => set('assets', a, kv),
  loadBrandKits: async () => ((await get<BrandKit[]>('brandkits', kv)) ?? []) as BrandKit[],
  saveBrandKits: (b: BrandKit[]) => set('brandkits', b, kv),
  loadSettings: () => get<Settings>('settings', kv),
  saveSettings: (s: Settings) => set('settings', s, kv),
  loadNotifications: async () => ((await get<Notification[]>('notifications', kv)) ?? []) as Notification[],
  saveNotifications: (n: Notification[]) => set('notifications', n, kv),
  loadVersions: async (designId: string) => ((await get<DesignVersion[]>('v:' + designId, kv)) ?? []) as DesignVersion[],
  saveVersions: (designId: string, v: DesignVersion[]) => set('v:' + designId, v, kv),
  getMisc: <T>(key: string) => get<T>('m:' + key, kv),
  setMisc: (key: string, v: unknown) => set('m:' + key, v, kv),

  putBlob: (id: string, b: Blob) => set(id, b, blobs),
  getBlob: (id: string) => get<Blob>(id, blobs),
  delBlob: (id: string) => del(id, blobs),
};
