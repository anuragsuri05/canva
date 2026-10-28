// Magic Studio image tools. All keyless / open-source, running in the browser:
// - Background removal: @imgly/background-removal (ONNX model, lazily downloaded)
// - OCR: tesseract.js
// - Generation: Pollinations (free, keyless) with an optional OpenAI fallback when a key is set
// - Erase / Expand / Upscale: canvas algorithms (push-pull inpainting, mirrored blur outpainting, resample + unsharp mask)
// Other modules import this file dynamically: keep the exported names stable.
import { useApp } from '../store/app';
import { srcToBlob } from '../store/blobs';
import { getAI } from './config';

/* ------------------------------------------------------------------ helpers */

async function loadBitmap(src: string): Promise<ImageBitmap> {
  const blob = await srcToBlob(src);
  return createImageBitmap(blob);
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function toBlob(c: HTMLCanvasElement, type = 'image/png', q = 0.92): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), type, q));
}

async function store(blob: Blob, name: string): Promise<string> {
  const { ref } = await useApp.getState().addAssetFromBlob(blob, name, 'image');
  return ref;
}

async function maskToCanvas(mask: HTMLCanvasElement | string, w: number, h: number): Promise<HTMLCanvasElement> {
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  if (typeof mask === 'string') {
    const bmp = await createImageBitmap(await (await fetch(mask)).blob());
    ctx.drawImage(bmp, 0, 0, w, h);
  } else ctx.drawImage(mask, 0, 0, w, h);
  return c;
}

/* ------------------------------------------------------------------ Pollinations */

export interface GenOpts {
  width?: number;
  height?: number;
  style?: string; // style id from IMAGE_STYLES or free text
  seed?: number;
  model?: string;
  store?: boolean; // default true: store as an asset so it's exportable
  signal?: AbortSignal;
  onStatus?: (s: string) => void;
}

