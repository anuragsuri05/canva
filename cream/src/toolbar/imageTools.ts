// Image helpers used by the toolbar + ImageEditPanel: magic tool bridge, replace, crop maths.
import type { Draft } from 'immer';
import type { El, ImageEl, VideoEl } from '../model/types';
import { findEl, useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { srcToBlob, storeBlob, loadImageSize, resolveSrc } from '../store/blobs';
import { makeText } from '../model/defaults';

// The AI agent owns src/ai/magicTools.ts; glob keeps compilation working whether or not it exists yet.
const magicGlob = import.meta.glob('../ai/magicTools.ts');

export async function loadMagic(): Promise<Record<string, any> | null> {
  const f = magicGlob['../ai/magicTools.ts'];
  if (!f) return null;
  try {
    return (await f()) as Record<string, any>;
  } catch {
    return null;
  }
}

const getImg = (id: string): ImageEl | null => {
  const s = useEditor.getState();
  const f = s.design && findEl(s.design, id);
  return f && f.el.type === 'image' ? (f.el as ImageEl) : null;
};

/** Normalise whatever a magic tool returns (src string, Blob, {src}) into a stored src. */
async function toSrc(res: unknown): Promise<string | null> {
  if (!res) return null;
  if (typeof res === 'string') return res;
  if (res instanceof Blob) return storeBlob(res);
  if (typeof res === 'object' && res && 'src' in (res as any)) return toSrc((res as any).src);
  if (typeof res === 'object' && res && 'blob' in (res as any)) return toSrc((res as any).blob);
  return null;
}

const busy = new Set<string>();
export const isBusy = (key: string) => busy.has(key);

async function setImageSrc(id: string, src: string, patch: Partial<ImageEl> = {}) {
  const el = getImg(id);
  if (!el) return;
  let size = { w: el.naturalW, h: el.naturalH };
  try {
    size = await loadImageSize(await resolveSrc(src));
  } catch {
    /* keep */
  }
  useEditor.getState().updateEl(id, (e) => {
    const im = e as Draft<ImageEl>;
    if (!im.originalSrc) im.originalSrc = im.src;
    im.src = src;
    im.naturalW = size.w;
    im.naturalH = size.h;
    Object.assign(im, patch);
  });
}

/** Background Remover: magicTools.removeBackground if present, else @imgly/background-removal in-browser. */
export async function removeBackground(id: string): Promise<void> {
  const el = getImg(id);
  if (!el) return;
  const toast = useApp.getState().toast;
  if (el.bgRemoved && el.originalSrc) {
    useEditor.getState().updateEl(id, (e) => {
      const im = e as Draft<ImageEl>;
      im.src = im.originalSrc!;
      im.bgRemoved = false;
    });
    toast('Background restored');
    return;
  }
  if (busy.has('bg-' + id)) return;
  busy.add('bg-' + id);
  toast('Removing background…');
  try {
    const mod = await loadMagic();
    let src: string | null = null;
    if (mod && typeof mod.removeBackground === 'function') {
      src = await toSrc(await mod.removeBackground(el.src));
    } else {
      const lib: any = await import('@imgly/background-removal');
      const fn = lib.removeBackground ?? lib.default;
      const blob = await srcToBlob(el.src);
      const out: Blob = await fn(blob);
      src = await storeBlob(out);
    }
    if (!src) throw new Error('No result');
    await setImageSrc(id, src, { bgRemoved: true });
    toast('Background removed', 'success');
  } catch (e) {
    console.warn(e);
    toast('Background removal failed — the image may block cross-origin access', 'error');
  } finally {
    busy.delete('bg-' + id);
  }
}

const LABELS: Record<string, string> = {
  magicErase: 'Magic Eraser',
  magicEdit: 'Magic Edit',
  magicExpand: 'Magic Expand',
  magicGrab: 'Magic Grab',
  upscale: 'Upscale',
};

/** Bridge for Magic Eraser / Edit / Expand / Grab / Upscale (src/ai/magicTools.ts). */
export async function runMagic(tool: 'magicErase' | 'magicEdit' | 'magicExpand' | 'magicGrab' | 'upscale', id: string, opts: Record<string, any> = {}) {
  const el = getImg(id);
  if (!el) return;
  const toast = useApp.getState().toast;
  const mod = await loadMagic();
  const fn = mod?.[tool];
  if (typeof fn !== 'function') {
    toast(`${LABELS[tool]} isn't available yet`, 'error');
    return;
  }
  if (busy.has(tool + id)) return;
  busy.add(tool + id);
  toast(`${LABELS[tool]}…`);
  try {
    if (tool === 'magicErase') {
      if (!opts.mask) throw new Error('Paint over the area to erase first');
      const src = await toSrc(await fn(el.src, opts.mask));
      if (src) await setImageSrc(id, src);
    } else if (tool === 'magicExpand') {
      const d = useEditor.getState().design!;
      const nw = el.naturalW;
      const nh = el.naturalH;
      const cur = nw / nh;
      const ratio: number | null =
        opts.ratio === 'page' ? d.width / d.height : opts.ratio === 'free' ? null : (() => { const [a, b] = String(opts.ratio).split(':').map(Number); return a / b; })();
      let tw = nw * 1.3;
      let th = nh * 1.3;
      if (ratio) {
        if (ratio > cur) { tw = nh * ratio; th = nh; } else { tw = nw; th = nw / ratio; }
        if (Math.abs(ratio - cur) < 0.01) { tw = nw * 1.25; th = nh * 1.25; }
      }
      const res = await fn(el.src, { targetW: Math.round(tw), targetH: Math.round(th), generate: !!opts.generate, prompt: opts.prompt });
      const ref = res?.ref ?? (await toSrc(res));
      if (ref) {
        const w = res?.w ?? tw;
        const h = res?.h ?? th;
        useEditor.getState().updateEl(id, (e) => {
          const im = e as Draft<ImageEl>;
          if (!im.originalSrc) im.originalSrc = im.src;
          const sx = im.w / (im.crop ? im.crop.w * im.naturalW : im.naturalW);
          const cx = im.x + im.w / 2;
          const cy = im.y + im.h / 2;
          im.src = ref;
          im.naturalW = w;
          im.naturalH = h;
          im.crop = undefined;
          if (opts.ratio === 'page') Object.assign(im, { x: 0, y: 0, w: d.width, h: d.height, rotation: 0 });
          else {
            im.w = w * sx;
            im.h = h * sx;
            im.x = cx - im.w / 2;
            im.y = cy - im.h / 2;
          }
        });
      }
    } else if (tool === 'magicGrab') {
      const res = await fn(el.src);
      if (res?.ref) {
        const sx = el.w / res.naturalW;
        const sy = el.h / res.naturalH;
        await setImageSrc(id, res.backgroundRef);
        const { makeImage } = await import('../model/defaults');
        const sub = makeImage(res.ref, res.w, res.h, el.x + res.x * sx, el.y + res.y * sy, res.w * sx);
        useEditor.getState().addElements([sub]);
      }
    } else if (tool === 'upscale') {
      const src = await toSrc(await fn(el.src, opts.factor ?? 2));
      if (src) await setImageSrc(id, src);
    } else {
      const src = await toSrc(await fn(el.src, opts));
      if (src) await setImageSrc(id, src);
    }
    toast(`${LABELS[tool]} done`, 'success');
  } catch (e) {
    console.warn(e);
    toast(`${LABELS[tool]} failed${e instanceof Error && e.message ? ': ' + e.message : ''}`, 'error');
  } finally {
    busy.delete(tool + id);
  }
}

/** Grab Text: OCR the image (magicTools.grabText or tesseract.js) and add editable text. */
export async function grabText(id: string) {
  const el = getImg(id);
  if (!el) return;
  const toast = useApp.getState().toast;
  toast('Grabbing text…');
  try {
    const mod = await loadMagic();
    let text = '';
    if (mod && typeof mod.grabText === 'function') {
      const r = await mod.grabText(el.src);
      text = typeof r === 'string' ? r : r?.text ?? '';
      // Canva removes the grabbed text from the photo
      if (r?.boxes?.length && typeof mod.eraseBoxes === 'function') {
        const cleaned = await toSrc(await mod.eraseBoxes(el.src, r.boxes));
        if (cleaned) await setImageSrc(id, cleaned);
      }
    } else {
      const T: any = await import('tesseract.js');
      const url = await resolveSrc(el.src);
      const r = await (T.recognize ?? T.default.recognize)(url, 'eng');
      text = r?.data?.text ?? '';
    }
    text = text.trim();
    if (!text) return toast('No text found in this image');
    const t = makeText(text, el.x, el.y + el.h + 16, Math.max(200, el.w), { fontSize: 24 });
    useEditor.getState().addElements([t]);
    toast('Text grabbed — it is now editable', 'success');
  } catch (e) {
    console.warn(e);
    toast('Grab Text failed', 'error');
  }
}

/** Replace the image (or video) source with a file picked by the user. */
export function replaceFromFile(id: string) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*,video/*';
  inp.onchange = async () => {
    const file = inp.files?.[0];
    if (!file) return;
    const { ref } = await useApp.getState().addAssetFromFile(file);
    const s = useEditor.getState();
    const f = s.design && findEl(s.design, id);
    if (!f) return;
    if (f.el.type === 'image') await setImageSrc(id, ref, { crop: undefined, bgRemoved: false, originalSrc: undefined });
    else if (f.el.type === 'frame' || f.el.type === 'grid') {
      const size = await loadImageSize(await resolveSrc(ref)).catch(() => ({ w: 1000, h: 1000 }));
      const { fillFrame } = await import('../editor/dnd');
      fillFrame(id, { src: ref, kind: file.type.startsWith('video') ? 'video' : 'image', w: size.w, h: size.h });
    }
  };
  inp.click();
}

/* ---------- Crop maths ---------- */

type Croppable = Pick<ImageEl | VideoEl, 'w' | 'h' | 'naturalW' | 'naturalH' | 'crop'>;

/** Largest crop rect (fractions) with aspect `a` (w/h in element px) for an image of ratio r. */
export function baseCrop(a: number, r: number) {
  return a >= r ? { w: 1, h: r / a } : { w: a / r, h: 1 };
}

export function currentZoom(el: Croppable) {
  const c = el.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const b = baseCrop(el.w / el.h, el.naturalW / Math.max(1, el.naturalH));
  return Math.max(1, b.w / c.w);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function centred(cx: number, cy: number, w: number, h: number) {
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

export function applyZoom(e: Draft<El>, z: number) {
  if (e.type !== 'image' && e.type !== 'video') return;
  const c = e.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const b = baseCrop(e.w / e.h, e.naturalW / Math.max(1, e.naturalH));
  e.crop = centred(c.x + c.w / 2, c.y + c.h / 2, b.w / z, b.h / z);
}

/** Change the element's aspect ratio (keeping width) and crop the media to fill it. */
export function applyAspect(e: Draft<El>, aspect: number | null) {
  if (e.type !== 'image' && e.type !== 'video') return;
  const r = e.naturalW / Math.max(1, e.naturalH);
  if (aspect == null) {
    e.crop = undefined;
    e.h = e.w / r;
    return;
  }
  const c = e.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const cy0 = e.y + e.h / 2;
  e.h = e.w / aspect;
  e.y = cy0 - e.h / 2;
  const b = baseCrop(aspect, r);
  e.crop = centred(c.x + c.w / 2, c.y + c.h / 2, b.w, b.h);
}

export const ASPECTS: { label: string; value: number | null }[] = [
  { label: 'Original', value: null },
  { label: '1:1 Square', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '4:5', value: 4 / 5 },
  { label: '2:3', value: 2 / 3 },
];
