// Export pipeline: renders a design page off-screen with the shared PageView renderer and
// rasterises it with html-to-image. Every external resource (asset blobs, remote images,
// fonts) is inlined first so the output is self-contained and the canvas never gets tainted.

import { createElement, useLayoutEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { toCanvas, toSvg } from 'html-to-image';
import type { Design, El, ImageEl, Page, VideoEl } from '../model/types';
import { PageView } from '../render/PageView';
import { resolveSrc, srcToDataUrl } from '../store/blobs';
import { fontFaceCss, ensureFont, SYSTEM_FONTS } from '../assets/fonts';
import { moveEl } from '../model/geometry';

export interface RenderOpts {
  scale?: number;
  transparent?: boolean;
  pageIndex?: number;
  bleed?: number; // px of bleed to add around the page (print)
  animate?: boolean; // mount with entrance animations (for animated frame capture)
}

/* ---------------- resource inlining ---------------- */

const failed = new Set<string>();
const inlineCache = new Map<string, Promise<string>>();

function openverseId(src: string, landing?: string): string | null {
  const re = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  return (landing && re.exec(landing)?.[1]) || (src.includes('openverse') ? re.exec(src)?.[1] ?? null : null);
}

/** Convert any src to a data URL; tries fallbacks for remote images that block CORS. */
export function inlineSrc(src: string | undefined, landing?: string): Promise<string> {
  if (!src) return Promise.resolve('');
  if (src.startsWith('data:')) return Promise.resolve(src);
  const hit = inlineCache.get(src);
  if (hit) return hit;
  const p = (async () => {
    try {
      return await srcToDataUrl(src);
    } catch {
      /* fall through */
    }
    if (/^https?:/.test(src)) {
      const ov = openverseId(src, landing);
      const fallbacks = [
        ov ? `https://api.openverse.org/v1/images/${ov}/thumb/` : '',
        `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}`,
      ].filter(Boolean);
      for (const f of fallbacks) {
        try {
          return await srcToDataUrl(f);
        } catch {
          /* next */
        }
      }
    }
    failed.add(src);
    return '';
  })();
  inlineCache.set(src, p);
  return p;
}

/** Grab a still frame of a video (for raster exports). */
async function videoFrame(el: VideoEl): Promise<string> {
  try {
    const url = await resolveSrc(el.src);
    if (!url) throw new Error('no src');
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    v.preload = 'auto';
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error('video'));
      setTimeout(() => rej(new Error('timeout')), 8000);
    });
    v.currentTime = Math.min((el.trimStart || 0) + 0.1, Math.max(0, (v.duration || 1) - 0.05));
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      setTimeout(res, 3000);
    });
    const c = document.createElement('canvas');
    c.width = v.videoWidth || el.naturalW || 640;
    c.height = v.videoHeight || el.naturalH || 360;
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.9);
  } catch {
    return el.poster ? inlineSrc(el.poster) : '';
  }
}