export const IMAGE_STYLES: { id: string; label: string; prompt: string; swatch: string }[] = [
  { id: 'none', label: 'No style', prompt: '', swatch: 'linear-gradient(135deg,#ddd,#bbb)' },
  { id: 'photo', label: 'Photo', prompt: 'professional photography, natural light, 50mm lens, highly detailed, photorealistic', swatch: 'linear-gradient(135deg,#6b8caf,#c9a27e)' },
  { id: 'cinematic', label: 'Filmic', prompt: 'cinematic film still, anamorphic, dramatic lighting, film grain, color graded', swatch: 'linear-gradient(135deg,#1d3a4a,#e38b3c)' },
  { id: 'illustration', label: 'Illustration', prompt: 'flat vector illustration, clean shapes, bold colors, modern editorial illustration', swatch: 'linear-gradient(135deg,#ff9a76,#6c5ce7)' },
  { id: '3d', label: '3D', prompt: '3D render, octane render, soft studio lighting, clay material, cute, high detail', swatch: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'watercolor painting, soft washes, paper texture, delicate brush strokes', swatch: 'linear-gradient(135deg,#f6d5f7,#fbe9d7)' },
  { id: 'neon', label: 'Neon', prompt: 'neon glow, synthwave, vibrant magenta and cyan lights, dark background', swatch: 'linear-gradient(135deg,#ff00cc,#333399)' },
  { id: 'retro', label: 'Retrowave', prompt: 'retro 80s aesthetic, retrowave, sunset grid, vintage poster', swatch: 'linear-gradient(135deg,#f857a6,#ff5858)' },
  { id: 'anime', label: 'Anime', prompt: 'anime style, studio ghibli inspired, cel shading, vibrant', swatch: 'linear-gradient(135deg,#84fab0,#8fd3f4)' },
  { id: 'minimal', label: 'Minimalist', prompt: 'minimalist, simple composition, negative space, muted palette', swatch: 'linear-gradient(135deg,#f5f5f5,#d6d6d6)' },
  { id: 'pencil', label: 'Color pencil', prompt: 'colored pencil drawing, hand drawn, textured paper', swatch: 'linear-gradient(135deg,#fddb92,#d1fdff)' },
  { id: 'oil', label: 'Oil painting', prompt: 'oil painting, impasto, rich textures, classical fine art', swatch: 'linear-gradient(135deg,#8e5e2d,#e0c38c)' },
  { id: 'pixel', label: 'Pixel art', prompt: 'pixel art, 16-bit, retro video game', swatch: 'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { id: 'papercut', label: 'Paper cut', prompt: 'layered paper cut art, papercraft, depth, soft shadows', swatch: 'linear-gradient(135deg,#fbc2eb,#a6c1ee)' },
  { id: 'isometric', label: 'Isometric', prompt: 'isometric 3D illustration, clean, low poly', swatch: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { id: 'line', label: 'Line art', prompt: 'minimal black line art, single line drawing, white background', swatch: 'linear-gradient(135deg,#fff,#999)' },
  { id: 'popart', label: 'Pop art', prompt: 'pop art, halftone dots, comic style, bold outlines', swatch: 'linear-gradient(135deg,#f7ff00,#db36a4)' },
  { id: 'dreamy', label: 'Dreamy', prompt: 'dreamy, ethereal, pastel colors, soft focus, magical atmosphere', swatch: 'linear-gradient(135deg,#e0c3fc,#8ec5fc)' },
  { id: 'sticker', label: 'Sticker', prompt: 'die-cut sticker, white border, vector, isolated on plain background', swatch: 'linear-gradient(135deg,#ffecd2,#fcb69f)' },
];

export function stylePrompt(prompt: string, style?: string) {
  const st = IMAGE_STYLES.find((s) => s.id === style);
  const suffix = st ? st.prompt : style ?? '';
  return suffix ? `${prompt}, ${suffix}` : prompt;
}

export function pollinationsUrl(prompt: string, o: { width?: number; height?: number; seed?: number; model?: string } = {}) {
  const q = new URLSearchParams({
    width: String(Math.round(o.width ?? 1024)),
    height: String(Math.round(o.height ?? 1024)),
    seed: String(o.seed ?? Math.floor(Math.random() * 1e6)),
    nologo: 'true',
  });
  if (o.model) q.set('model', o.model);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 900))}?${q}`;
}

export type ImageEngine = 'pollinations' | 'pollinations-key' | 'openai' | 'gemini' | 'horde';
export interface GenResultBlob {
  blob: Blob;
  seed: number;
  source: ImageEngine;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    if (signal?.aborted) return rej(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(res, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('Aborted', 'AbortError'));
    });
  });

class EngineUnavailable extends Error {}

// Pollinations' keyless endpoint now asks browsers (and localhost origins) for a Turnstile token or
// payment. Remember that for the session so we go straight to the next engine.
let legacyBlocked = false;
let queue: Promise<unknown> = Promise.resolve();

async function pollinationsLegacy(prompt: string, w: number, h: number, seed: number, o: GenOpts): Promise<Blob> {
  const url = pollinationsUrl(prompt, { width: w, height: h, seed, model: o.model });
  const waits = [4000, 8000];
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { signal: o.signal, referrerPolicy: 'no-referrer' });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new EngineUnavailable('network');
    }
    if (res.ok) {
      const b = await res.blob();
      if (b.type.startsWith('image/') && b.size > 500) return b;
      throw new EngineUnavailable('empty');
    }
    if (res.status === 403 || res.status === 401) {
      legacyBlocked = true;
      throw new EngineUnavailable('blocked');
    }
    if ((res.status === 402 || res.status === 429 || res.status >= 500) && attempt < waits.length) {
      o.onStatus?.(`Free image service is busy — retrying in ${waits[attempt] / 1000}s…`);
      await sleep(waits[attempt], o.signal);
      continue;
    }
    if (res.status === 402) legacyBlocked = true;
    throw new EngineUnavailable(String(res.status));
  }
}

async function pollinationsKeyed(key: string, prompt: string, w: number, h: number, seed: number, o: GenOpts): Promise<Blob> {
  const q = new URLSearchParams({ width: String(w), height: String(h), seed: String(seed), nologo: 'true', model: o.model ?? 'flux' });
  const res = await fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt.slice(0, 900))}?${q}`, { headers: { authorization: `Bearer ${key}` }, signal: o.signal });
  if (!res.ok) {
    let msg = '';
    try {
      msg = (await res.json())?.error ?? '';
    } catch {
      /* ignore */
    }
    throw new Error(res.status === 401 || res.status === 403 ? 'Pollinations rejected your key — check it in AI settings.' : res.status === 402 ? 'Your Pollinations balance is used up for now.' : `Pollinations error ${res.status} ${msg}`);
  }
  return res.blob();
}

