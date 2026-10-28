import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { produce, type Draft } from 'immer';
import type { Design, El, Page, LineEl } from '../model/types';
import { cloneElements, clonePage, newPage, uid } from '../model/defaults';
import { elBounds, mapElBox, moveEl, unionBox, type Box } from '../model/geometry';
import { useApp } from './app';

export type SidePanel =
  | 'design'
  | 'elements'
  | 'text'
  | 'brand'
  | 'uploads'
  | 'draw'
  | 'projects'
  | 'apps'
  | 'ai'
  | 'photos'
  | 'videos'
  | 'audio'
  | 'charts'
  | 'magic-media'
  | 'backgrounds'
  | 'styles'
  | 'logos'
  | 'stickies'
  | null;

export type RightPanel =
  | 'position'
  | 'animate'
  | 'text-effects'
  | 'edit-image'
  | 'color'
  | 'font'
  | 'comments'
  | 'versions'
  | 'chart-data'
  | 'table'
  | 'transition'
  | 'magic-write'
  | 'translate'
  | 'accessibility'
  | 'find-replace'
  | 'video'
  | 'audio'
  | 'notes'
  | 'timer'
  | 'insights'
  | null;

export type Modal =
  | 'share'
  | 'download'
  | 'resize'
  | 'shortcuts'
  | 'print'
  | 'present-record'
  | 'publish-website'
  | 'schedule'
  | 'embed'
  | 'brand-template'
  | 'request-approval'
  | 'settings'
  | 'add-guides'
  | 'link'
  | 'alt-text'
  | 'qr'
  | null;

export interface DrawTool {
  tool: 'pen' | 'marker' | 'highlighter' | 'glow' | 'eraser';
  color: string;
  width: number;
  opacity: number;
}

export interface Guide {
  axis: 'x' | 'y';
  pos: number;
  pageId: string;
}

interface EditorState {
  design: Design | null;
  pageId: string | null;
  selection: string[];
  editingId: string | null; // text being edited
  cropId: string | null;
  hoverId: string | null;
  zoom: number; // 1 = 100%
  fit: boolean; // zoom follows container
  view: 'scroll' | 'thumbs' | 'grid';
  side: SidePanel;
  right: RightPanel;
  modal: Modal;
  mode: 'edit' | 'comment' | 'view';
  draw: DrawTool | null;
  snapGuides: Guide[]; // live smart guides during drag
  past: Design[];
  future: Design[];
  saveState: 'saved' | 'saving';
  clipboard: El[] | null;
  styleClipboard: Partial<El> | null;
  playing: boolean;
  time: number; // playhead seconds (video/timeline)
  showTimeline: boolean;
  colorTarget: { kind: string; key?: string } | null; // what the colour panel edits
  ctxMenu: { x: number; y: number; elId?: string; pageId?: string } | null;
  audioId?: string;
  fitZoomValue?: number;
  txn: Design | null;
  coalesceKey: string | null;
  coalesceAt: number;

  open(id: string): void;
  close(): void;
  set(p: Partial<EditorState>): void;
  update(recipe: (d: Draft<Design>) => void, opts?: { history?: boolean; coalesce?: string }): void;
  begin(): void;
  commit(): void;
  cancel(): void;
  undo(): void;
  redo(): void;

  select(ids: string[], additive?: boolean): void;
  selectAll(): void;
  deselect(): void;
  setPage(id: string): void;

