// File-type exporters (PNG/JPG/PDF/SVG/MP4/GIF/PPTX/.cream). All run fully in the browser.

import type { Design, El, Page, TextEl } from '../model/types';
import { canvasToBlob, clampScale, prepareExport, renderPageCanvasCtx, renderPageSvgCtx, renderPageAnimFrames, inlineSrc, type ExportContext } from './render';
import { pageAnimEnd } from '../render/animation';
import { makeZip, type ZipEntry } from './zip';
import { encodePng8 } from './png8';
import { creamBlob } from './creamFile';
import { elBounds, moveEl } from '../model/geometry';
import { htmlToText } from '../model/defaults';
import { resolveSrc } from '../store/blobs';

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'pdf-print' | 'svg' | 'mp4' | 'gif' | 'pptx' | 'cream';

export interface ExportOptions {
  format: ExportFormat;
  pageIds: string[];
  scale: number; // size multiplier
  transparent: boolean;
  compress: boolean;
  quality: number; // 1..100 (JPG)
  limitKb?: number; // limit file size (single page JPG/PNG)
  flatten: boolean;
  cropMarks: boolean; // PDF print: crop marks and bleed
  colorProfile: 'rgb' | 'cmyk';
  videoQuality: '480p' | '720p' | '1080p' | '4k';
  gifScale: number; // 0.2..1
  svgSeparate?: boolean;
}

export const DEFAULT_EXPORT: ExportOptions = {
  format: 'png',
  pageIds: [],
  scale: 1,
  transparent: false,
  compress: false,
  quality: 80,
  flatten: true,
  cropMarks: false,
  colorProfile: 'rgb',
  videoQuality: '1080p',
  gifScale: 0.6,
};

export type Progress = (fraction: number, label: string) => void;

export class Cancelled extends Error {
  constructor() {
    super('Download cancelled');
  }
}

const check = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Cancelled();
};

