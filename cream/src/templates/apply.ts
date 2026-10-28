// Turning built templates into designs, or applying them onto the open design.
import type { Design, El, ImageEl, Page } from '../model/types';
import { clonePage, newDesign } from '../model/defaults';
import { mapElBox, type Box } from '../model/geometry';
import { useEditor } from '../store/editor';
import { build } from './build';
import { coverCrop } from './kit';
export { coverCrop };

export function buildTemplate(id: string) {
  const b = build(id);
  if (!b) throw new Error('Unknown template ' + id);
  return { title: b.title, preset: b.preset, category: b.category, width: b.width, height: b.height, pages: b.pages };
}

export function instantiateTemplate(id: string): Design {
  const b = buildTemplate(id);
  const d = newDesign({ preset: b.preset, title: b.title, pages: b.pages.map(clonePage) });
  return d;
}

/** Scale a page's elements from one size to another (stretch boxes; keep photos undistorted). */
export function fitPage(p: Page, from: Box, to: Box): Page {
  if (from.w === to.w && from.h === to.h) return p;
  for (const e of p.elements as El[]) {
    mapElBox(e, from, to);
    if (e.type === 'image') coverCrop(e);
  }
  return p;
}

export function applyTemplateToCurrentDesign(id: string, opts: { allPages?: boolean; pageIndex?: number } = {}) {
  const ed = useEditor.getState();
  const d = ed.design;
  if (!d) return;
  const b = build(id);
  if (!b) return;
  const src = opts.allPages ? b.pages : [b.pages[Math.min(b.pages.length - 1, opts.pageIndex ?? 0)]];
  const from = { x: 0, y: 0, w: b.width, h: b.height };
  const to = { x: 0, y: 0, w: d.width, h: d.height };
  const pages = src.map((p) => {
    const np = fitPage(clonePage(p), from, to);
    if (np.height) np.height = undefined;
    return np;
  });
  ed.update((draft) => {
    let idx = draft.pages.findIndex((p) => p.id === ed.pageId);
    if (idx < 0) idx = 0;
    const cur = draft.pages[idx];
    if (cur && cur.elements.length === 0 && !cur.backgroundImage) draft.pages.splice(idx, 1, ...(pages as Page[]));
    else draft.pages.splice(idx + 1, 0, ...(pages as Page[]));
  });
  useEditor.getState().setPage(pages[0].id);
  useEditor.getState().deselect();
}