async function geminiImage(key: string, prompt: string, w: number, h: number, signal?: AbortSignal): Promise<Blob> {
  const ratio = w / h > 1.4 ? '16:9' : w / h < 0.72 ? '9:16' : w / h > 1.1 ? '4:3' : w / h < 0.9 ? '3:4' : '1:1';
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Generate an image (aspect ratio ${ratio}): ${prompt}` }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
    signal,
  });
  if (!res.ok) throw new Error(`Gemini image error ${res.status}`);
  const j = await res.json();
  const part = (j.candidates?.[0]?.content?.parts ?? []).find((p: any) => p.inlineData?.data);
  if (!part) throw new Error('Gemini returned no image');
  const bin = atob(part.inlineData.data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: part.inlineData.mimeType || 'image/png' });
}

/** AI Horde: free, crowd-sourced, open-model generation. Anonymous requests can wait several minutes. */
async function horde(prompt: string, n: number, w: number, h: number, o: GenOpts, onEach: (i: number, b: Blob, seed: number) => void) {
  const k = Math.min(1, 640 / Math.max(w, h));
  const W = Math.max(256, Math.round((w * k) / 64) * 64);
  const H = Math.max(256, Math.round((h * k) / 64) * 64);
  const headers = { 'content-type': 'application/json', apikey: '0000000000', 'Client-Agent': 'cream:1.0:local' };
  const res = await fetch('https://aihorde.net/api/v2/generate/async', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: `${prompt} ### lowres, blurry, watermark, text, nsfw`,
      params: { width: W, height: H, steps: 22, n, sampler_name: 'k_euler_a', cfg_scale: 7 },
      nsfw: false,
      censor_nsfw: true,
      r2: false,
      shared: false,
      models: ['AbsoluteReality', 'Deliberate', 'stable_diffusion', "ICBINP - I Can't Believe It's Not Photography", 'Dreamshaper'],
    }),
    signal: o.signal,
  });
  if (!res.ok) throw new Error(`Community image queue error ${res.status}`);
  const { id } = await res.json();
  const cancel = () => fetch(`https://aihorde.net/api/v2/generate/status/${id}`, { method: 'DELETE', headers }).catch(() => undefined);
  o.signal?.addEventListener('abort', cancel);
  try {
    for (;;) {
      await sleep(5000, o.signal);
      const c = await (await fetch(`https://aihorde.net/api/v2/generate/check/${id}`, { signal: o.signal })).json();
      if (c.faulted || c.is_possible === false) throw new Error('The free community image queue could not run this request.');
      if (c.done) break;
      const mins = Math.max(1, Math.round((c.wait_time ?? 60) / 60));
      o.onStatus?.(c.processing ? 'Painting…' : `Free community queue · position ${c.queue_position ?? '?'} · ~${mins} min`);
    }
    const st = await (await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, { signal: o.signal })).json();
    const gens: { img: string; seed: string }[] = st.generations ?? [];
    if (!gens.length) throw new Error('The community queue returned no images.');
    gens.forEach((g, i) => {
      const src = g.img.startsWith('http') ? g.img : `data:image/webp;base64,${g.img}`;
      fetch(src)
        .then((r) => r.blob())
        .then((b) => onEach(i, b, Number(g.seed) || i));
    });
    await sleep(300);
  } finally {
    o.signal?.removeEventListener('abort', cancel);
  }
}

export function pollinationsKey(): string {
  try {
    return (localStorage.getItem('cream-pollinations-key') || sessionStorage.getItem('cream-pollinations-key') || '').trim();
  } catch {
    return '';
  }
}

/** Which engine will be used next (for UI hints). */
export function imageEngine(): ImageEngine {
  if (pollinationsKey()) return 'pollinations-key';
  if (!legacyBlocked) return 'pollinations';
  const k = getAI().keys;
  if (k.openai) return 'openai';
  if (k.gemini) return 'gemini';
  return 'horde';
}

export const ENGINE_LABEL: Record<ImageEngine, string> = {
  pollinations: 'Pollinations (free)',
  'pollinations-key': 'Pollinations (your key)',
  openai: 'OpenAI (your key)',
  gemini: 'Gemini (your key)',
  horde: 'AI Horde community queue (free, slow)',
};

/**
 * Generate `n` images for one prompt, calling onEach as each arrives. Engines, in order:
 * Pollinations with your key → keyless Pollinations → your OpenAI / Gemini key → AI Horde (free community queue).
 */
