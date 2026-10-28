// Shared home-screen actions: creating/opening designs, importing files, editor hand-off.
import { useApp } from '../store/app';
import { useEditor, type Modal, type SidePanel } from '../store/editor';
import type { Design } from '../model/types';
import { makeImage, newPage, uid, cloneElements } from '../model/defaults';
import { CUSTOM_MAX_PX, CUSTOM_MIN_PX, presetById } from '../model/presets';

const app = () => useApp.getState();

/** Navigate to the editor and optionally open a modal / side panel once it has loaded. */
export function openDesign(id: string, opts: { modal?: Modal; side?: SidePanel; newTab?: boolean } = {}) {
  if (opts.newTab) {
    window.open(location.pathname + '#/design/' + id, '_blank');
    return;
  }
  app().navigate({ name: 'editor', id });
  if (opts.modal || opts.side) {
    const apply = () => {
      const s = useEditor.getState();
      if (s.design?.id === id) {
        useEditor.setState({ ...(opts.modal ? { modal: opts.modal } : {}), ...(opts.side ? { side: opts.side } : {}) });
        return true;
      }
      return false;
    };
    if (!apply()) {
      const unsub = useEditor.subscribe(() => {
        if (apply()) unsub();
      });
      setTimeout(unsub, 8000);
    }
  }
}

export function createFromPreset(presetId: string, opts: { folderId?: string | null; open?: boolean } = {}) {
  const d = app().createDesign({ preset: presetId, folderId: opts.folderId ?? null });
  if (opts.open !== false) openDesign(d.id);
  return d;
}

export function createCustom(width: number, height: number, unit: Design['unit'] = 'px', folderId: string | null = null) {
  const d = app().createDesign({ width: Math.round(width), height: Math.round(height), unit, category: 'custom', title: 'Untitled design', folderId });
  rememberCustomSize(Math.round(width), Math.round(height), unit);
  openDesign(d.id);
  return d;
}

export function rememberCustomSize(w: number, h: number, unit: string) {
  try {
    const list = JSON.parse(localStorage.getItem('cream-custom-sizes') || '[]') as { w: number; h: number; unit: string }[];
    const next = [{ w, h, unit }, ...list.filter((x) => !(x.w === w && x.h === h))].slice(0, 5);
    localStorage.setItem('cream-custom-sizes', JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
export function recentCustomSizes(): { w: number; h: number; unit: string }[] {
  try {
    return JSON.parse(localStorage.getItem('cream-custom-sizes') || '[]');
  } catch {
    return [];
  }
}

/** Pick files with a transient <input type=file>. */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}

const clampPx = (v: number) => Math.max(CUSTOM_MIN_PX, Math.min(CUSTOM_MAX_PX, Math.round(v)));

/** "Edit photo": new design sized to the image, with the image filling the page. */
export async function designFromImageFile(file: File, open = true): Promise<Design | null> {
  const { asset, ref } = await app().addAssetFromFile(file);
  let w = asset.width ?? 1080;
  let h = asset.height ?? 1080;
  const k = Math.min(1, CUSTOM_MAX_PX / Math.max(w, h));
  w = clampPx(w * k);
  h = clampPx(h * k);
  const img = makeImage(ref, asset.width ?? w, asset.height ?? h, 0, 0, w, { name: file.name });
  img.h = h;
  const d = app().createDesign({
    title: file.name.replace(/\.[^.]+$/, ''),
    width: w,
    height: h,
    category: 'custom',
    pages: [newPage({ elements: [img] })],
  });
  if (open) openDesign(d.id);
  return d;
}

/** Import a .cream / JSON design export. Accepts a Design, {design}, or {designs:[...]}. */
export async function importCreamFile(file: File): Promise<Design[]> {
  const json = JSON.parse(await file.text());
  const list: any[] = Array.isArray(json?.designs) ? json.designs : json?.design ? [json.design] : json?.pages ? [json] : [];
  const out: Design[] = [];
  for (const raw of list) {
    if (!raw || !Array.isArray(raw.pages)) continue;
    const now = Date.now();
    const d: Design = {
      ...raw,
      id: uid(),
      title: raw.title || file.name.replace(/\.[^.]+$/, ''),
      createdAt: now,
      updatedAt: now,
      openedAt: now,
      trashedAt: null,
      folderId: null,
      starred: false,
      audio: raw.audio ?? [],
      comments: raw.comments ?? [],
      pages: raw.pages.map((p: any) => ({ ...p, id: uid(), elements: cloneElements(p.elements ?? []) })),
    };
    out.push(app().addDesign(d));
  }
  return out;
}

/** "Import file": images become designs, .cream/.json are imported, videos/audio go to uploads. */
export async function importFiles(files: File[]) {
  let opened = false;
  for (const f of files) {
    try {
      if (/\.(cream|json)$/i.test(f.name)) {
        const ds = await importCreamFile(f);
        if (!ds.length) app().toast(`"${f.name}" isn't a Cream design`, 'error');
        else {
          app().toast(`Imported ${ds.length} design${ds.length > 1 ? 's' : ''}`, 'success');
          if (files.length === 1 && ds.length === 1) {
            openDesign(ds[0].id);
            opened = true;
          }
        }
      } else if (f.type.startsWith('image/')) {
        const d = await designFromImageFile(f, files.length === 1);
        if (d && files.length === 1) opened = true;
      } else if (/^(video|audio)\//.test(f.type) || /\.(ttf|otf|woff2?)$/i.test(f.name)) {
        await app().addAssetFromFile(f);
        app().toast(`Uploaded "${f.name}"`, 'success');
      } else {
        app().toast(`Can't import "${f.name}" yet — try images or .cream files`, 'error');
      }
    } catch (e) {
      app().toast(`Couldn't import "${f.name}"`, 'error');
    }
  }
  return opened;
}

export const isPresetId = (id: string) => !!presetById(id);

/** Last activity timestamp for sorting. */
export const lastActivity = (d: Design) => Math.max(d.updatedAt ?? 0, d.openedAt ?? 0);

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function fmtBytes(n: number) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${u[i]}`;
}
