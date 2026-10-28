import type { Design, El, Page, TextEl } from '../model/types';
import { mapElBox, elBounds } from '../model/geometry';
import { uid, cloneElements, makeText, newDesign, newPage, htmlToText, escapeHtml } from '../model/defaults';

/**
 * Re-lay out pages for a new canvas size ("Magic Switch"):
 * - full-bleed elements (≥ 90% of the page) stretch/cover the new page,
 * - everything else keeps its relative position but scales uniformly so text stays readable.
 */
export function resizePages(pages: Page[], fromW: number, fromH: number, toW: number, toH: number): Page[] {
  const sx = toW / fromW;
  const sy = toH / fromH;
  const s = Math.min(sx, sy);
  // Gentle boost so text doesn't shrink to nothing on drastic aspect changes.
  const textScale = Math.min(Math.max(s, Math.sqrt(sx * sy) * 0.85), Math.max(sx, sy));
  return pages.map((p) => {
    const ph = p.height ?? fromH;
    const els = cloneElements(p.elements).map((e) => {
      const b = elBounds(e);
      const fullBleed = b.w >= fromW * 0.9 && b.h >= ph * 0.9;
      if (fullBleed) {
        if (e.type === 'image' || e.type === 'video' || e.type === 'frame' || e.type === 'grid' || e.type === 'svg') {
          // Cover the new page keeping aspect ratio.
          const k = Math.max(toW / e.w, toH / e.h);
          const to = { x: (toW - e.w * k) / 2, y: (toH - e.h * k) / 2, w: e.w * k, h: e.h * k };
          mapElBox(e, { x: e.x, y: e.y, w: e.w, h: e.h }, to);
        } else mapElBox(e, { x: 0, y: 0, w: fromW, h: ph }, { x: 0, y: 0, w: toW, h: toH });
        return e;
      }
      const k = e.type === 'text' ? textScale : s;
      const cx = (b.x + b.w / 2) * sx;
      const cy = (b.y + b.h / 2) * sy;
      let w = e.w * k;
      let h = e.h * k;
      if (e.type === 'text') w = Math.min(w, toW * 0.92);
      const to = { x: cx - w / 2, y: cy - h / 2, w, h };
      mapElBox(e, { x: e.x, y: e.y, w: e.w, h: e.h }, to);
      // Keep inside the page.
      if (e.type !== 'line') {
        const m = Math.min(toW, toH) * 0.04;
        if (e.w <= toW - 2 * m) e.x = Math.max(m, Math.min(e.x, toW - m - e.w));
        else e.x = (toW - e.w) / 2;
        if (e.h <= toH - 2 * m) e.y = Math.max(m, Math.min(e.y, toH - m - e.h));
      }
      return e;
    });
    return { ...structuredClone(p), id: uid(), height: undefined, elements: els };
  });
}

export function resizedCopy(d: Design, w: number, h: number, presetId: string, name: string): Design {
  const now = Date.now();
  return {
    ...structuredClone(d),
    id: uid(),
    title: `${d.title} – ${name}`,
    preset: presetId,
    width: Math.round(w),
    height: Math.round(h),
    pages: resizePages(d.pages, d.width, d.height, w, h),
    comments: [],
    createdAt: now,
    updatedAt: now,
    openedAt: now,
    starred: false,
    trashedAt: null,
    isBrandTemplate: false,
    approval: undefined,
  };
}

/** Summarise a design's text content into a Doc design. */
export function designToDoc(d: Design): Design {
  const doc = newDesign({ preset: 'doc', title: `${d.title} (Doc)`, category: 'doc' });
  const W = doc.width;
  const H = doc.height;
  const M = 72;
  const pages: Page[] = [];
  let page = newPage();
  let y = M;
  const push = (el: El) => {
    if (y + el.h > H - M && page.elements.length) {
      pages.push(page);
      page = newPage();
      y = M;
      el.y = y;
    }
    page.elements.push(el);
    y += el.h + 14;
  };
  const title = makeText(d.title, M, y, W - 2 * M, { fontSize: 40, fontWeight: 700, lineHeight: 1.2 }, 'heading');
  title.h = Math.ceil(40 * 1.2 * Math.max(1, Math.ceil(d.title.length / 30)));
  push(title);
  d.pages.forEach((p, i) => {
    const texts = p.elements
      .filter((e): e is TextEl => e.type === 'text')
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((t) => ({ t, txt: htmlToText(t.html).trim() }))
      .filter((x) => x.txt);
    if (!texts.length && !p.notes.trim()) return;
    const head = p.title || texts.sort((a, b) => b.t.fontSize - a.t.fontSize)[0]?.txt.split('\n')[0] || `Page ${i + 1}`;
    const h = makeText(`${i + 1}. ${head}`, M, y, W - 2 * M, { fontSize: 24, fontWeight: 700, color: '#2b2140', lineHeight: 1.3 }, 'subheading');
    h.h = Math.ceil(24 * 1.3 * Math.max(1, Math.ceil(head.length / 50)));
    push(h);
    for (const { txt } of texts) {
      if (txt === head) continue;
      const lines = txt.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 80)), 0);
      const body = makeText(txt, M, y, W - 2 * M, { fontSize: 15, lineHeight: 1.5, color: '#333333' }, 'body');
      body.html = escapeHtml(txt).replace(/\n/g, '<br>');
      body.h = Math.ceil(15 * 1.5 * lines);
      push(body);
    }
    if (p.notes.trim()) {
      const n = makeText('Notes: ' + p.notes.trim(), M, y, W - 2 * M, { fontSize: 13, italic: true, lineHeight: 1.5, color: '#6b6680' }, 'body');
      n.h = Math.ceil(13 * 1.5 * Math.max(1, Math.ceil(p.notes.length / 90)));
      push(n);
    }
  });
  pages.push(page);
  doc.pages = pages;
  return doc;
}