export async function generateImageSet(
  prompt: string,
  n: number,
  o: GenOpts,
  onEach: (i: number, r: GenResultBlob) => void,
  onError?: (i: number, msg: string) => void,
): Promise<number> {
  const full = stylePrompt(prompt, o.style);
  const w = Math.round(o.width ?? 1024);
  const h = Math.round(o.height ?? 1024);
  const base = o.seed ?? Math.floor(Math.random() * 1e6);
  let ok = 0;
  let next = 0;
  let lastErr = '';
  const run = async () => {
    const pk = pollinationsKey();
    const keys = getAI().keys;
    const perImage = async (fn: (seed: number) => Promise<Blob>, source: ImageEngine) => {
      for (; next < n; next++) {
        const i = next;
        if (o.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const seed = base + i * 97;
        try {
          onEach(i, { blob: await fn(seed), seed, source });
          ok++;
        } catch (e) {
          if ((e as Error).name === 'AbortError') throw e;
          if (e instanceof EngineUnavailable) throw e;
          lastErr = (e as Error).message;
          onError?.(i, lastErr);
        }
      }
    };
    if (pk) return perImage((seed) => pollinationsKeyed(pk, full, w, h, seed, o), 'pollinations-key');
    if (!legacyBlocked) {
      try {
        return await perImage((seed) => pollinationsLegacy(full, w, h, seed, o), 'pollinations');
      } catch (e) {
        if (!(e instanceof EngineUnavailable)) throw e;
        if (next >= n) return;
        o.onStatus?.('Free Pollinations endpoint unavailable in this browser — switching engine…');
      }
    }
    const remaining = n - next;
    const start = next;
    if (keys.openai) {
      const { openaiImage } = await import('./providers');
      return perImage(async () => openaiImage(full, { width: w, height: h }, o.signal), 'openai');
    }
    if (keys.gemini) return perImage(async () => geminiImage(keys.gemini!, full, w, h, o.signal), 'gemini');
    o.onStatus?.('Joining the free community queue (AI Horde)…');
    await horde(full, remaining, w, h, o, (i, blob, seed) => {
      onEach(start + i, { blob, seed, source: 'horde' });
    });
    ok += remaining;
    next = n;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  await p;
  if (!ok && lastErr) throw new Error(lastErr);
  return ok;
}

/** Generate one image blob. */
export async function generateImageBlob(prompt: string, o: GenOpts = {}): Promise<GenResultBlob> {
  let out: GenResultBlob | null = null;
  let err = '';
  await generateImageSet(prompt, 1, o, (_i, r) => (out = r), (_i, m) => (err = m));
  if (!out) throw new Error(err || 'Image generation failed');
  return out;
}

/** Keyless text-to-image. Stores the result as an asset (unless store:false) so it exports offline. */
export async function generateImage(prompt: string, o: GenOpts = {}): Promise<{ url: string; ref?: string; blob: Blob; w: number; h: number; seed: number }> {
  const { blob, seed } = await generateImageBlob(prompt, o);
  return finishBlob(blob, seed, prompt, o.store !== false);
}

export async function finishBlob(blob: Blob, seed: number, prompt: string, keep = true) {
  const bmp = await createImageBitmap(blob);
  const w = bmp.width;
  const h = bmp.height;
  bmp.close?.();
  if (!keep) return { url: URL.createObjectURL(blob), blob, w, h, seed };
  const ref = await store(blob, `AI · ${prompt.slice(0, 40)}.${blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'}`);
  return { url: ref, ref, blob, w, h, seed };
}

export async function storeBlobAsAsset(blob: Blob, name: string) {
  return store(blob, name);
}

/* ------------------------------------------------------------------ background removal */

let bgModule: Promise<typeof import('@imgly/background-removal')> | null = null;

async function removeBgBlob(blob: Blob, onProgress?: (p: number, label: string) => void): Promise<Blob> {
  bgModule ??= import('@imgly/background-removal');
  const m = await bgModule;
  return m.removeBackground(blob, {
    progress: (key: string, current: number, total: number) => onProgress?.(total ? current / total : 0, key.startsWith('fetch') ? 'Downloading model' : 'Processing'),
    output: { format: 'image/png' },
  } as any);
}

/** Remove the background of any image src. Returns a new `asset:` ref (PNG with alpha). */
export async function removeBackground(src: string, onProgress?: (p: number, label: string) => void): Promise<string> {
  const blob = await srcToBlob(src);
  const out = await removeBgBlob(blob, onProgress);
  return store(out, 'Background removed.png');
}

/* ------------------------------------------------------------------ inpainting (Magic Eraser) */

/**
 * Push-pull inpainting: holes (mask alpha > 0) are filled from a pyramid of the known pixels,
 * then smoothed with a few diffusion passes and given a touch of noise so it doesn't look plastic.
 */
function inpaint(img: ImageData, hole: Uint8Array) {
  const { width: W, height: H, data } = img;
  type Level = { w: number; h: number; c: Float32Array; a: Float32Array };
  const base: Level = { w: W, h: H, c: new Float32Array(W * H * 3), a: new Float32Array(W * H) };
  for (let i = 0; i < W * H; i++) {
    const k = hole[i] ? 0 : 1;
    base.a[i] = k;
    base.c[i * 3] = data[i * 4] * k;
    base.c[i * 3 + 1] = data[i * 4 + 1] * k;
    base.c[i * 3 + 2] = data[i * 4 + 2] * k;
  }
  const levels: Level[] = [base];
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const p = levels[levels.length - 1];
    const w = Math.max(1, Math.ceil(p.w / 2));
    const h = Math.max(1, Math.ceil(p.h / 2));
    const n: Level = { w, h, c: new Float32Array(w * h * 3), a: new Float32Array(w * h) };
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        const s = y * p.w + x;
        const d = (y >> 1) * w + (x >> 1);
        n.a[d] += p.a[s];
        n.c[d * 3] += p.c[s * 3];
        n.c[d * 3 + 1] += p.c[s * 3 + 1];
        n.c[d * 3 + 2] += p.c[s * 3 + 2];
      }
    // normalise to weight ≤ 1 (keeps colours premultiplied)
    for (let i = 0; i < w * h; i++) {
      const a = n.a[i];
      if (a > 1) {
        n.c[i * 3] /= a;
        n.c[i * 3 + 1] /= a;
        n.c[i * 3 + 2] /= a;
        n.a[i] = 1;
      }
    }
    levels.push(n);
    if (levels.length > 20) break;
  }
  // push: fill missing weight from the coarser level (bilinear)
  for (let li = levels.length - 2; li >= 0; li--) {
    const f = levels[li];
    const c = levels[li + 1];
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        const a = f.a[i];
        if (a >= 1) continue;
        const cx = Math.min(c.w - 1, Math.max(0, (x - 0.5) / 2));
        const cy = Math.min(c.h - 1, Math.max(0, (y - 0.5) / 2));
        const x0 = Math.floor(cx), y0 = Math.floor(cy);
        const x1 = Math.min(c.w - 1, x0 + 1), y1 = Math.min(c.h - 1, y0 + 1);
        const fx = cx - x0, fy = cy - y0;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        for (let k = 0; k < 3; k++) {
          const ck = (c.c[(y0 * c.w + x0) * 3 + k] / Math.max(1e-6, c.a[y0 * c.w + x0])) * w00 +
            (c.c[(y0 * c.w + x1) * 3 + k] / Math.max(1e-6, c.a[y0 * c.w + x1])) * w10 +
            (c.c[(y1 * c.w + x0) * 3 + k] / Math.max(1e-6, c.a[y1 * c.w + x0])) * w01 +
            (c.c[(y1 * c.w + x1) * 3 + k] / Math.max(1e-6, c.a[y1 * c.w + x1])) * w11;
          f.c[i * 3 + k] = f.c[i * 3 + k] + (1 - a) * ck;
        }
        f.a[i] = 1;
      }
  }
  // write back + diffusion smoothing inside the hole
  const out = data;
  for (let i = 0; i < W * H; i++)
    if (hole[i]) {
      out[i * 4] = base.c[i * 3];
      out[i * 4 + 1] = base.c[i * 3 + 1];
      out[i * 4 + 2] = base.c[i * 3 + 2];
      out[i * 4 + 3] = 255;
    }
  const idx: number[] = [];
  for (let i = 0; i < W * H; i++) if (hole[i]) idx.push(i);
  for (let it = 0; it < 12; it++) {
    for (const i of idx) {
      const x = i % W, y = (i / W) | 0;
      let r = 0, g = 0, b = 0, n = 0;
      if (x > 0) { const j = (i - 1) * 4; r += out[j]; g += out[j + 1]; b += out[j + 2]; n++; }
      if (x < W - 1) { const j = (i + 1) * 4; r += out[j]; g += out[j + 1]; b += out[j + 2]; n++; }
      if (y > 0) { const j = (i - W) * 4; r += out[j]; g += out[j + 1]; b += out[j + 2]; n++; }
      if (y < H - 1) { const j = (i + W) * 4; r += out[j]; g += out[j + 1]; b += out[j + 2]; n++; }
      out[i * 4] = r / n; out[i * 4 + 1] = g / n; out[i * 4 + 2] = b / n;
    }
  }
  for (const i of idx) {
    const nz = (Math.random() - 0.5) * 6;
    out[i * 4] += nz; out[i * 4 + 1] += nz; out[i * 4 + 2] += nz;
  }
}