export const safeName = (s: string) => (s || 'design').replace(/[\\/:*?"<>|#%]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'design';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export async function runExport(design: Design, o: ExportOptions, onProgress: Progress = () => {}, signal?: AbortSignal): Promise<ExportResult> {
  const pages = design.pages.filter((p) => o.pageIds.includes(p.id));
  const base = safeName(design.title);
  if (!pages.length && o.format !== 'cream') throw new Error('Select at least one page');
  onProgress(0.02, 'Preparing your design');
  if (o.format === 'cream') {
    const blob = await creamBlob(design);
    onProgress(1, 'Done');
    return { blob, filename: base + '.cream' };
  }
  const ctx = await prepareExport(design, pages.map((p) => p.id));
  check(signal);
  const idx = (p: Page) => design.pages.findIndex((x) => x.id === p.id);
  switch (o.format) {
    case 'png':
    case 'jpg':
      return rasterImages(ctx, o, base, idx, onProgress, signal);
    case 'pdf':
    case 'pdf-print':
      return pdf(ctx, o, base, idx, onProgress, signal);
    case 'svg':
      return svg(ctx, o, base, idx, onProgress, signal);
    case 'gif':
      return gif(ctx, o, base, idx, onProgress, signal);
    case 'mp4':
      return video(ctx, o, base, idx, onProgress, signal);
    case 'pptx':
      return pptx(ctx, o, base, idx, onProgress, signal);
  }
}

/* ---------------- PNG / JPG ---------------- */

async function encodeRaster(c: HTMLCanvasElement, o: ExportOptions): Promise<Blob> {
  if (o.format === 'jpg') {
    let q = Math.max(0.01, Math.min(1, o.quality / 100));
    let blob = await canvasToBlob(c, 'image/jpeg', q);
    if (o.limitKb && blob.size > o.limitKb * 1024) {
      let lo = 0.02;
      let hi = q;
      for (let i = 0; i < 8; i++) {
        q = (lo + hi) / 2;
        const b = await canvasToBlob(c, 'image/jpeg', q);
        if (b.size > o.limitKb * 1024) hi = q;
        else {
          lo = q;
          blob = b;
        }
      }
      if (blob.size > o.limitKb * 1024) blob = await canvasToBlob(c, 'image/jpeg', 0.02);
    }
    return blob;
  }
  let blob = o.compress ? await encodePng8(c) : await canvasToBlob(c, 'image/png');
  if (o.limitKb && blob.size > o.limitKb * 1024) {
    blob = await encodePng8(c, 128);
    let cur = c;
    while (blob.size > o.limitKb * 1024 && cur.width > 64) {
      const n = document.createElement('canvas');
      n.width = Math.round(cur.width * 0.8);
      n.height = Math.round(cur.height * 0.8);
      n.getContext('2d')!.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
      blob = await encodePng8(cur, 128);
    }
  }
  return blob;
}

async function rasterImages(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  const ext = o.format === 'jpg' ? 'jpg' : 'png';
  const entries: ZipEntry[] = [];
  for (let i = 0; i < ctx.pages.length; i++) {
    check(signal);
    const p = ctx.pages[i];
    onProgress(0.05 + (0.9 * i) / ctx.pages.length, `Rendering page ${idx(p) + 1}`);
    const c = await renderPageCanvasCtx(ctx, p, { scale: o.scale, transparent: o.format === 'png' && o.transparent, pageIndex: idx(p) });
    const blob = await encodeRaster(c, o);
    entries.push({ name: `${idx(p) + 1}.${ext}`, data: blob });
  }
  onProgress(0.97, 'Packaging');
  if (entries.length === 1) return { blob: entries[0].data as Blob, filename: `${base}.${ext}` };
  return { blob: await makeZip(entries), filename: `${base}.zip` };
}

/* ---------------- PDF ---------------- */

const PT = 0.75; // px -> pt (96 dpi -> 72 dpi)

async function pdf(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  const { jsPDF } = await import('jspdf');
  const print = o.format === 'pdf-print';
  const W = ctx.design.width;
  const bleed = print && o.cropMarks ? 12 : 0; // 0.125in at 96dpi
  const slug = print && o.cropMarks ? 24 : 0; // room for crop marks (0.25in)
  let doc: InstanceType<typeof jsPDF> | null = null;
  for (let i = 0; i < ctx.pages.length; i++) {
    check(signal);
    const p = ctx.pages[i];
    const H = p.height ?? ctx.design.height;
    onProgress(0.05 + (0.88 * i) / ctx.pages.length, `Rendering page ${idx(p) + 1}`);
    const scale = print ? 3.125 : o.compress ? 1 : 1.5;
    const c = await renderPageCanvasCtx(ctx, p, { scale: clampScale(W + 2 * bleed, H + 2 * bleed, scale), pageIndex: idx(p), bleed });
    const pw = (W + 2 * bleed + 2 * slug) * PT;
    const ph = (H + 2 * bleed + 2 * slug) * PT;
    const orientation = pw > ph ? 'landscape' : 'portrait';
    if (!doc) doc = new jsPDF({ unit: 'pt', format: [pw, ph], orientation, compress: true });
    else doc.addPage([pw, ph], orientation);
    const q = print ? 0.95 : o.compress ? 0.72 : 0.9;
    const data = c.toDataURL('image/jpeg', q);
    doc.addImage(data, 'JPEG', slug * PT, slug * PT, (W + 2 * bleed) * PT, (H + 2 * bleed) * PT, undefined, 'FAST');
    const ox = (slug + bleed) * PT;
    const oy = (slug + bleed) * PT;
    if (slug) {
      // Crop marks at the trim corners, kept outside the bleed area.
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      const tw = W * PT;
      const th = H * PT;
      const gap = bleed * PT + 2;
      const len = slug * PT - 4;
      for (const [x, y, sx, sy] of [
        [ox, oy, -1, -1],
        [ox + tw, oy, 1, -1],
        [ox, oy + th, -1, 1],
        [ox + tw, oy + th, 1, 1],
      ] as const) {
        doc.line(x + sx * gap, y, x + sx * (gap + len), y);
        doc.line(x, y + sy * gap, x, y + sy * (gap + len));
      }
    }
    // Searchable text layer + clickable links when not flattened.
    for (const el of p.elements) {
      if (el.hidden) continue;
      if (!o.flatten && (el.type === 'text' || (el.type === 'shape' && el.html))) {
        const txt = htmlToText((el as TextEl).html ?? '').trim();
        if (txt) {
          const fs = ((el as TextEl).fontSize ?? 24) * PT;
          doc.setFontSize(fs);
          try {
            doc.text(doc.splitTextToSize(txt, el.w * PT), ox + el.x * PT, oy + el.y * PT + fs, { renderingMode: 'invisible' } as any);
          } catch {
            /* non-latin glyphs in the standard font */
          }
        }
      }
      if (el.link && /^https?:|^mailto:/.test(el.link)) {
        const b = elBounds(el);
        doc.link(ox + b.x * PT, oy + b.y * PT, b.w * PT, b.h * PT, { url: el.link });
      }
    }
  }
  check(signal);
  onProgress(0.96, 'Building PDF');
  doc!.setProperties({ title: ctx.design.title, creator: 'Cream' });
  const blob = doc!.output('blob');
  return { blob, filename: `${base}.pdf` };
}

/* ---------------- SVG ---------------- */

async function svg(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  const entries: ZipEntry[] = [];
  for (let i = 0; i < ctx.pages.length; i++) {
    check(signal);
    const p = ctx.pages[i];
    onProgress(0.05 + (0.9 * i) / ctx.pages.length, `Rendering page ${idx(p) + 1}`);
    let text = await renderPageSvgCtx(ctx, p, { transparent: o.transparent, pageIndex: idx(p) });
    if (o.scale !== 1) {
      const w = ctx.design.width;
      const h = p.height ?? ctx.design.height;
      text = text.replace(/<svg([^>]*?)width="[^"]*"([^>]*?)height="[^"]*"/, `<svg$1width="${Math.round(w * o.scale)}"$2height="${Math.round(h * o.scale)}" viewBox="0 0 ${w} ${h}"`);
    }
    entries.push({ name: `${idx(p) + 1}.svg`, data: new Blob([text], { type: 'image/svg+xml' }) });
  }
  if (entries.length === 1) return { blob: entries[0].data as Blob, filename: `${base}.svg` };
  return { blob: await makeZip(entries), filename: `${base}.zip` };
}

/* ---------------- shared frame helpers (GIF / video) ---------------- */

type Frame = HTMLCanvasElement;

/** Draw one transition frame between two page images at progress t (0..1). */
export function drawTransition(g: CanvasRenderingContext2D, a: Frame, b: Frame, t: number, type: string, dir: string = 'left') {
  const W = g.canvas.width;
  const H = g.canvas.height;
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
  g.save();
  g.clearRect(0, 0, W, H);
  const vec = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] ?? [-1, 0];
  switch (type) {
    case 'slide':
    case 'flow':
    case 'stack': {
      g.drawImage(a, type === 'stack' ? 0 : vec[0] * W * e, type === 'stack' ? 0 : vec[1] * H * e, W, H);
      g.drawImage(b, -vec[0] * W * (1 - e), -vec[1] * H * (1 - e), W, H);
      break;
    }
    case 'circle-wipe': {
      g.drawImage(a, 0, 0, W, H);
      g.beginPath();
      g.arc(W / 2, H / 2, Math.hypot(W, H) * 0.5 * e, 0, Math.PI * 2);
      g.clip();
      g.drawImage(b, 0, 0, W, H);
      break;
    }
    case 'line-wipe':
    case 'color-wipe': {
      g.drawImage(a, 0, 0, W, H);
      const x = vec[0] ? (vec[0] < 0 ? W * (1 - e) : 0) : 0;
      const y = vec[1] ? (vec[1] < 0 ? H * (1 - e) : 0) : 0;
      const w = vec[0] ? W * e : W;
      const h = vec[1] ? H * e : H;
      if (type === 'color-wipe' && t < 0.5) {
        g.fillStyle = '#7d5cff';
        g.fillRect(x, y, w, h);
      } else {
        g.beginPath();
        g.rect(x, y, w, h);
        g.clip();
        g.drawImage(b, 0, 0, W, H);
      }
      break;
    }
    case 'zoom': {
      g.globalAlpha = 1 - e;
      const s = 1 + e * 0.3;
      g.drawImage(a, (W - W * s) / 2, (H - H * s) / 2, W * s, H * s);
      g.globalAlpha = e;
      const s2 = 0.7 + 0.3 * e;
      g.drawImage(b, (W - W * s2) / 2, (H - H * s2) / 2, W * s2, H * s2);
      break;
    }
    default: {
      g.drawImage(a, 0, 0, W, H);
      g.globalAlpha = e;
      g.drawImage(b, 0, 0, W, H);
    }
  }
  g.restore();
}