  addElements(els: El[], opts?: { select?: boolean; pageId?: string }): void;
  updateEl(id: string, patch: Partial<El> | ((e: Draft<El>) => void), opts?: { history?: boolean; coalesce?: string }): void;
  updateSelected(patch: Partial<El> | ((e: Draft<El>) => void), opts?: { history?: boolean; coalesce?: string }): void;
  deleteSelected(): void;
  duplicateSelected(): void;
  copy(): void;
  cut(): void;
  paste(): void;
  copyStyle(): void;
  pasteStyle(): void;
  group(): void;
  ungroup(): void;
  toggleLock(mode?: 'full' | 'position'): void;
  arrange(op: 'forward' | 'backward' | 'front' | 'back'): void;
  alignToPage(op: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void;
  alignSelection(op: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void;
  distribute(axis: 'h' | 'v'): void;
  tidyUp(): void;
  flip(axis: 'x' | 'y'): void;
  nudge(dx: number, dy: number): void;

  addPage(afterId?: string, page?: Page): void;
  duplicatePage(id: string): void;
  deletePage(id: string): void;
  movePage(id: string, dir: -1 | 1): void;
  reorderPage(id: string, toIndex: number): void;
  patchPage(id: string, patch: Partial<Page>): void;
}

export const findEl = (d: Design | Draft<Design>, id: string): { page: Page; el: El; index: number } | null => {
  for (const page of d.pages) {
    const index = page.elements.findIndex((e) => e.id === id);
    if (index >= 0) return { page: page as Page, el: page.elements[index] as El, index };
  }
  return null;
};

export const currentPage = (s: Pick<EditorState, 'design' | 'pageId'>): Page | null =>
  s.design?.pages.find((p) => p.id === s.pageId) ?? s.design?.pages[0] ?? null;

export const selectedEls = (s: Pick<EditorState, 'design' | 'selection'>): El[] => {
  if (!s.design) return [];
  const out: El[] = [];
  for (const id of s.selection) {
    const f = findEl(s.design, id);
    if (f) out.push(f.el);
  }
  return out;
};

/** Expand ids to whole groups (Canva selects the group when you click a member). */
export function expandGroups(d: Design, ids: string[]): string[] {
  const set = new Set(ids);
  for (const id of ids) {
    const f = findEl(d, id);
    if (f?.el.groupId) f.page.elements.filter((e) => e.groupId === f.el.groupId).forEach((e) => set.add(e.id));
  }
  return [...set];
}

let autosaveTimer = 0;
let versionTimer = 0;

export const useEditor = create<EditorState>((set, get) => {
  const commitDesign = (next: Design, prev: Design | null, history: boolean, coalesce?: string) => {
    const now = Date.now();
    const s = get();
    let past = s.past;
    if (history && prev) {
      const merge = coalesce && s.coalesceKey === coalesce && now - s.coalesceAt < 1200;
      if (!merge) past = [...past.slice(-99), prev];
    }
    next = { ...next, updatedAt: now };
    set({
      design: next,
      past,
      future: history ? [] : s.future,
      saveState: 'saving',
      coalesceKey: coalesce ?? null,
      coalesceAt: now,
    });
    clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
      const d = get().design;
      if (d) {
        useApp.getState().saveDesign(d, true);
        set({ saveState: 'saved' });
      }
    }, 300);
    clearTimeout(versionTimer);
    versionTimer = window.setTimeout(() => {
      const d = get().design;
      if (d) useApp.getState().saveVersion(d);
    }, 30000);
  };

  const mutate = (recipe: (d: Draft<Design>) => void, opts: { history?: boolean; coalesce?: string } = {}) => {
    const d = get().design;
    if (!d) return;
    const next = produce(d, recipe);
    if (next === d) return;
    const inTxn = !!get().txn;
    commitDesign(next, d, inTxn ? false : opts.history !== false, opts.coalesce);
  };

  const pageOf = (d: Draft<Design>) => d.pages.find((p) => p.id === get().pageId) ?? d.pages[0];

  return {
    design: null,
    pageId: null,
    selection: [],
    editingId: null,
    cropId: null,
    hoverId: null,
    zoom: 0.5,
    fit: true,
    view: 'scroll',
    side: 'design',
    right: null,
    modal: null,
    mode: 'edit',
    draw: null,
    snapGuides: [],
    past: [],
    future: [],
    saveState: 'saved',
    clipboard: null,
    styleClipboard: null,
    playing: false,
    time: 0,
    showTimeline: false,
    colorTarget: null,
    ctxMenu: null,
    txn: null,
    coalesceKey: null,
    coalesceAt: 0,

    open(id) {
      const d = useApp.getState().designs[id];
      if (!d) return;
      const opened = { ...d, openedAt: Date.now() };
      useApp.getState().patchDesign(id, { openedAt: opened.openedAt });
      set({
        design: opened,
        pageId: opened.pages[0]?.id ?? null,
        selection: [],
        editingId: null,
        cropId: null,
        past: [],
        future: [],
        fit: true,
        right: null,
        modal: null,
        mode: 'edit',
        draw: null,
        side: opened.category === 'whiteboard' ? 'elements' : 'design',
        showTimeline: opened.category === 'video',
        time: 0,
        playing: false,
      });
    },
    close() {
      const d = get().design;
      if (d) {
        useApp.getState().saveDesign(d, true);
        useApp.getState().saveVersion(d);
      }
      set({ design: null, selection: [], editingId: null });
    },
    set: (p) => set(p),
    update: (recipe, opts) => mutate(recipe, opts),
    begin() {
      if (!get().txn) set({ txn: get().design });
    },
    commit() {
      const { txn, design, past } = get();
      if (!txn) return;
      set({ txn: null });
      if (design && design !== txn) set({ past: [...past.slice(-99), txn], future: [], coalesceKey: null });
    },
    cancel() {
      const { txn } = get();
      if (txn) set({ design: txn, txn: null, snapGuides: [] });
    },
    undo() {
      const { past, future, design } = get();
      if (!past.length || !design) return;
      const prev = past[past.length - 1];
      set({ past: past.slice(0, -1), future: [design, ...future], editingId: null, coalesceKey: null });
      commitDesign(prev, null, false);
      const pageExists = prev.pages.some((p) => p.id === get().pageId);
      set({
        pageId: pageExists ? get().pageId : prev.pages[0]?.id,
        selection: get().selection.filter((id) => findEl(prev, id)),
      });
    },
    redo() {
      const { past, future, design } = get();
      if (!future.length || !design) return;
      const next = future[0];
      set({ past: [...past, design], future: future.slice(1), editingId: null, coalesceKey: null });
      commitDesign(next, null, false);
      const pageExists = next.pages.some((p) => p.id === get().pageId);
      set({ pageId: pageExists ? get().pageId : next.pages[0]?.id, selection: get().selection.filter((id) => findEl(next, id)) });
    },

    select(ids, additive) {
      const d = get().design;
      if (!d) return;
      let next = expandGroups(d, ids);
      if (additive) {
        const cur = new Set(get().selection);
        const allIn = next.every((id) => cur.has(id));
        next.forEach((id) => (allIn ? cur.delete(id) : cur.add(id)));
        next = [...cur];
      }
      const f = next.length ? findEl(d, next[0]) : null;
      set({ selection: next, editingId: null, cropId: null, pageId: f ? f.page.id : get().pageId, ctxMenu: null });
    },
    selectAll() {
      const p = currentPage(get());
      if (p) set({ selection: p.elements.filter((e) => !e.hidden).map((e) => e.id), editingId: null });
    },
    deselect() {
      set({ selection: [], editingId: null, cropId: null });
    },
    setPage(id) {
      if (get().pageId !== id) set({ pageId: id });
    },

    addElements(els, opts = {}) {
      const pid = opts.pageId ?? get().pageId;
      mutate((d) => {
        const p = d.pages.find((x) => x.id === pid) ?? d.pages[0];
        p.elements.push(...(els as Draft<El>[]));
      });
      if (opts.select !== false) set({ selection: els.map((e) => e.id), editingId: null });
    },
    updateEl(id, patch, opts) {
      mutate((d) => {
        const f = findEl(d, id);
        if (!f) return;
        const el = f.page.elements[f.index] as Draft<El>;
        if (typeof patch === 'function') patch(el);
        else Object.assign(el, patch);
      }, opts);
    },
    updateSelected(patch, opts) {
      const ids = get().selection;
      if (!ids.length) return;
      mutate((d) => {
        for (const id of ids) {
          const f = findEl(d, id);
          if (!f) continue;
          const el = f.page.elements[f.index] as Draft<El>;
          if (f.el.locked === 'full' && typeof patch !== 'function' && !('locked' in patch)) continue;
          if (typeof patch === 'function') patch(el);
          else Object.assign(el, patch);
        }
      }, opts);
    },
    deleteSelected() {
      const ids = new Set(get().selection);
      if (!ids.size) return;
      mutate((d) => {
        d.pages.forEach((p) => {
          p.elements = p.elements.filter((e) => !ids.has(e.id) || e.locked === 'full');
        });
      });
      set({ selection: [], editingId: null });
    },
    duplicateSelected() {
      const els = selectedEls(get());
      if (!els.length) return;
      const copies = cloneElements(els, 20, 20);
      const pid = findEl(get().design!, els[0].id)?.page.id;
      mutate((d) => {
        const p = d.pages.find((x) => x.id === pid)!;
        p.elements.push(...(copies as Draft<El>[]));
      });
      set({ selection: copies.map((c) => c.id) });
    },
    copy() {
      const els = selectedEls(get());
      if (!els.length) return;
      set({ clipboard: structuredClone(els) });
      try {
        localStorage.setItem('cream-clipboard', JSON.stringify(els));
      } catch {
        /* ignore */
      }
    },
    cut() {
      get().copy();
      get().deleteSelected();
    },
    paste() {
      let clip = get().clipboard;
      if (!clip) {
        try {
          clip = JSON.parse(localStorage.getItem('cream-clipboard') || 'null');
        } catch {
          clip = null;
        }
      }
      if (!clip?.length) return;
      const copies = cloneElements(clip, 20, 20);
      get().addElements(copies);
      set({ clipboard: cloneElements(clip, 20, 20) });
    },
    copyStyle() {
      const el = selectedEls(get())[0];
      if (!el) return;
      const keys = [
        'fontFamily', 'fontSize', 'fontWeight', 'italic', 'underline', 'strike', 'color', 'gradient', 'align', 'lineHeight', 'letterSpacing',
        'uppercase', 'effect', 'fill', 'stroke', 'opacity', 'filters', 'preset', 'presetIntensity', 'duotone', 'border', 'radius', 'shadow', 'anim', 'width', 'style', 'startCap', 'endCap',
      ];
      const style: Record<string, unknown> = {};
      for (const k of keys) if (k in el) style[k] = structuredClone((el as any)[k]);
      set({ styleClipboard: style as Partial<El> });
      useApp.getState().toast('Style copied — select an element and paste style (Ctrl+Alt+V)');
    },
    pasteStyle() {
      const st = get().styleClipboard;
      if (!st) return;
      get().updateSelected((e) => {
        for (const [k, v] of Object.entries(st)) {
          if (k in e || ['effect', 'filters', 'anim', 'shadow', 'border', 'stroke', 'gradient', 'duotone'].includes(k)) (e as any)[k] = structuredClone(v);
        }
      });
    },
    group() {
      const ids = get().selection;
      if (ids.length < 2) return;
      const g = uid();
      get().updateSelected({ groupId: g } as Partial<El>);
    },
    ungroup() {
      get().updateSelected((e) => {
        delete e.groupId;
      });
    },
    toggleLock(mode = 'full') {
      const els = selectedEls(get());
      const allLocked = els.every((e) => e.locked);
      get().updateSelected((e) => {
        if (allLocked) delete e.locked;
        else e.locked = mode;
      });
    },
    arrange(op) {
      const ids = new Set(get().selection);
      mutate((d) => {
        for (const p of d.pages) {
          const els = p.elements;
          if (!els.some((e) => ids.has(e.id))) continue;
          const sel = els.filter((e) => ids.has(e.id));
          const rest = els.filter((e) => !ids.has(e.id));
          if (op === 'front') p.elements = [...rest, ...sel];
          else if (op === 'back') p.elements = [...sel, ...rest];
          else if (op === 'forward') {
            for (let i = els.length - 2; i >= 0; i--) {
              if (ids.has(els[i].id) && !ids.has(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]];
            }
          } else {
            for (let i = 1; i < els.length; i++) {
              if (ids.has(els[i].id) && !ids.has(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]];
            }
          }
        }
      });
    },
    alignToPage(op) {
      const d = get().design;
      if (!d) return;
      const els = selectedEls(get());
      const box = unionBox(els.map(elBounds));
      if (!box) return;
      let dx = 0;
      let dy = 0;
      if (op === 'left') dx = -box.x;
      if (op === 'center') dx = d.width / 2 - (box.x + box.w / 2);
      if (op === 'right') dx = d.width - (box.x + box.w);
      if (op === 'top') dy = -box.y;
      if (op === 'middle') dy = d.height / 2 - (box.y + box.h / 2);
      if (op === 'bottom') dy = d.height - (box.y + box.h);
      get().updateSelected((e) => moveEl(e as El, dx, dy));
    },
    alignSelection(op) {
      const els = selectedEls(get());
      if (els.length < 2) return get().alignToPage(op);
      const box = unionBox(els.map(elBounds))!;
      get().updateSelected((e) => {
        const b = elBounds(e as El);
        let dx = 0;
        let dy = 0;
        if (op === 'left') dx = box.x - b.x;
        if (op === 'center') dx = box.x + box.w / 2 - (b.x + b.w / 2);
        if (op === 'right') dx = box.x + box.w - (b.x + b.w);
        if (op === 'top') dy = box.y - b.y;
        if (op === 'middle') dy = box.y + box.h / 2 - (b.y + b.h / 2);
        if (op === 'bottom') dy = box.y + box.h - (b.y + b.h);
        moveEl(e as El, dx, dy);
      });
    },
    distribute(axis) {
      const els = selectedEls(get());
      if (els.length < 3) return;
      const sorted = [...els].sort((a, b) => (axis === 'h' ? elBounds(a).x - elBounds(b).x : elBounds(a).y - elBounds(b).y));
      const boxes = sorted.map(elBounds);
      const total = boxes.reduce((s, b) => s + (axis === 'h' ? b.w : b.h), 0);
      const first = boxes[0];
      const last = boxes[boxes.length - 1];
      const span = axis === 'h' ? last.x + last.w - first.x : last.y + last.h - first.y;
      const gap = (span - total) / (boxes.length - 1);
      const targets = new Map<string, number>();
      let cur = axis === 'h' ? first.x : first.y;
      sorted.forEach((e, i) => {
        targets.set(e.id, cur - (axis === 'h' ? boxes[i].x : boxes[i].y));
        cur += (axis === 'h' ? boxes[i].w : boxes[i].h) + gap;
      });
      get().updateSelected((e) => {
        const delta = targets.get(e.id) ?? 0;
        moveEl(e as El, axis === 'h' ? delta : 0, axis === 'v' ? delta : 0);
      });
    },
    tidyUp() {
      const els = selectedEls(get());
      if (els.length < 2) return;
      const boxes = els.map(elBounds);
      const box = unionBox(boxes)!;
      const horizontal = box.w >= box.h;
      const sorted = els.map((e, i) => ({ e, b: boxes[i] })).sort((a, b) => (horizontal ? a.b.x - b.b.x : a.b.y - b.b.y));
      const gap = 16;
      let cur = horizontal ? box.x : box.y;
      const moves = new Map<string, [number, number]>();
      for (const { e, b } of sorted) {
        if (horizontal) moves.set(e.id, [cur - b.x, box.y + box.h / 2 - (b.y + b.h / 2)]);
        else moves.set(e.id, [box.x + box.w / 2 - (b.x + b.w / 2), cur - b.y]);
        cur += (horizontal ? b.w : b.h) + gap;
      }
      get().updateSelected((e) => {
        const m = moves.get(e.id);
        if (m) moveEl(e as El, m[0], m[1]);
      });
    },
    flip(axis) {
      get().updateSelected((e) => {
        if (e.type === 'line') {
          const l = e as LineEl;
          if (axis === 'x') [l.x1, l.x2] = [l.x2, l.x1];
          else [l.y1, l.y2] = [l.y2, l.y1];
          return;
        }
        if (axis === 'x') e.flipX = !e.flipX;
        else e.flipY = !e.flipY;
      });
    },
    nudge(dx, dy) {
      get().updateSelected(
        (e) => {
          if (e.locked) return;
          moveEl(e as El, dx, dy);
        },
        { coalesce: 'nudge' },
      );
    },

    addPage(afterId, page) {
      const np = page ?? newPage({ background: structuredClone(currentPage(get())?.background ?? { kind: 'solid', color: '#ffffff' }) });
      mutate((d) => {
        const i = afterId ? d.pages.findIndex((p) => p.id === afterId) : d.pages.length - 1;
        d.pages.splice(i + 1, 0, np as Draft<Page>);
      });
      set({ pageId: np.id, selection: [] });
    },
    duplicatePage(id) {
      const d = get().design;
      const p = d?.pages.find((x) => x.id === id);
      if (!p) return;
      const np = clonePage(p);
      mutate((dd) => {
        const i = dd.pages.findIndex((x) => x.id === id);
        dd.pages.splice(i + 1, 0, np as Draft<Page>);
      });
      set({ pageId: np.id, selection: [] });
    },
    deletePage(id) {
      const d = get().design;
      if (!d) return;
      if (d.pages.length === 1) {
        mutate((dd) => {
          dd.pages[0].elements = [];
        });
        return;
      }
      const i = d.pages.findIndex((p) => p.id === id);
      mutate((dd) => {
        dd.pages = dd.pages.filter((p) => p.id !== id);
      });
      const nd = get().design!;
      set({ pageId: nd.pages[Math.max(0, i - 1)].id, selection: [] });
    },
    movePage(id, dir) {
      const d = get().design;
      if (!d) return;
      const i = d.pages.findIndex((p) => p.id === id);
      get().reorderPage(id, i + dir);
    },
    reorderPage(id, toIndex) {
      mutate((d) => {
        const i = d.pages.findIndex((p) => p.id === id);
        const j = Math.max(0, Math.min(d.pages.length - 1, toIndex));
        if (i < 0 || i === j) return;
        const [p] = d.pages.splice(i, 1);
        d.pages.splice(j, 0, p);
      });
    },
    patchPage(id, patch) {
      mutate((d) => {
        const p = d.pages.find((x) => x.id === id);
        if (p) Object.assign(p, patch);
      });
    },
  };
});

/** Convenience for modules: run a mutation on the open design with history. */
export const editDesign = (recipe: (d: Draft<Design>) => void, opts?: { history?: boolean; coalesce?: string }) =>
  useEditor.getState().update(recipe, opts);

export const selectionBox = (): Box | null => unionBox(selectedEls(useEditor.getState()).map(elBounds));

export { mapElBox };

/** Hook: currently selected elements (shallow-compared so it doesn't loop). */
export function useSelected(): El[] {
  return useEditor(useShallow((s) => selectedEls(s)));
}

/** Hook: the active page object. */
export function useCurrentPage(): Page | null {
  return useEditor((s) => currentPage(s));
}

// Never lose the last edits when the tab is hidden or closed.
if (typeof window !== 'undefined') {
  const flush = () => {
    const d = useEditor.getState().design;
    if (d) useApp.getState().saveDesign(d, true);
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