async function eraseBitmap(bmp: ImageBitmap | HTMLCanvasElement, maskC: HTMLCanvasElement, dilate = 2, fullBase = false): Promise<HTMLCanvasElement> {
  const W = bmp.width, H = bmp.height;
  const c = canvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  // Work at ≤ 1024px for speed, then composite the filled region back at full resolution.
  const k = Math.min(1, 1024 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const sc = canvas(w, h);
  const sctx = sc.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(c, 0, 0, w, h);
  const mc = canvas(w, h);
  const mctx = mc.getContext('2d', { willReadFrequently: true })!;
  mctx.drawImage(maskC, 0, 0, w, h);
  const md = mctx.getImageData(0, 0, w, h).data;
  let hole = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) hole[i] = md[i * 4 + 3] > 20 ? 1 : 0;
  for (let d = 0; d < dilate; d++) {
    const n = new Uint8Array(hole);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (hole[i]) continue;
        if ((x > 0 && hole[i - 1]) || (x < w - 1 && hole[i + 1]) || (y > 0 && hole[i - w]) || (y < h - 1 && hole[i + w])) n[i] = 1;
      }
    hole = n;
  }
  const id = sctx.getImageData(0, 0, w, h);
  inpaint(id, hole);
  sctx.putImageData(id, 0, 0);
  if (fullBase) {
    // outpainting: the whole canvas becomes the filled low-res result (the caller draws the original on top)
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sc, 0, 0, W, H);
    return c;
  }
  // composite filled pixels using a soft version of the mask
  const soft = canvas(W, H);
  const so = soft.getContext('2d')!;
  const hm = canvas(w, h);
  const hmc = hm.getContext('2d')!;
  const hd = hmc.createImageData(w, h);
  for (let i = 0; i < w * h; i++) hd.data[i * 4 + 3] = hole[i] ? 255 : 0;
  hmc.putImageData(hd, 0, 0);
  so.filter = `blur(${Math.max(1, 1.5 / k)}px)`;
  so.drawImage(hm, 0, 0, W, H);
  so.filter = 'none';
  so.globalCompositeOperation = 'source-in';
  so.imageSmoothingQuality = 'high';
  so.drawImage(sc, 0, 0, W, H);
  ctx.drawImage(soft, 0, 0);
  return c;
}