interface PageFrames {
  still: Frame; // fully-built page
  anim: Frame[]; // entrance animation frames at `fps` (may be empty)
  fps: number;
}

const first = (f: PageFrames) => f.anim[0] ?? f.still;

async function renderFrames(ctx: ExportContext, scale: number, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal, share = 0.5, fps = 12): Promise<PageFrames[]> {
  const frames: PageFrames[] = [];
  // Budget animation frames by pixel count so 4K exports don't exhaust memory.
  const px = ctx.design.width * ctx.design.height * scale * scale;
  const budget = Math.max(12, Math.floor(1.2e9 / Math.max(1, px * 4)));
  let used = 0;
  for (let i = 0; i < ctx.pages.length; i++) {
    check(signal);
    const p = { ...ctx.pages[i], height: undefined };
    onProgress(0.05 + (share * i) / ctx.pages.length, `Rendering page ${idx(p) + 1}`);
    const still = await renderPageCanvasCtx(ctx, p, { scale, pageIndex: idx(p) });
    const end = Math.min(pageAnimEnd(p.elements, p.pageAnim), Math.max(0.5, (p.duration || 5) - 0.3), 4);
    let anim: Frame[] = [];
    if (end > 0.05 && used < budget) {
      const n = Math.min(Math.ceil(end * fps), budget - used);
      const times = Array.from({ length: n }, (_, k) => (k / n) * end);
      try {
        anim = await renderPageAnimFrames(ctx, p, times, { scale, pageIndex: idx(p) });
        used += anim.length;
      } catch (e) {
        console.warn('Animation frames failed', e);
      }
    }
    frames.push({ still, anim, fps: anim.length ? anim.length / end : fps });
  }
  return frames;
}

