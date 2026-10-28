import { create } from 'zustand';
import type { Asset, AssetKind, BrandKit, Design, DesignVersion, Folder, Notification, Settings } from '../model/types';
import { newDesign, uid, cloneElements } from '../model/defaults';
import { db } from './persist';
import { storeBlob, loadImageSize, loadMediaInfo, resolveSrc } from './blobs';

export type Route =
  | { name: 'home'; section: HomeSection; param?: string }
  | { name: 'editor'; id: string }
  | { name: 'present'; id: string; mode: 'full' | 'presenter' | 'autoplay' | 'record' }
  | { name: 'view'; id: string };

export type HomeSection =
  | 'home'
  | 'projects'
  | 'folder'
  | 'templates'
  | 'brand'
  | 'apps'
  | 'ai'
  | 'dreamlab'
  | 'trash'
  | 'starred'
  | 'shared'
  | 'settings'
  | 'print'
  | 'planner'
  | 'uploads';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  userName: 'You',
  userEmail: 'you@cream.local',
  highContrast: false,
  reduceMotion: false,
  language: 'en',
  plan: 'pro',
  pinnedNav: ['home', 'projects', 'templates', 'brand', 'ai', 'apps', 'dreamlab'],
  editorTabs: ['design', 'elements', 'text', 'brand', 'uploads', 'draw', 'projects', 'apps', 'ai'],
};

export function defaultBrandKit(): BrandKit {
  return {
    id: uid(),
    name: 'Brand Kit',
    logos: [],
    palettes: [{ id: uid(), name: 'Brand colors', colors: ['#0e1318', '#8b3dff', '#00c4cc', '#ffffff'] }],
    fonts: {
      heading: { family: 'Playfair Display', size: 64, weight: 700 },
      subheading: { family: 'Inter', size: 32, weight: 600 },
      body: { family: 'Inter', size: 18, weight: 400 },
      extra: [],
    },
    voice: '',
    photos: [],
    graphics: [],
    icons: [],
    guidelines: '',
    createdAt: Date.now(),
  };
}

interface AppState {
  ready: boolean;
  route: Route;
  designs: Record<string, Design>;
  folders: Folder[];
  assets: Asset[];
  brandKits: BrandKit[];
  settings: Settings;
  notifications: Notification[];
  toasts: { id: string; text: string; kind?: 'info' | 'error' | 'success' }[];

  init(): Promise<void>;
  navigate(r: Route): void;
  toast(text: string, kind?: 'info' | 'error' | 'success'): void;

  createDesign(opts: Parameters<typeof newDesign>[0]): Design;
  addDesign(d: Design): Design;
  saveDesign(d: Design, immediate?: boolean): void;
  patchDesign(id: string, patch: Partial<Design>): void;
  duplicateDesign(id: string): Design | null;
  trashDesign(id: string): void;
  restoreDesign(id: string): void;
  deleteDesignForever(id: string): void;
  emptyTrash(): void;

  createFolder(name: string, parentId?: string | null): Folder;
  patchFolder(id: string, patch: Partial<Folder>): void;
  trashFolder(id: string): void;
  restoreFolder(id: string): void;
  deleteFolderForever(id: string): void;

  addAssetFromFile(file: File, folderId?: string | null): Promise<{ asset: Asset; ref: string }>;
  addAssetFromBlob(blob: Blob, name: string, kind: AssetKind): Promise<{ asset: Asset; ref: string }>;
  patchAsset(id: string, patch: Partial<Asset>): void;
  deleteAssetForever(id: string): void;

  saveBrandKit(k: BrandKit): void;
  addBrandKit(name?: string): BrandKit;
  deleteBrandKit(id: string): void;

  updateSettings(p: Partial<Settings>): void;
  notify(text: string, designId?: string): void;
  markNotificationsRead(): void;

  saveVersion(d: Design, label?: string): Promise<void>;
  listVersions(designId: string): Promise<DesignVersion[]>;
}

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b, c] = h.split('/');
  if (a === 'design' && b) return { name: 'editor', id: b };
  if (a === 'present' && b) return { name: 'present', id: b, mode: (c as any) || 'full' };
  if (a === 'view' && b) return { name: 'view', id: b };
  const sections: HomeSection[] = ['projects', 'folder', 'templates', 'brand', 'apps', 'ai', 'dreamlab', 'trash', 'starred', 'shared', 'settings', 'print', 'planner', 'uploads'];
  if (sections.includes(a as HomeSection)) return { name: 'home', section: a as HomeSection, param: b };
  return { name: 'home', section: 'home' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'editor':
      return '#/design/' + r.id;
    case 'present':
      return `#/present/${r.id}/${r.mode}`;
    case 'view':
      return '#/view/' + r.id;
    default:
      return r.section === 'home' ? '#/' : `#/${r.section}${r.param ? '/' + r.param : ''}`;
  }
}