/** Magic Eraser: fill masked pixels (mask = canvas or data URL, any size; painted = erase). Returns a new asset ref. */
export async function magicErase(src: string, mask: HTMLCanvasElement | string): Promise<string> {
  const bmp = await loadBitmap(src);
  const mc = await maskToCanvas(mask, bmp.width, bmp.height);
  const out = await eraseBitmap(bmp, mc);
  return store(await toBlob(out, 'image/png'), 'Magic Eraser.png');
}

/* ------------------------------------------------------------------ Magic Expand */

/**
 * Outpaint to targetW × targetH (natural px). The original is centred (or at offset) and the borders are
 * filled with a mirrored + heavily blurred extension, or with a generated scene when `generate` is set.
 */
export async function magicExpand(
  src: string,
  o: { targetW: number; targetH: number; offsetX?: number; offsetY?: number; generate?: boolean; prompt?: string },
): Promise<{ ref: string; w: number; h: number }> {
  const bmp = await loadBitmap(src);
  const scaleDown = Math.min(1, 4096 / Math.max(o.targetW, o.targetH));
  const W = Math.round(o.targetW * scaleDown), H = Math.round(o.targetH * scaleDown);
  const iw = Math.min(W, Math.round(bmp.width * scaleDown)), ih = Math.min(H, Math.round(bmp.height * scaleDown));
  const ox = Math.round(o.offsetX != null ? o.offsetX * scaleDown : (W - iw) / 2);
  const oy = Math.round(o.offsetY != null ? o.offsetY * scaleDown : (H - ih) / 2);
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  let generated = false;
  if (o.generate) {
    try {
      const { blob } = await generateImageBlob(o.prompt || 'seamless natural background scene, matching lighting', { width: Math.min(1280, W), height: Math.min(1280, H) });
      const g = await createImageBitmap(blob);
      ctx.drawImage(g, 0, 0, W, H);
      generated = true;
    } catch {
      /* fall back to mirrored blur */
    }
  }
  if (!generated) {
    // Extend the edges into the new area with push-pull inpainting (smooth colour continuation),
    // blended with a faint, heavily blurred mirror for a bit of texture.
    const base = canvas(W, H);
    const bctx = base.getContext('2d')!;
    bctx.drawImage(bmp, ox, oy, iw, ih);
    const mask = canvas(W, H);
    const mctx = mask.getContext('2d')!;
    mctx.fillStyle = '#000';
    mctx.fillRect(0, 0, W, H);
    mctx.clearRect(ox, oy, iw, ih);
    const filled = await eraseBitmap(base, mask, 2, true);
    ctx.drawImage(filled, 0, 0);
    const tex = canvas(W, H);
    const tctx = tex.getContext('2d')!;
    for (let ty = -1; ty <= 1; ty++)
      for (let tx = -1; tx <= 1; tx++) {
        if (!tx && !ty) continue;
        tctx.save();
        tctx.translate(ox + tx * iw + (tx ? iw : 0) * (tx < 0 ? 1 : 0) + (tx > 0 ? iw : 0), oy + ty * ih + (ty < 0 ? ih : 0) + (ty > 0 ? ih : 0));
        tctx.scale(tx ? -1 : 1, ty ? -1 : 1);
        tctx.drawImage(bmp, 0, 0, iw, ih);
        tctx.restore();
      }
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.filter = `blur(${Math.round(Math.max(W, H) / 22)}px)`;
    ctx.drawImage(tex, 0, 0);
    ctx.restore();
  }
  // original with a feathered edge
  const feather = Math.round(Math.min(iw, ih) * 0.04);
  const fc = canvas(iw, ih);
  const fctx = fc.getContext('2d')!;
  fctx.drawImage(bmp, 0, 0, iw, ih);
  if (feather > 1) {
    fctx.globalCompositeOperation = 'destination-in';
    const m = canvas(iw, ih);
    const mctx = m.getContext('2d')!;
    mctx.filter = `blur(${feather / 2}px)`;
    mctx.fillStyle = '#000';
    mctx.fillRect(feather, feather, iw - feather * 2, ih - feather * 2);
    // keep hard edges where the image touches the canvas border
    if (ox <= 0) mctx.fillRect(0, 0, feather * 2, ih);
    if (oy <= 0) mctx.fillRect(0, 0, iw, feather * 2);
    if (ox + iw >= W) mctx.fillRect(iw - feather * 2, 0, feather * 2, ih);
    if (oy + ih >= H) mctx.fillRect(0, ih - feather * 2, iw, feather * 2);
    fctx.drawImage(m, 0, 0);
  }
  ctx.drawImage(fc, ox, oy);
  const ref = await store(await toBlob(c, 'image/jpeg', 0.92), 'Magic Expand.jpg');
  return { ref, w: W, h: H };
}