/* ---------------- GIF ---------------- */

async function gif(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const W0 = ctx.design.width;
  const H0 = ctx.design.height;
  // Keep GIFs manageable: cap the long edge at 1200px.
  const scale = Math.min(o.gifScale, 1200 / Math.max(W0, H0));
  const frames = await renderFrames(ctx, scale, idx, onProgress, signal, 0.5, 10);
  const W = frames[0].still.width;
  const H = frames[0].still.height;
  const enc = GIFEncoder();
  const work = document.createElement('canvas');
  work.width = W;
  work.height = H;
  const g = work.getContext('2d', { willReadFrequently: true })!;
  const write = (c: HTMLCanvasElement | null, delay: number) => {
    if (c) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      g.drawImage(c, 0, 0, W, H);
    }
    const data = g.getImageData(0, 0, W, H).data;
    const palette = quantize(data, 256);
    enc.writeFrame(applyPalette(data, palette), W, H, { palette, delay: Math.round(delay) });
  };
  for (let i = 0; i < frames.length; i++) {
    check(signal);
    onProgress(0.55 + (0.4 * i) / frames.length, `Encoding frame ${i + 1}`);
    const p = ctx.pages[i];
    const f = frames[i];
    for (const a of f.anim) write(a, 1000 / f.fps);
    write(f.still, Math.max(0.2, (p.duration || 3) - f.anim.length / f.fps) * 1000);
    const tr = p.transition;
    if (frames.length > 1 && tr && tr.type !== 'none') {
      const next = first(frames[(i + 1) % frames.length]);
      const n = Math.max(3, Math.min(10, Math.round((tr.duration || 0.6) * 12)));
      for (let k = 1; k < n; k++) {
        drawTransition(g, f.still, next, k / n, tr.type, tr.direction);
        write(null, ((tr.duration || 0.6) * 1000) / n);
      }
    }
    await new Promise((r) => setTimeout(r));
  }
  enc.finish();
  return { blob: new Blob([enc.bytes() as BlobPart], { type: 'image/gif' }), filename: `${base}.gif` };
}

/* ---------------- Video (MP4 / WebM) ---------------- */

export function pickVideoMime(): { mime: string; ext: 'mp4' | 'webm' } {
  const cands: [string, 'mp4' | 'webm'][] = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4;codecs=avc1', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  for (const [m, e] of cands) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return { mime: m, ext: e };
  return { mime: '', ext: 'webm' };
}

const QUALITY_SHORT: Record<ExportOptions['videoQuality'], number> = { '480p': 480, '720p': 720, '1080p': 1080, '4k': 2160 };