async function inlineElement(el: El): Promise<El> {
  switch (el.type) {
    case 'image': {
      const src = await inlineSrc(el.src, el.credit?.landingUrl);
      return { ...el, src };
    }
    case 'shape':
      if (el.fill.kind === 'image') return { ...el, fill: { ...el.fill, src: await inlineSrc(el.fill.src) } };
      return el;
    case 'video': {
      const src = await videoFrame(el);
      const img: ImageEl = {
        id: el.id,
        type: 'image',
        x: el.x,
        y: el.y,
        w: el.w,
        h: el.h,
        rotation: el.rotation,
        opacity: el.opacity,
        flipX: el.flipX,
        flipY: el.flipY,
        src,
        naturalW: el.naturalW || el.w,
        naturalH: el.naturalH || el.h,
        crop: el.crop,
        filters: el.filters,
        radius: el.radius,
        anim: el.anim,
      };
      return img;
    }
    case 'frame':
      if (el.media.src) {
        if (el.media.kind === 'video') {
          const src = await videoFrame({ src: el.media.src, trimStart: 0, naturalW: el.media.naturalW, naturalH: el.media.naturalH } as VideoEl);
          return { ...el, media: { ...el.media, src, kind: 'image' } };
        }
        return { ...el, media: { ...el.media, src: await inlineSrc(el.media.src, el.media.credit?.landingUrl) } };
      }
      return el;
    case 'grid':
      return {
        ...el,
        cells: await Promise.all(
          el.cells.map(async (c) => {
            if (!c.src) return c;
            if (c.kind === 'video') {
              const src = await videoFrame({ src: c.src, trimStart: 0, naturalW: c.naturalW, naturalH: c.naturalH } as VideoEl);
              return { ...c, src, kind: 'image' as const };
            }
            return { ...c, src: await inlineSrc(c.src, c.credit?.landingUrl) };
          }),
        ),
      };
    case 'embed':
      return el.poster ? { ...el, poster: await inlineSrc(el.poster) } : el;
    case 'svg': {
      // Inline <image href="http..."> inside SVG graphics.
      const urls = [...el.svg.matchAll(/(?:xlink:)?href="(https?:[^"]+)"/g)].map((m) => m[1]);
      if (!urls.length) return el;
      let svg = el.svg;
      for (const u of urls) {
        const d = await inlineSrc(u);
        svg = svg.split(u).join(d);
      }
      return { ...el, svg };
    }
    default:
      return el;
  }
}

export async function inlinePage(page: Page): Promise<Page> {
  const out: Page = { ...page, elements: await Promise.all(page.elements.map(inlineElement)) };
  if (page.background.kind === 'image') out.background = { ...page.background, src: await inlineSrc(page.background.src) };
  if (page.backgroundImage) out.backgroundImage = { ...page.backgroundImage, src: await inlineSrc(page.backgroundImage.src, page.backgroundImage.credit?.landingUrl) };
  return out;
}

/* ---------------- fonts ---------------- */

const fontCssCache = new Map<string, Promise<string>>();