/* ------------------------------------------------------------------ OCR (Grab Text) */

export interface TextBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number; // estimated px in natural image space
  color?: string;
  confidence: number;
}

/** Grab Text: OCR with tesseract.js. Boxes are in natural image pixels, one per text line. */
export async function grabText(src: string, lang = 'eng', onProgress?: (p: number) => void): Promise<{ text: string; boxes: TextBox[] }> {
  const T = await import('tesseract.js');
  const createWorker = (T as any).createWorker ?? (T as any).default?.createWorker;
  const worker = await createWorker(lang, 1, {
    logger: (m: any) => m.status === 'recognizing text' && onProgress?.(m.progress),
  });
  try {
    const blob = await srcToBlob(src);
    const { data } = await worker.recognize(blob, {}, { text: true, blocks: true });
    const boxes: TextBox[] = [];
    for (const b of data.blocks ?? [])
      for (const p of b.paragraphs ?? [])
        for (const l of p.lines ?? []) {
          const t = (l.text ?? '').trim();
          if (!t || (l.confidence ?? 0) < 35) continue;
          const bb = l.bbox;
          boxes.push({ text: t, x: bb.x0, y: bb.y0, w: bb.x1 - bb.x0, h: bb.y1 - bb.y0, fontSize: Math.round((bb.y1 - bb.y0) * 0.95), confidence: l.confidence });
        }
    // sample text colour (darkest/most contrasting pixel in each box)
    try {
      const bmp = await createImageBitmap(blob);
      const c = canvas(bmp.width, bmp.height);
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0);
      for (const bx of boxes) {
        const d = ctx.getImageData(bx.x, bx.y, Math.max(1, bx.w), Math.max(1, bx.h)).data;
        let bg = [d[0], d[1], d[2]];
        let best = 0, col = bg;
        for (let i = 0; i < d.length; i += 16) {
          const diff = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
          if (diff > best) { best = diff; col = [d[i], d[i + 1], d[i + 2]]; }
        }
        bx.color = '#' + col.map((v) => v.toString(16).padStart(2, '0')).join('');
      }
    } catch {
      /* colour is optional */
    }
    return { text: (data.text ?? '').trim(), boxes };
  } finally {
    await worker.terminate();
  }
}