async function video(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video export is not supported in this browser');
  const W0 = ctx.design.width;
  const H0 = ctx.design.height;
  let scale = QUALITY_SHORT[o.videoQuality] / Math.min(W0, H0);
  scale = Math.min(scale, 3840 / Math.max(W0, H0));
  const frames = await renderFrames(ctx, scale, idx, onProgress, signal, 0.3, 15);
  const W = frames[0].still.width - (frames[0].still.width % 2);
  const H = frames[0].still.height - (frames[0].still.height % 2);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  // Timeline: each page shows for its duration; the transition eats into the end of the page.
  const segs = ctx.pages.map((p) => ({ dur: Math.max(0.5, p.duration || 5), tr: p.transition && p.transition.type !== 'none' ? p.transition : null }));
  const total = segs.reduce((s, x) => s + x.dur, 0);

  // Audio: mix design audio tracks into the recording.
  const stream = canvas.captureStream(30);
  let ac: AudioContext | null = null;
  const sources: AudioBufferSourceNode[] = [];
  const startAudio = async () => {
    if (!ctx.design.audio?.length) return;
    try {
      ac = new AudioContext();
      const dest = ac.createMediaStreamDestination();
      // Offset the design timeline by the pages actually exported.
      const firstStart = ctx.design.pages.slice(0, ctx.design.pages.findIndex((p) => p.id === ctx.pages[0].id)).reduce((s, p) => s + (p.duration || 5), 0);
      for (const t of ctx.design.audio) {
        const url = await resolveSrc(t.src);
        const buf = await ac.decodeAudioData(await (await fetch(url)).arrayBuffer());
        const src = ac.createBufferSource();
        src.buffer = buf;
        const gain = ac.createGain();
        const at = t.start - firstStart;
        const when = ac.currentTime + 0.05 + Math.max(0, at);
        const offset = t.trimStart + Math.max(0, -at);
        const len = Math.min(t.duration - Math.max(0, -at), total - Math.max(0, at));
        if (len <= 0) continue;
        gain.gain.setValueAtTime(t.fadeIn ? 0 : t.volume, when);
        if (t.fadeIn) gain.gain.linearRampToValueAtTime(t.volume, when + t.fadeIn);
        if (t.fadeOut) {
          gain.gain.setValueAtTime(t.volume, when + Math.max(0, len - t.fadeOut));
          gain.gain.linearRampToValueAtTime(0, when + len);
        }
        src.connect(gain).connect(dest);
        src.start(when, offset, len);
        sources.push(src);
      }
      dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    } catch (e) {
      console.warn('Audio mix failed', e);
    }
  };
  await startAudio();

  const { mime, ext } = pickVideoMime();
  const bitrate = Math.round(W * H * 30 * 0.12);
  const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: Math.min(40_000_000, Math.max(1_500_000, bitrate)) });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((res) => (rec.onstop = () => res()));

  const drawAt = (t: number) => {
    let acc = 0;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (t < acc + s.dur || i === segs.length - 1) {
        const local = t - acc;
        const trDur = s.tr ? Math.min(s.tr.duration || 0.6, s.dur / 2) : 0;
        const f = frames[i];
        if (s.tr && i < segs.length - 1 && local > s.dur - trDur) {
          drawTransition(g, f.still, first(frames[i + 1]), (local - (s.dur - trDur)) / trDur, s.tr.type, s.tr.direction);
        } else {
          const k = Math.floor(local * f.fps);
          g.drawImage(k < f.anim.length ? f.anim[k] : f.still, 0, 0, W, H);
        }
        return;
      }
      acc += s.dur;
    }
  };

  drawAt(0);
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) {
        clearInterval(timer);
        rec.stop();
        reject(new Cancelled());
        return;
      }
      const t = (performance.now() - t0) / 1000;
      drawAt(Math.min(t, total));
      onProgress(0.35 + 0.6 * Math.min(1, t / total), `Recording video ${Math.min(total, t).toFixed(1)}s / ${total.toFixed(1)}s`);
      if (t >= total + 0.15) {
        clearInterval(timer);
        resolve();
      }
    };
    const timer = window.setInterval(tick, 1000 / 30);
  }).finally(() => {
    sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* */
      }
    });
    (ac as AudioContext | null)?.close();
  });
  if (rec.state !== 'inactive') rec.stop();
  await done;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' }), filename: `${base}.${ext}` };
}

/* ---------------- PPTX ---------------- */

const hex = (c?: string) => {
  if (!c) return '000000';
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return h.slice(0, 6).toUpperCase();
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  return '000000';
};

interface Run {
  text: string;
  options: Record<string, unknown>;
}