const saveTimers = new Map<string, number>();

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  route: parseHash(),
  designs: {},
  folders: [],
  assets: [],
  brandKits: [],
  settings: DEFAULT_SETTINGS,
  notifications: [],
  toasts: [],

  async init() {
    const [designs, folders, assets, brandKits, settings, notifications] = await Promise.all([
      db.loadDesigns(),
      db.loadFolders(),
      db.loadAssets(),
      db.loadBrandKits(),
      db.loadSettings(),
      db.loadNotifications(),
    ]);
    const map: Record<string, Design> = {};
    designs.forEach((d) => (map[d.id] = d));
    let kits = brandKits;
    if (!kits.length) {
      kits = [defaultBrandKit()];
      db.saveBrandKits(kits);
    }
    set({ designs: map, folders, assets, brandKits: kits, settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) }, notifications, ready: true });
    window.addEventListener('hashchange', () => set({ route: parseHash() }));
    // Re-register uploaded fonts (FontFace objects don't survive a reload).
    for (const a of assets.filter((x) => x.kind === 'font' && !x.trashedAt && x.fontFamily)) {
      db.getBlob(a.id).then(async (b) => {
        if (!b) return;
        try {
          const face = new FontFace(a.fontFamily!, await b.arrayBuffer());
          await face.load();
          (document.fonts as any).add(face);
        } catch {
          /* ignore broken font files */
        }
      });
    }
  },

  navigate(r) {
    const hash = routeToHash(r);
    if (location.hash !== hash) location.hash = hash;
    set({ route: r });
  },

  toast(text, kind = 'info') {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  },

  createDesign(opts) {
    const d = newDesign(opts);
    return get().addDesign(d);
  },

  addDesign(d) {
    set((s) => ({ designs: { ...s.designs, [d.id]: d } }));
    db.saveDesign(d);
    return d;
  },

  saveDesign(d, immediate) {
    set((s) => ({ designs: { ...s.designs, [d.id]: d } }));
    clearTimeout(saveTimers.get(d.id));
    if (immediate) {
      db.saveDesign(d);
      return;
    }
    // Debounced write per design.
    saveTimers.set(
      d.id,
      window.setTimeout(() => {
        db.saveDesign(get().designs[d.id] ?? d);
      }, 300),
    );
  },

  patchDesign(id, patch) {
    const d = get().designs[id];
    if (!d) return;
    const nd = { ...d, ...patch };
    set((s) => ({ designs: { ...s.designs, [id]: nd } }));
    db.saveDesign(nd);
  },

  duplicateDesign(id) {
    const d = get().designs[id];
    if (!d) return null;
    const now = Date.now();
    const copy: Design = {
      ...structuredClone(d),
      id: uid(),
      title: d.title + ' (copy)',
      createdAt: now,
      updatedAt: now,
      openedAt: now,
      starred: false,
      comments: [],
    };
    copy.pages = copy.pages.map((p) => ({ ...p, id: uid(), elements: cloneElements(p.elements) }));
    return get().addDesign(copy);
  },

  trashDesign(id) {
    get().patchDesign(id, { trashedAt: Date.now() });
  },
  restoreDesign(id) {
    get().patchDesign(id, { trashedAt: null });
  },
  deleteDesignForever(id) {
    set((s) => {
      const { [id]: _, ...rest } = s.designs;
      return { designs: rest };
    });
    db.deleteDesign(id);
  },
  emptyTrash() {
    const s = get();
    Object.values(s.designs)
      .filter((d) => d.trashedAt)
      .forEach((d) => s.deleteDesignForever(d.id));
    s.folders.filter((f) => f.trashedAt).forEach((f) => s.deleteFolderForever(f.id));
    s.assets.filter((a) => a.trashedAt).forEach((a) => s.deleteAssetForever(a.id));
  },

  createFolder(name, parentId = null) {
    const f: Folder = { id: uid(), name, parentId, createdAt: Date.now(), starred: false, trashedAt: null };
    const folders = [...get().folders, f];
    set({ folders });
    db.saveFolders(folders);
    return f;
  },
  patchFolder(id, patch) {
    const folders = get().folders.map((f) => (f.id === id ? { ...f, ...patch } : f));
    set({ folders });
    db.saveFolders(folders);
  },
  trashFolder(id) {
    get().patchFolder(id, { trashedAt: Date.now() });
  },
  restoreFolder(id) {
    get().patchFolder(id, { trashedAt: null });
  },
  deleteFolderForever(id) {
    const s = get();
    // Move contents of a deleted folder to root rather than destroying designs silently.
    Object.values(s.designs)
      .filter((d) => d.folderId === id)
      .forEach((d) => s.patchDesign(d.id, { folderId: null }));
    const folders = s.folders.filter((f) => f.id !== id).map((f) => (f.parentId === id ? { ...f, parentId: null } : f));
    set({ folders });
    db.saveFolders(folders);
  },

  async addAssetFromFile(file, folderId = null) {
    const kind: AssetKind = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : /\.(ttf|otf|woff2?)$/i.test(file.name)
            ? 'font'
            : 'image';
    const res = await get().addAssetFromBlob(file, file.name, kind);
    if (folderId) get().patchAsset(res.asset.id, { folderId });
    return res;
  },

  async addAssetFromBlob(blob, name, kind) {
    const id = uid();
    const ref = await storeBlob(blob, id);
    const asset: Asset = { id, kind, name, mime: blob.type, size: blob.size, createdAt: Date.now(), trashedAt: null };
    const url = await resolveSrc(ref);
    try {
      if (kind === 'image') {
        const s = await loadImageSize(url);
        asset.width = s.w;
        asset.height = s.h;
      } else if (kind === 'video' || kind === 'audio') {
        const m = await loadMediaInfo(url, kind);
        asset.width = m.w;
        asset.height = m.h;
        asset.duration = m.duration;
      } else if (kind === 'font') {
        const family = name.replace(/\.(ttf|otf|woff2?)$/i, '');
        const face = new FontFace(family, await blob.arrayBuffer());
        await face.load();
        (document.fonts as any).add(face);
        asset.fontFamily = family;
      }
    } catch {
      /* metadata is best-effort */
    }
    const assets = [asset, ...get().assets];
    set({ assets });
    db.saveAssets(assets);
    return { asset, ref };
  },

  patchAsset(id, patch) {
    const assets = get().assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
    set({ assets });
    db.saveAssets(assets);
  },
  deleteAssetForever(id) {
    const assets = get().assets.filter((a) => a.id !== id);
    set({ assets });
    db.saveAssets(assets);
    db.delBlob(id);
  },

  saveBrandKit(k) {
    const brandKits = get().brandKits.map((b) => (b.id === k.id ? k : b));
    set({ brandKits });
    db.saveBrandKits(brandKits);
  },
  addBrandKit(name = 'New Brand Kit') {
    const k = { ...defaultBrandKit(), name };
    const brandKits = [...get().brandKits, k];
    set({ brandKits });
    db.saveBrandKits(brandKits);
    return k;
  },
  deleteBrandKit(id) {
    const brandKits = get().brandKits.filter((b) => b.id !== id);
    set({ brandKits });
    db.saveBrandKits(brandKits);
  },

  updateSettings(p) {
    const settings = { ...get().settings, ...p };
    set({ settings });
    db.saveSettings(settings);
  },

  notify(text, designId) {
    const n: Notification = { id: uid(), text, createdAt: Date.now(), read: false, designId };
    const notifications = [n, ...get().notifications].slice(0, 100);
    set({ notifications });
    db.saveNotifications(notifications);
  },
  markNotificationsRead() {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications });
    db.saveNotifications(notifications);
  },

  async saveVersion(d, label) {
    const versions = await db.loadVersions(d.id);
    const last = versions[0];
    // Skip identical autosaves.
    if (!label && last && last.snapshot.updatedAt === d.updatedAt) return;
    versions.unshift({ id: uid(), designId: d.id, createdAt: Date.now(), label, snapshot: structuredClone(d) });
    await db.saveVersions(d.id, versions.slice(0, 1000));
  },
  listVersions: (designId) => db.loadVersions(designId),
}));

export const activeDesigns = (s: AppState) => Object.values(s.designs).filter((d) => !d.trashedAt);