/** Erase OCR'd text boxes from an image (used by Grab Text to leave a clean background). */
export async function eraseBoxes(src: string, boxes: { x: number; y: number; w: number; h: number }[]): Promise<string> {
  const bmp = await loadBitmap(src);
  const m = canvas(bmp.width, bmp.height);
  const ctx = m.getContext('2d')!;
  ctx.fillStyle = '#000';
  for (const b of boxes) ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
  const out = await eraseBitmap(bmp, m, 1);
  return store(await toBlob(out, 'image/png'), 'Text removed.png');
}

/* ------------------------------------------------------------------ Magic Grab */

/**
 * Cut the subject inside `rect` (natural px, or fractions 0..1) out of the image.
 * Returns the subject as a new transparent image + a background with the hole filled.
 */
export async function magicGrab(
  src: string,
  rect?: { x: number; y: number; w: number; h: number },
  onProgress?: (p: number, label: string) => void,
): Promise<{ ref: string; w: number; h: number; x: number; y: number; backgroundRef: string; naturalW: number; naturalH: number }> {
  const bmp = await loadBitmap(src);
  let r = rect ?? { x: 0, y: 0, w: bmp.width, h: bmp.height };
  if (r.w <= 1 && r.h <= 1) r = { x: r.x * bmp.width, y: r.y * bmp.height, w: r.w * bmp.width, h: r.h * bmp.height };
  r = { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), w: Math.round(Math.min(r.w, bmp.width - r.x)), h: Math.round(Math.min(r.h, bmp.height - r.y)) };
  const crop = canvas(r.w, r.h);
  crop.getContext('2d')!.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  const cut = await removeBgBlob(await toBlob(crop), onProgress);
  const cutBmp = await createImageBitmap(cut);
  const ref = await store(cut, 'Magic Grab subject.png');
  // mask of the subject on the full image → inpaint the hole
  const mask = canvas(bmp.width, bmp.height);
  mask.getContext('2d')!.drawImage(cutBmp, r.x, r.y, r.w, r.h);
  onProgress?.(1, 'Filling background');
  const bg = await eraseBitmap(bmp, mask, 4);
  const backgroundRef = await store(await toBlob(bg, 'image/jpeg', 0.92), 'Magic Grab background.jpg');
  return { ref, w: r.w, h: r.h, x: r.x, y: r.y, backgroundRef, naturalW: bmp.width, naturalH: bmp.height };
}

/* ------------------------------------------------------------------ Upscale */

/** High-quality resample (stepwise 2×) + unsharp mask. Returns a new asset ref. */
export async function upscale(src: string, factor = 2): Promise<string> {
  const bmp = await loadBitmap(src);
  const maxSide = 6000;
  const f = Math.max(1, Math.min(factor, maxSide / Math.max(bmp.width, bmp.height), Math.sqrt(36e6 / (bmp.width * bmp.height))));
  let cur: HTMLCanvasElement | ImageBitmap = bmp;
  let cw = bmp.width, ch = bmp.height;
  const tw = Math.round(bmp.width * f), th = Math.round(bmp.height * f);
  while (cw < tw || ch < th) {
    const nw = Math.min(tw, cw * 2), nh = Math.min(th, ch * 2);
    const c = canvas(nw, nh);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, nw, nh);
    cur = c;
    cw = nw;
    ch = nh;
  }
  const out = cur instanceof HTMLCanvasElement ? cur : (() => { const c = canvas(cw, ch); c.getContext('2d')!.drawImage(cur, 0, 0); return c; })();
  // unsharp mask: out + amount * (out - blur(out))
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  const blur = canvas(cw, ch);
  const bctx = blur.getContext('2d', { willReadFrequently: true })!;
  bctx.filter = `blur(${Math.max(0.8, f * 0.6)}px)`;
  bctx.drawImage(out, 0, 0);
  const a = ctx.getImageData(0, 0, cw, ch);
  const b = bctx.getImageData(0, 0, cw, ch).data;
  const d = a.data;
  const amount = 0.6;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] + amount * (d[i] - b[i]);
    d[i + 1] = d[i + 1] + amount * (d[i + 1] - b[i + 1]);
    d[i + 2] = d[i + 2] + amount * (d[i + 2] - b[i + 2]);
  }
  ctx.putImageData(a, 0, 0);
  const hasAlpha = (await srcToBlob(src)).type === 'image/png';
  return store(await toBlob(out, hasAlpha ? 'image/png' : 'image/jpeg', 0.94), `Upscaled ${Math.round(f * 10) / 10}x.${hasAlpha ? 'png' : 'jpg'}`);
}