/** Turn Cream rich-text html into pptxgenjs text runs (bold/italic/underline/colour, line breaks). */
function htmlRuns(html: string, base: TextEl): Run[] {
  const root = document.createElement('div');
  root.innerHTML = html;
  const runs: Run[] = [];
  const walk = (n: Node, st: { bold: boolean; italic: boolean; underline: boolean; color: string }) => {
    if (n.nodeType === 3) {
      const t = (n.textContent ?? '').replace(/ /g, ' ');
      if (t) runs.push({ text: base.uppercase ? t.toUpperCase() : t, options: { bold: st.bold, italic: st.italic, underline: st.underline ? { style: 'sng' } : undefined, color: hex(st.color) } });
      return;
    }
    if (n.nodeType !== 1) return;
    const e = n as HTMLElement;
    const tag = e.tagName.toLowerCase();
    if (tag === 'br') {
      runs.push({ text: '', options: { breakLine: true } });
      return;
    }
    const s = { ...st };
    if (tag === 'b' || tag === 'strong' || /^(bold|[6-9]00)$/.test(e.style.fontWeight)) s.bold = true;
    if (tag === 'i' || tag === 'em' || e.style.fontStyle === 'italic') s.italic = true;
    if (tag === 'u' || e.style.textDecoration.includes('underline')) s.underline = true;
    if (e.style.color) s.color = e.style.color;
    const block = tag === 'div' || tag === 'p' || tag === 'li';
    if (block && runs.length && !runs[runs.length - 1].options.breakLine) runs[runs.length - 1].options.breakLine = true;
    e.childNodes.forEach((c) => walk(c, s));
    if (block && runs.length) runs[runs.length - 1].options.breakLine = true;
  };
  walk(root, { bold: base.fontWeight >= 600, italic: base.italic, underline: base.underline, color: base.color });
  if (runs.length && runs[runs.length - 1].options.breakLine && !runs[runs.length - 1].text) runs.pop();
  if (runs.length) delete runs[runs.length - 1].options.breakLine;
  return runs.length ? runs : [{ text: ' ', options: {} }];
}

function nativeText(el: El): el is TextEl {
  if (el.type !== 'text') return false;
  return !(el.curve ?? 0) && !el.gradient && (!el.effect || el.effect.kind === 'none' || el.effect.kind === 'shadow');
}

function nativeShape(el: El): boolean {
  return el.type === 'shape' && ['rect', 'rounded', 'circle'].includes(el.shape) && el.fill.kind === 'solid' && !el.html;
}

/** Rasterise a single element (with padding for shadows/effects) for PPTX. */
async function elementImage(ctx: ExportContext, el: El, pageIndex: number, scale: number): Promise<{ data: string; x: number; y: number; w: number; h: number } | null> {
  const unrot = { ...structuredClone(el), rotation: 0 } as El;
  const b = elBounds(unrot);
  const pad = Math.round(Math.min(120, Math.max(b.w, b.h) * 0.15) + 8);
  moveEl(unrot, -b.x + pad, -b.y + pad);
  const page: Page = { id: 'el-' + el.id, background: { kind: 'solid', color: 'transparent' }, elements: [unrot], notes: '', duration: 5 };
  const sub: ExportContext = { ...ctx, design: { ...ctx.design, width: b.w + 2 * pad, height: b.h + 2 * pad } };
  try {
    const c = await renderPageCanvasCtx(sub, page, { scale: clampScale(b.w + 2 * pad, b.h + 2 * pad, scale), transparent: true, pageIndex });
    return { data: c.toDataURL('image/png'), x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad };
  } catch {
    return null;
  }
}