export function collectFonts(pages: Page[]): { family: string; weight: number; italic: boolean }[] {
  const set = new Map<string, { family: string; weight: number; italic: boolean }>();
  const add = (family: string | undefined, weight = 400, italic = false) => {
    if (!family) return;
    family = family.replace(/['"]/g, '').split(',')[0].trim();
    if (!family || SYSTEM_FONTS.includes(family) || /^(sans-serif|serif|monospace|system-ui|inherit)$/i.test(family)) return;
    const k = `${family}|${weight}|${italic}`;
    if (!set.has(k)) set.set(k, { family, weight, italic });
  };
  const scanHtml = (html: string | undefined, base: string, weight: number, italic: boolean) => {
    if (!html) return;
    if (/<(b|strong)\b|font-weight:\s*(bold|[6-9]00)/i.test(html)) add(base, 700, italic);
    if (/<(i|em)\b|font-style:\s*italic/i.test(html)) add(base, weight, true);
    for (const m of html.matchAll(/font-family:\s*([^;"]+)/gi)) {
      add(m[1], weight, italic);
      add(m[1], 700, italic);
    }
  };
  add('Inter', 400);
  add('Inter', 700);
  for (const p of pages)
    for (const el of p.elements) {
      if (el.type === 'text') {
        add(el.fontFamily, el.fontWeight, el.italic);
        scanHtml(el.html, el.fontFamily, el.fontWeight, el.italic);
      } else if (el.type === 'shape' && el.html) {
        add(el.fontFamily ?? 'Inter', el.fontWeight ?? 400, !!el.italic);
        scanHtml(el.html, el.fontFamily ?? 'Inter', el.fontWeight ?? 400, !!el.italic);
      } else if (el.type === 'table') {
        add(el.fontFamily, 400);
        add(el.fontFamily, 700);
        el.cells.flat().forEach((c) => scanHtml(c.html, el.fontFamily, 400, false));
      } else if (el.type === 'chart') {
        add(el.options.fontFamily, 400);
        add(el.options.fontFamily, 800);
      } else if (el.type === 'frame' && el.frameShape === 'letter') add('Archivo Black', 400);
    }
  return [...set.values()];
}

export async function fontEmbedCss(pages: Page[]): Promise<string> {
  const fonts = collectFonts(pages);
  const parts = await Promise.all(
    fonts.map((f) => {
      const k = `${f.family}|${f.weight}|${f.italic}`;
      let p = fontCssCache.get(k);
      if (!p) {
        p = fontFaceCss(f.family, f.weight, f.italic);
        fontCssCache.set(k, p);
      }
      ensureFont(f.family, f.weight, f.italic);
      return p;
    }),
  );
  return parts.filter(Boolean).join('\n');
}

/* ---------------- prepared export context ---------------- */

export interface ExportContext {
  design: Design;
  pages: Page[]; // inlined pages (same order as design.pages)
  fontCss: string;
}

export async function prepareExport(design: Design, pageIds?: string[]): Promise<ExportContext> {
  const src = pageIds ? design.pages.filter((p) => pageIds.includes(p.id)) : design.pages;
  const [pages, fontCss] = await Promise.all([Promise.all(src.map(inlinePage)), fontEmbedCss(src)]);
  return { design, pages, fontCss };
}

function Ready({ onReady, children }: { onReady: () => void; children?: ReactNode }) {
  useLayoutEffect(() => {
    onReady();
  }, []);
  return children as any;
}

async function waitForMedia(root: HTMLElement) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : img.decode().catch(
            () =>
              new Promise<void>((res) => {
                img.onload = img.onerror = () => res();
                setTimeout(res, 4000);
              }),
          ),
    ),
  );
  try {
    await (document as any).fonts?.ready;
  } catch {
    /* ignore */
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/** Prepare the page for rendering (transparency, bleed). Pure: returns a new page/design pair. */
function adjust(design: Design, page: Page, opts: RenderOpts) {
  let d: Pick<Design, 'width' | 'height'> = { width: design.width, height: page.height ?? design.height };
  let p: Page = page;
  if (opts.transparent) p = { ...p, background: { kind: 'solid', color: 'transparent' }, backgroundImage: undefined };
  const b = opts.bleed ?? 0;
  if (b > 0) {
    d = { width: d.width + 2 * b, height: d.height + 2 * b };
    p = {
      ...p,
      height: undefined,
      elements: p.elements.map((e) => {
        const c = structuredClone(e);
        moveEl(c, b, b);
        return c;
      }),
    };
  }
  return { d, p };
}

/** Mount a page off-screen, run `fn` on its root node, then unmount. */
export async function withMountedPage<T>(ctx: ExportContext, page: Page, opts: RenderOpts, fn: (node: HTMLElement, size: { width: number; height: number }) => Promise<T>): Promise<T> {
  const { d, p } = adjust(ctx.design, page, opts);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-${d.width + 20000}px;top:0;width:${d.width}px;height:${d.height}px;pointer-events:none;z-index:-1;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await new Promise<void>((resolve) => {
      root.render(
        createElement(
          Ready,
          { onReady: resolve },
          createElement(PageView, {
            design: d,
            page: p,
            scale: 1,
            ctx: { mode: 'export', pageIndex: opts.pageIndex ?? 0, pageCount: ctx.design.pages.length },
            animate: !!opts.animate,
          }),
        ),
      );
    });
    const node = host.firstElementChild as HTMLElement;
    await waitForMedia(host);
    return await fn(node, d);
  } finally {
    root.unmount();
    host.remove();
  }
}

const MAX_CANVAS = 16000;

export function clampScale(w: number, h: number, scale: number) {
  const s = Math.min(scale, MAX_CANVAS / w, MAX_CANVAS / h, Math.sqrt(250_000_000 / (w * h)));
  return Math.max(0.05, s);
}

export async function renderPageCanvasCtx(ctx: ExportContext, page: Page, opts: RenderOpts = {}): Promise<HTMLCanvasElement> {
  return withMountedPage(ctx, page, opts, async (node, size) => {
    const scale = clampScale(size.width, size.height, opts.scale ?? 1);
    return toCanvas(node, {
      pixelRatio: scale,
      width: size.width,
      height: size.height,
      fontEmbedCSS: ctx.fontCss,
      backgroundColor: opts.transparent ? undefined : '#ffffff',
      skipAutoScale: true,
      cacheBust: false,
    });
  });
}

export async function renderPageSvgCtx(ctx: ExportContext, page: Page, opts: RenderOpts = {}): Promise<string> {
  return withMountedPage(ctx, page, opts, async (node, size) => {
    const dataUrl = await toSvg(node, { width: size.width, height: size.height, fontEmbedCSS: ctx.fontCss, backgroundColor: opts.transparent ? undefined : '#ffffff' });
    return decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
  });
}

/** One-shot convenience API used by other modules. */
export async function renderPageToCanvas(design: Design, page: Page, opts: RenderOpts = {}): Promise<HTMLCanvasElement> {
  const ctx = await prepareExport(design, [page.id]);
  return renderPageCanvasCtx(ctx, ctx.pages[0], { pageIndex: design.pages.findIndex((p) => p.id === page.id), ...opts });
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Canvas export failed'))), type, quality));
}

export async function renderPageToBlob(design: Design, page: Page, type: 'image/png' | 'image/jpeg' = 'image/png', opts: RenderOpts & { quality?: number } = {}) {
  const c = await renderPageToCanvas(design, page, opts);
  return canvasToBlob(c, type, opts.quality);
}

/** Small thumbnail data URL of the first page (used by share previews / publish). */
export async function thumbnailDataUrl(design: Design, maxW = 480): Promise<string> {
  const p = design.pages[0];
  const c = await renderPageToCanvas(design, p, { scale: Math.min(1, maxW / design.width) });
  return c.toDataURL('image/jpeg', 0.8);
}

export const exportFailures = () => [...failed];

const ANIM_PROPS = ['opacity', 'transform', 'filter', 'clipPath', 'letterSpacing', 'background'] as const;

/**
 * Freeze every animated element at `t` seconds: seek the CSS animations, read the computed
 * values and bake them into inline styles with `animation: none` (html-to-image copies
 * computed styles, so a live animation would otherwise restart inside the snapshot).
 */
function freezeAt(node: HTMLElement, t: number, originals: Map<HTMLElement, string>) {
  if (!originals.size) node.querySelectorAll<HTMLElement>('[style*="animation"]').forEach((el) => el.style.animation && originals.set(el, el.style.animation));
  for (const [el, anim] of originals) {
    for (const k of ANIM_PROPS) (el.style as any)[k] = '';
    el.style.animation = anim;
  }
  for (const a of node.getAnimations({ subtree: true })) {
    a.pause();
    a.currentTime = t * 1000;
  }
  const vals = [...originals.keys()].map((el) => {
    const cs = getComputedStyle(el);
    return [el, ANIM_PROPS.map((k) => (cs as any)[k] as string)] as const;
  });
  for (const [el, v] of vals) {
    el.style.animation = 'none';
    ANIM_PROPS.forEach((k, i) => {
      if (k === 'background' && !originals.get(el)?.includes('block')) return;
      (el.style as any)[k] = v[i];
    });
  }
}

/**
 * Capture a page at several moments of its entrance animations. Mounts once and snapshots
 * each time point (computed styles reflect the paused animation state).
 */
export async function renderPageAnimFrames(ctx: ExportContext, page: Page, times: number[], opts: RenderOpts = {}): Promise<HTMLCanvasElement[]> {
  return withMountedPage(ctx, page, { ...opts, animate: true }, async (node, size) => {
    const scale = clampScale(size.width, size.height, opts.scale ?? 1);
    const out: HTMLCanvasElement[] = [];
    const originals = new Map<HTMLElement, string>();
    for (const t of times) {
      freezeAt(node, t, originals);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      out.push(
        await toCanvas(node, {
          pixelRatio: scale,
          width: size.width,
          height: size.height,
          fontEmbedCSS: ctx.fontCss,
          backgroundColor: opts.transparent ? undefined : '#ffffff',
          skipAutoScale: true,
        }),
      );
    }
    return out;
  });
}