async function pptx(ctx: ExportContext, o: ExportOptions, base: string, idx: (p: Page) => number, onProgress: Progress, signal?: AbortSignal): Promise<ExportResult> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  const IN = (px: number) => px / 96;
  pres.defineLayout({ name: 'CREAM', width: IN(ctx.design.width), height: IN(ctx.design.height) });
  pres.layout = 'CREAM';
  pres.title = ctx.design.title;
  pres.company = 'Cream';
  const total = ctx.pages.reduce((s, p) => s + p.elements.length + 1, 0);
  let done = 0;
  for (const p of ctx.pages) {
    check(signal);
    const slide = pres.addSlide();
    if ((ctx.design.pages.find((x) => x.id === p.id) as Page)?.hidden) (slide as any).hidden = true;
    // Background: solid colour natively, anything else rasterised.
    if (p.background.kind === 'solid' && !p.backgroundImage) slide.background = { color: hex(p.background.color) };
    else {
      const bg = await renderPageCanvasCtx(ctx, { ...p, elements: [] }, { scale: 1, pageIndex: idx(p) });
      slide.background = { data: bg.toDataURL('image/jpeg', 0.9) };
    }
    for (const el of p.elements) {
      check(signal);
      done++;
      onProgress(0.05 + (0.9 * done) / total, `Building slide ${idx(p) + 1}`);
      if (el.hidden) continue;
      const transparency = Math.round((1 - (el.opacity ?? 1)) * 100);
      if (nativeText(el)) {
        slide.addText(htmlRuns(el.html, el) as any, {
          x: IN(el.x),
          y: IN(el.y),
          w: IN(el.w),
          h: IN(el.h),
          fontFace: el.fontFamily,
          fontSize: Math.max(1, el.fontSize * 0.75),
          color: hex(el.color),
          align: el.align === 'justify' ? 'justify' : el.align,
          valign: el.anchor === 'middle' ? 'middle' : el.anchor === 'bottom' ? 'bottom' : 'top',
          margin: 0,
          lineSpacingMultiple: el.lineHeight,
          charSpacing: ((el.letterSpacing ?? 0) / 1000) * el.fontSize * 0.75,
          rotate: el.rotation || 0,
          transparency,
          bullet: el.list === 'bullet' ? true : el.list === 'number' ? { type: 'number' } : undefined,
          strike: el.strike ? 'sngStrike' : undefined,
          hyperlink: el.link ? { url: el.link } : undefined,
          fit: 'none',
          shadow: el.effect?.kind === 'shadow' ? { type: 'outer', color: hex(el.effect.color ?? '#000'), blur: (el.effect.blur ?? 20) / 5, offset: (el.effect.offset ?? 30) / 10, angle: el.effect.direction ?? 45, opacity: 0.4 } : undefined,
        } as any);
        continue;
      }
      if (nativeShape(el) && el.type === 'shape') {
        const kind = el.shape === 'circle' ? pres.ShapeType.ellipse : el.shape === 'rounded' ? pres.ShapeType.roundRect : pres.ShapeType.rect;
        slide.addShape(kind, {
          x: IN(el.x),
          y: IN(el.y),
          w: IN(el.w),
          h: IN(el.h),
          rotate: el.rotation || 0,
          fill: { color: hex((el.fill as any).color), transparency },
          line: el.stroke && el.stroke.width ? { color: hex(el.stroke.color), width: el.stroke.width * 0.75, dashType: el.stroke.style === 'dashed' ? 'dash' : el.stroke.style === 'dotted' ? 'sysDot' : 'solid' } : { type: 'none' },
          rectRadius: el.shape === 'rounded' ? Math.min(0.5, (el.radius ?? 16) / Math.min(el.w, el.h)) : undefined,
          hyperlink: el.link ? { url: el.link } : undefined,
        } as any);
        continue;
      }
      const img = await elementImage(ctx, el, idx(p), Math.min(2, Math.max(1, o.scale)));
      if (!img) continue;
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      // Rotation is applied around the element centre, matching the unrotated render.
      const rx = el.rotation && el.type !== 'line' ? cx - img.w / 2 : img.x;
      const ry = el.rotation && el.type !== 'line' ? cy - img.h / 2 : img.y;
      slide.addImage({ data: img.data, x: IN(rx), y: IN(ry), w: IN(img.w), h: IN(img.h), rotate: el.type === 'line' ? 0 : el.rotation || 0, altText: el.alt, hyperlink: el.link ? { url: el.link } : undefined } as any);
    }
    if (p.notes) slide.addNotes(p.notes);
  }
  onProgress(0.97, 'Writing PowerPoint file');
  const blob = (await pres.write({ outputType: 'blob' })) as Blob;
  return { blob: new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), filename: `${base}.pptx` };
}

/** Load the export context for present / record flows that need page images. */
export async function pageImages(design: Design, scale: number, onProgress?: Progress): Promise<HTMLCanvasElement[]> {
  const ctx = await prepareExport(design);
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < ctx.pages.length; i++) {
    onProgress?.(i / ctx.pages.length, `Rendering page ${i + 1}`);
    out.push(await renderPageCanvasCtx(ctx, ctx.pages[i], { scale, pageIndex: i }));
  }
  return out;
}

export { inlineSrc };
