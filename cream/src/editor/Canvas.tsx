import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Draft } from 'immer';
import type { Design, El, FrameEl, GridEl, ImageEl, LineEl, Page, TableEl, TextEl } from '../model/types';
import { currentPage, findEl, selectedEls, useEditor } from '../store/editor';
import { PageView } from '../render/PageView';
import type { RenderCtx } from '../render/Elements';
import { elBounds, mapElBox, moveEl, rotatePoint, syncLineBox, unionBox, boxesIntersect, type Box } from '../model/geometry';
import { cloneElements, makeDraw } from '../model/defaults';
import { GRID_LAYOUTS } from '../model/defaults';
import { Icon } from '../ui/ui';
import { PageHeader } from './PageHeader';
import { dropOnCanvas } from './dnd';
import { useApp } from '../store/app';

const SNAP = 6; // screen px

type Drag =
  | { kind: 'move'; start: { x: number; y: number }; ids: string[]; orig: Map<string, El>; pageId: string; moved: boolean; box: Box }
  | { kind: 'resize'; handle: [number, number]; start: { x: number; y: number }; orig: El[]; box: Box; pageId: string; single: El | null; shift: boolean }
  | { kind: 'rotate'; center: { x: number; y: number }; orig: Map<string, El>; pageId: string }
  | { kind: 'marquee'; start: { x: number; y: number }; cur: { x: number; y: number }; pageId: string; additive: boolean }
  | { kind: 'line-end'; end: 1 | 2; id: string; pageId: string }
  | { kind: 'draw'; pageId: string; points: { x: number; y: number }[] }
  | { kind: 'crop-pan'; id: string; start: { x: number; y: number }; orig: El; cell?: number }
  | { kind: 'crop-resize'; id: string; handle: [number, number]; start: { x: number; y: number }; orig: ImageEl }
  | null;

export function Canvas() {
  const design = useEditor((s) => s.design)!;
  const zoomState = useEditor((s) => s.zoom);
  const fit = useEditor((s) => s.fit);
  const view = useEditor((s) => s.view);
  const pageId = useEditor((s) => s.pageId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const isBoard = design.category === 'whiteboard';
  const fitZoom = Math.max(0.02, Math.min((size.w - 96) / design.width, (size.h - 110) / design.height, isBoard ? 1 : 4));
  const zoom = fit ? fitZoom : zoomState;

  useEffect(() => {
    useEditor.setState({ fitZoomValue: fitZoom } as any);
  }, [fitZoom]);

  // Ctrl/Cmd + wheel zoom, pinch zoom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const s = useEditor.getState();
      const cur = s.fit ? fitZoom : s.zoom;
      const next = Math.max(0.05, Math.min(5, cur * Math.exp(-e.deltaY * 0.004)));
      useEditor.setState({ zoom: next, fit: false });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [fitZoom]);

  // Keep the active page in view when it changes from elsewhere (thumbnail click etc.).
  useEffect(() => {
    if (view !== 'scroll') return;
    const el = scrollRef.current?.querySelector(`[data-page-wrap="${pageId}"]`) as HTMLElement | null;
    const sc = scrollRef.current;
    if (!el || !sc) return;
    const r = el.getBoundingClientRect();
    const sr = sc.getBoundingClientRect();
    if (r.bottom < sr.top + 40 || r.top > sr.bottom - 40) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [pageId, view]);

  // Space + drag to pan (whiteboards and zoomed-in designs); right-drag pans too.
  const panRef = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const spaceDown = useRef(false);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input,textarea,[contenteditable]')) spaceDown.current = true;
    };
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  const pages = view === 'thumbs' ? design.pages.filter((p) => p.id === pageId).concat(design.pages.find((p) => p.id === pageId) ? [] : [design.pages[0]]) : design.pages;
  const contentW = Math.max(size.w, design.width * zoom + 96);

  return (
    <div
      ref={scrollRef}
      className="canvas-scroll"
      data-testid="canvas-scroll"
      tabIndex={-1}
      onPointerDown={(e) => {
        if (spaceDown.current || e.button === 1 || e.button === 2) {
          if (e.button === 2 && !(e.target as HTMLElement).closest('.page-frame') && false) return;
          if (spaceDown.current || e.button === 1) {
            panRef.current = { x: e.clientX, y: e.clientY, sl: scrollRef.current!.scrollLeft, st: scrollRef.current!.scrollTop };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            e.preventDefault();
            return;
          }
        }
        if (!(e.target as HTMLElement).closest('.page-frame, .page-head, .ctx-keep')) {
          const s = useEditor.getState();
          if (s.selection.length || s.editingId) s.deselect();
        }
      }}
      onPointerMove={(e) => {
        const p = panRef.current;
        if (!p) return;
        scrollRef.current!.scrollLeft = p.sl - (e.clientX - p.x);
        scrollRef.current!.scrollTop = p.st - (e.clientY - p.y);
      }}
      onPointerUp={() => (panRef.current = null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const frame = (e.target as HTMLElement).closest('.page-frame') as HTMLElement | null;
        const pid = frame?.dataset.pageId ?? useEditor.getState().pageId!;
        const r = frame?.getBoundingClientRect();
        const pt = r ? { x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom } : undefined;
        const target = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
        dropOnCanvas(e.dataTransfer, pid, pt, target?.dataset.elId, target ? (e.target as HTMLElement).closest('[data-grid-cell]')?.getAttribute('data-grid-cell') : null);
      }}
    >
      {view === 'grid' ? (
        <GridView zoomFit={fitZoom} />
      ) : (
        <div className="canvas-inner" style={{ width: contentW }}>
          {pages.map((p) => (
            <PageSlot key={p.id} design={design} page={p} zoom={zoom} index={design.pages.indexOf(p)} />
          ))}
          {view === 'scroll' && design.category !== 'whiteboard' && (
            <button className="add-page-btn" style={{ width: design.width * zoom }} onClick={() => useEditor.getState().addPage()} data-testid="add-page">
              + Add page
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- One page with its interaction overlay ---------------- */

function PageSlot({ design, page, zoom, index }: { design: Design; page: Page; zoom: number; index: number }) {
  const pageId = useEditor((s) => s.pageId);
  const editingId = useEditor((s) => s.editingId);
  const cropId = useEditor((s) => s.cropId);
  const playing = useEditor((s) => s.playing);
  const active = pageId === page.id;
  const ctx: RenderCtx = useMemo(
    () => ({
      mode: 'edit',
      pageIndex: index,
      pageCount: design.pages.length,
      editingId,
      cropId,
      playing: playing && active,
      onTextInput: onTextInput,
      onCellInput: onCellInput,
    }),
    [index, design.pages.length, editingId, cropId, playing, active],
  );
  return (
    <div className="page-wrap" data-page-wrap={page.id} style={{ width: design.width * zoom }}>
      <PageHeader page={page} index={index} />
      <div
        className={'page-frame' + (active ? ' active' : '')}
        data-page-id={page.id}
        data-testid={`page-${index}`}
        style={{ width: design.width * zoom, height: (page.height ?? design.height) * zoom, opacity: page.hidden ? 0.45 : 1 }}
      >
        <Interaction design={design} page={page} zoom={zoom}>
          <PageView design={design} page={page} scale={zoom} ctx={ctx} />
        </Interaction>
        {design.settings?.margins && <Margins design={design} zoom={zoom} />}
        {design.settings?.bleed && <div style={{ position: 'absolute', inset: -0.125 * 96 * zoom, border: '1px dashed #e5484d', pointerEvents: 'none' }} />}
        {page.locked && (
          <div style={{ position: 'absolute', right: 8, top: 8, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 6, padding: '2px 6px', fontSize: 11, pointerEvents: 'none' }}>
            <Icon name="Lock" size={12} /> Locked
          </div>
        )}
      </div>
    </div>
  );
}

function Margins({ design, zoom }: { design: Design; zoom: number }) {
  const m = Math.min(design.width, design.height) * 0.05 * zoom;
  return <div style={{ position: 'absolute', inset: m, border: '1px dashed rgba(139,61,255,.6)', pointerEvents: 'none' }} />;
}

function onTextInput(id: string, html: string, h: number) {
  const s = useEditor.getState();
  const f = s.design && findEl(s.design, id);
  if (!f) return;
  const el = f.el;
  if ((el as any).html === html) {
    if (el.type === 'text' && el.autoHeight !== false && Math.abs(el.h - h) > 1) s.updateEl(id, { h } as Partial<El>, { history: false });
    return;
  }
  s.updateEl(
    id,
    (e) => {
      (e as any).html = html;
      if (e.type === 'text' && (e as TextEl).autoHeight !== false && h > 0) e.h = h;
    },
    { coalesce: 'type-' + id },
  );
}

function onCellInput(id: string, r: number, c: number, html: string) {
  useEditor.getState().updateEl(
    id,
    (e) => {
      const t = e as Draft<TableEl>;
      if (t.cells[r]?.[c]) t.cells[r][c].html = html;
    },
    { coalesce: `cell-${id}-${r}-${c}` },
  );
}

/* ---------------- Interaction overlay ---------------- */

function Interaction({ design, page, zoom, children }: { design: Design; page: Page; zoom: number; children: React.ReactNode }) {
  const selection = useEditor((s) => s.selection);
  const editingId = useEditor((s) => s.editingId);
  const cropId = useEditor((s) => s.cropId);
  const hoverId = useEditor((s) => s.hoverId);
  const snapGuides = useEditor((s) => s.snapGuides);
  const draw = useEditor((s) => s.draw);
  const mode = useEditor((s) => s.mode);
  const [drag, setDrag] = useState<Drag>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag>(null);
  dragRef.current = drag;

  const pageEls = page.elements;
  const sel = pageEls.filter((e) => selection.includes(e.id));
  const toPage = useCallback(
    (cx: number, cy: number) => {
      const r = ref.current!.getBoundingClientRect();
      return { x: (cx - r.left) / zoom, y: (cy - r.top) / zoom };
    },
    [zoom],
  );

  // Delete empty text boxes when editing ends (Canva behaviour).
  const prevEditing = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevEditing.current;
    prevEditing.current = editingId;
    if (prev && prev !== editingId) {
      const s = useEditor.getState();
      const f = s.design && findEl(s.design, prev);
      if (f && f.el.type === 'text' && !f.el.html.replace(/<br\s*\/?>|&nbsp;|<\/?div>|\s/gi, '')) {
        s.update((d) => {
          d.pages.forEach((p) => (p.elements = p.elements.filter((e) => e.id !== prev)));
        }, { history: false });
      }
    }
  }, [editingId]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return; // context menu handled separately
    if (e.button !== 0) return;
    const s = useEditor.getState();
    if (s.mode === 'view') return;
    s.setPage(page.id);
    const pt = toPage(e.clientX, e.clientY);
    const target = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
    const hitId = target?.dataset.elId ?? null;
    (ref.current as HTMLElement).setPointerCapture(e.pointerId);

    if (s.mode === 'comment') {
      window.dispatchEvent(new CustomEvent('cream:add-comment', { detail: { pageId: page.id, x: pt.x, y: pt.y, elId: hitId ?? undefined } }));
      useEditor.setState({ right: 'comments' });
      return;
    }

    if (s.draw) {
      if (s.draw.tool === 'eraser') {
        if (hitId) {
          const f = findEl(s.design!, hitId);
          if (f?.el.type === 'draw') s.update((d) => d.pages.forEach((p) => (p.elements = p.elements.filter((x) => x.id !== hitId))));
        }
        setDrag({ kind: 'draw', pageId: page.id, points: [] });
        return;
      }
      setDrag({ kind: 'draw', pageId: page.id, points: [pt] });
      return;
    }

    if (page.locked) {
      s.deselect();
      return;
    }

    // Crop / reposition mode
    if (s.cropId) {
      const f = findEl(s.design!, s.cropId);
      if (f && (hitId === s.cropId || (e.target as HTMLElement).closest('.crop-zone'))) {
        const cellAttr = (e.target as HTMLElement).closest('[data-grid-cell]')?.getAttribute('data-grid-cell');
        s.begin();
        setDrag({ kind: 'crop-pan', id: s.cropId, start: pt, orig: structuredClone(f.el), cell: cellAttr != null ? Number(cellAttr) : undefined });
        return;
      }
      useEditor.setState({ cropId: null });
      s.commit();
    }

    if (hitId) {
      if (hitId === s.editingId) return; // clicks inside the text being edited
      const already = s.selection.includes(hitId);
      if (e.shiftKey) {
        s.select([hitId], true);
        return;
      }
      if (!already) s.select([hitId]);
      const ids = useEditor.getState().selection;
      const d = useEditor.getState().design!;
      const orig = new Map<string, El>();
      ids.forEach((id) => {
        const f = findEl(d, id);
        if (f) orig.set(id, structuredClone(f.el));
      });
      const box = unionBox([...orig.values()].map(elBounds))!;
      s.begin();
      setDrag({ kind: 'move', start: pt, ids, orig, pageId: page.id, moved: false, box });
      return;
    }
    // Empty page space
    if (!e.shiftKey) s.deselect();
    setDrag({ kind: 'marquee', start: pt, cur: pt, pageId: page.id, additive: e.shiftKey });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const s = useEditor.getState();
    const pt = toPage(e.clientX, e.clientY);
    if (!d) {
      const target = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
      const hid = target?.dataset.elId ?? null;
      if (hid !== s.hoverId) useEditor.setState({ hoverId: hid });
      return;
    }
    if (d.kind === 'move') {
      let dx = pt.x - d.start.x;
      let dy = pt.y - d.start.y;
      if (!d.moved && Math.hypot(dx, dy) * zoom < 3) return;
      if ([...d.orig.values()].some((o) => o.locked)) return;
      if (!d.moved && e.altKey) {
        // Alt-drag duplicates: leave copies at the original spot.
        const copies = cloneElements([...d.orig.values()]);
        s.update((dd) => {
          const p = dd.pages.find((x) => x.id === d.pageId)!;
          p.elements.push(...(copies as Draft<El>[]));
        });
      }
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const snapped = snapMove(design, page, d.box, dx, dy, new Set(d.ids), zoom);
      dx = snapped.dx;
      dy = snapped.dy;
      useEditor.setState({ snapGuides: snapped.guides.map((g) => ({ ...g, pageId: page.id })) });
      s.update(
        (dd) => {
          for (const [id, o] of d.orig) {
            const f = findEl(dd, id);
            if (!f) continue;
            const el = f.page.elements[f.index] as Draft<El>;
            el.x = o.x;
            el.y = o.y;
            if (el.type === 'line' && o.type === 'line') {
              el.x1 = o.x1;
              el.y1 = o.y1;
              el.x2 = o.x2;
              el.y2 = o.y2;
            }
            moveEl(el as El, dx, dy);
          }
        },
        { history: false },
      );
      setDrag({ ...d, moved: true });
      setBadge(null);
      return;
    }
    if (d.kind === 'resize') {
      doResize(d, pt, e.shiftKey, zoom, design, page, setBadge);
      return;
    }
    if (d.kind === 'rotate') {
      let ang = (Math.atan2(pt.y - d.center.y, pt.x - d.center.x) * 180) / Math.PI + 90;
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      else for (const a of [0, 90, 180, 270, 360, -90]) if (Math.abs(ang - a) < 3) ang = a;
      ang = ((ang % 360) + 360) % 360;
      if (ang > 180) ang -= 360;
      const single = d.orig.size === 1;
      s.update(
        (dd) => {
          for (const [id, o] of d.orig) {
            const f = findEl(dd, id);
            if (!f) continue;
            const el = f.page.elements[f.index] as Draft<El>;
            if (single) el.rotation = Math.round(ang);
            else {
              // rotate group around common centre
              const c0 = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
              const delta = ang - (d as any).startAng;
              const c1 = rotatePoint(c0.x, c0.y, d.center.x, d.center.y, delta);
              el.x = c1.x - o.w / 2;
              el.y = c1.y - o.h / 2;
              el.rotation = Math.round(o.rotation + delta);
            }
          }
        },
        { history: false },
      );
      setBadge(`${Math.round(ang)}°`);
      return;
    }
    if (d.kind === 'marquee') {
      setDrag({ ...d, cur: pt });
      return;
    }
    if (d.kind === 'line-end') {
      const f = findEl(s.design!, d.id);
      if (!f || f.el.type !== 'line') return;
      const l = f.el;
      let { x, y } = pt;
      const ox = d.end === 1 ? l.x2 : l.x1;
      const oy = d.end === 1 ? l.y2 : l.y1;
      if (e.shiftKey) {
        const ang = Math.round(Math.atan2(y - oy, x - ox) / (Math.PI / 4)) * (Math.PI / 4);
        const len = Math.hypot(x - ox, y - oy);
        x = ox + Math.cos(ang) * len;
        y = oy + Math.sin(ang) * len;
      }
      s.update(
        (dd) => {
          const ff = findEl(dd, d.id)!;
          const ln = ff.page.elements[ff.index] as Draft<LineEl>;
          if (d.end === 1) {
            ln.x1 = x;
            ln.y1 = y;
          } else {
            ln.x2 = x;
            ln.y2 = y;
          }
          syncLineBox(ln as LineEl);
        },
        { history: false },
      );
      setBadge(`${Math.round(Math.hypot(x - ox, y - oy))} px`);
      return;
    }
    if (d.kind === 'draw') {
      if (s.draw?.tool === 'eraser') {
        const target = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
        const hid = target?.dataset.elId;
        if (hid) {
          const f = findEl(s.design!, hid);
          if (f?.el.type === 'draw') s.update((dd) => dd.pages.forEach((p) => (p.elements = p.elements.filter((x) => x.id !== hid))));
        }
        return;
      }
      setDrag({ ...d, points: [...d.points, pt] });
      return;
    }
    if (d.kind === 'crop-pan') {
      cropPan(d, pt);
      return;
    }
    if (d.kind === 'crop-resize') {
      cropResize(d, pt);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const s = useEditor.getState();
    setDrag(null);
    setBadge(null);
    useEditor.setState({ snapGuides: [] });
    if (!d) return;
    if (d.kind === 'move') {
      if (!d.moved) {
        s.cancel();
        // second click on an already-selected text enters editing
        return;
      }
      // Drop onto another page?
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).classList?.contains('page-frame')) as HTMLElement | undefined;
      const target = under?.dataset.pageId;
      if (target && target !== d.pageId) {
        const tr = under!.getBoundingClientRect();
        const sr = ref.current!.getBoundingClientRect();
        const offX = (sr.left - tr.left) / zoom;
        const offY = (sr.top - tr.top) / zoom;
        s.update((dd) => {
          const from = dd.pages.find((p) => p.id === d.pageId)!;
          const to = dd.pages.find((p) => p.id === target)!;
          const moving = from.elements.filter((x) => d.ids.includes(x.id));
          from.elements = from.elements.filter((x) => !d.ids.includes(x.id));
          moving.forEach((m) => moveEl(m as El, offX, offY));
          to.elements.push(...moving);
        });
        s.setPage(target);
      }
      s.commit();
      return;
    }
    if (d.kind === 'resize' || d.kind === 'rotate' || d.kind === 'line-end' || d.kind === 'crop-pan' || d.kind === 'crop-resize') {
      if (d.kind !== 'crop-pan' && d.kind !== 'crop-resize') s.commit();
      return;
    }
    if (d.kind === 'marquee') {
      const box = { x: Math.min(d.start.x, d.cur.x), y: Math.min(d.start.y, d.cur.y), w: Math.abs(d.cur.x - d.start.x), h: Math.abs(d.cur.y - d.start.y) };
      if (box.w * zoom < 3 && box.h * zoom < 3) return;
      const hits = page.elements.filter((x) => !x.hidden && !x.locked && boxesIntersect(elBounds(x), box)).map((x) => x.id);
      if (hits.length) s.select(hits, d.additive);
      return;
    }
    if (d.kind === 'draw' && d.points.length > 1 && s.draw && s.draw.tool !== 'eraser') {
      const pts = d.points;
      const pad = s.draw.width;
      const minX = Math.min(...pts.map((p) => p.x)) - pad;
      const minY = Math.min(...pts.map((p) => p.y)) - pad;
      const maxX = Math.max(...pts.map((p) => p.x)) + pad;
      const maxY = Math.max(...pts.map((p) => p.y)) + pad;
      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);
      const shaped = shapeAssist(pts, e.timeStamp - (d as any).lastMoveAt);
      const dPath = shaped ?? smoothDraw(pts.map((p) => ({ x: p.x - minX, y: p.y - minY })));
      const finalD = shaped ? shaped.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (_m, a, b) => `${(+a - minX).toFixed(1)},${(+b - minY).toFixed(1)}`) : dPath;
      const op = s.draw.tool === 'highlighter' ? Math.min(0.5, s.draw.opacity) : s.draw.opacity;
      const el = makeDraw(minX, minY, w, h, [{ d: finalD, color: s.draw.color, width: s.draw.tool === 'marker' ? s.draw.width * 1.6 : s.draw.width, opacity: op, tool: s.draw.tool as any }]);
      s.update((dd) => {
        dd.pages.find((p) => p.id === d.pageId)!.elements.push(el as Draft<El>);
      });
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const s = useEditor.getState();
    if (s.mode !== 'edit' || s.draw) return;
    // Pointer capture retargets dblclick to the overlay, so hit-test by coordinates.
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset?.elId) as HTMLElement | undefined;
    const id = hit?.dataset.elId;
    if (!id) return;
    const f = findEl(s.design!, id);
    if (!f || f.el.locked === 'full') return;
    const t = f.el.type;
    if (t === 'text' || t === 'shape' || t === 'sticky' || t === 'table') {
      useEditor.setState({ selection: [id], editingId: id, cropId: null });
    } else if (t === 'image' || t === 'frame' || t === 'grid' || t === 'video') {
      if ((t === 'frame' && !(f.el as FrameEl).media.src) || (t === 'grid' && !(f.el as GridEl).cells.some((c) => c.src))) return;
      useEditor.setState({ selection: [id], cropId: id, editingId: null });
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const s = useEditor.getState();
    const target = (e.target as HTMLElement).closest('[data-el-id]') as HTMLElement | null;
    const id = target?.dataset.elId;
    if (id && !s.selection.includes(id)) s.select([id]);
    if (!id) s.deselect();
    s.setPage(page.id);
    useEditor.setState({ ctxMenu: { x: e.clientX, y: e.clientY, elId: id, pageId: page.id } });
  };

  // Hover box
  const hoverEl = hoverId && !selection.includes(hoverId) ? pageEls.find((x) => x.id === hoverId) : null;

  const startResize = (handle: [number, number]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (sel.some((x) => x.locked)) return;
    const s = useEditor.getState();
    (ref.current as HTMLElement).setPointerCapture(e.pointerId);
    s.begin();
    setDrag({
      kind: 'resize',
      handle,
      start: toPage(e.clientX, e.clientY),
      orig: sel.map((x) => structuredClone(x)),
      box: unionBox(sel.map(elBounds))!,
      pageId: page.id,
      single: sel.length === 1 ? structuredClone(sel[0]) : null,
      shift: e.shiftKey,
    });
  };
  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (sel.some((x) => x.locked)) return;
    const s = useEditor.getState();
    (ref.current as HTMLElement).setPointerCapture(e.pointerId);
    const box = unionBox(sel.map(elBounds))!;
    const center = sel.length === 1 ? { x: sel[0].x + sel[0].w / 2, y: sel[0].y + sel[0].h / 2 } : { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const pt = toPage(e.clientX, e.clientY);
    const startAng = (Math.atan2(pt.y - center.y, pt.x - center.x) * 180) / Math.PI + 90;
    const orig = new Map(sel.map((x) => [x.id, structuredClone(x)] as [string, El]));
    s.begin();
    setDrag({ kind: 'rotate', center, orig, pageId: page.id, startAng } as any);
  };
  const startLineEnd = (end: 1 | 2, id: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    const s = useEditor.getState();
    (ref.current as HTMLElement).setPointerCapture(e.pointerId);
    s.begin();
    setDrag({ kind: 'line-end', end, id, pageId: page.id });
  };
  const startCropResize = (handle: [number, number], el: ImageEl) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (ref.current as HTMLElement).setPointerCapture(e.pointerId);
    useEditor.getState().begin();
    setDrag({ kind: 'crop-resize', id: el.id, handle, start: toPage(e.clientX, e.clientY), orig: structuredClone(el) });
  };

  const cropEl = cropId ? pageEls.find((x) => x.id === cropId) : null;

  return (
    <div
      ref={ref}
      className="interaction"
      style={{ position: 'absolute', inset: 0, cursor: draw ? 'crosshair' : mode === 'comment' ? 'copy' : undefined, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => useEditor.getState().hoverId && useEditor.setState({ hoverId: null })}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {children}
      <div className="sel-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {hoverEl && !drag && <BoxOutline el={hoverEl} zoom={zoom} className="sel-box hover" />}
      {cropEl && <CropOverlay el={cropEl} zoom={zoom} onResize={startCropResize} />}
      {!cropEl && sel.length > 0 && !(drag?.kind === 'move' && (drag as any).moved) && (
        <SelectionBox els={sel} zoom={zoom} editing={!!editingId} onResize={startResize} onRotate={startRotate} onLineEnd={startLineEnd} />
      )}
      {!cropEl && sel.length > 0 && drag?.kind === 'move' && (drag as any).moved && sel.map((x) => <BoxOutline key={x.id} el={x} zoom={zoom} className="sel-box" />)}
      {snapGuides
        .filter((g) => g.pageId === page.id)
        .map((g, i) =>
          g.axis === 'x' ? (
            <div key={i} className="snap-line" style={{ left: g.pos * zoom, top: 0, bottom: 0, width: 1 }} />
          ) : (
            <div key={i} className="snap-line" style={{ top: g.pos * zoom, left: 0, right: 0, height: 1 }} />
          ),
        )}
      {(design.settings?.guides ?? []).map((g, i) =>
        g.axis === 'x' ? (
          <div key={'u' + i} className="user-guide" style={{ left: g.pos * zoom, top: 0, bottom: 0, width: 1 }} />
        ) : (
          <div key={'u' + i} className="user-guide" style={{ top: g.pos * zoom, left: 0, right: 0, height: 1 }} />
        ),
      )}
      {drag?.kind === 'marquee' && (
        <div
          className="marquee"
          style={{
            left: Math.min(drag.start.x, drag.cur.x) * zoom,
            top: Math.min(drag.start.y, drag.cur.y) * zoom,
            width: Math.abs(drag.cur.x - drag.start.x) * zoom,
            height: Math.abs(drag.cur.y - drag.start.y) * zoom,
          }}
        />
      )}
      {drag?.kind === 'draw' && drag.points.length > 1 && (
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
          <path
            d={'M' + drag.points.map((p) => `${p.x * zoom},${p.y * zoom}`).join(' L')}
            fill="none"
            stroke={useEditor.getState().draw?.color}
            strokeWidth={(useEditor.getState().draw?.width ?? 4) * zoom}
            strokeOpacity={useEditor.getState().draw?.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {badge && sel[0] && <SizeBadge els={sel} zoom={zoom} text={badge} />}
      <CommentPins page={page} zoom={zoom} />
      </div>
    </div>
  );
}

/** Transparent hit targets mirroring every element (rotated) so pointer events resolve to element ids. */
function HitLayer({ page, zoom, editingId }: { page: Page; zoom: number; editingId: string | null }) {
  return (
    <>
      {page.elements.map((el) => {
        if (el.hidden) return null;
        if (el.id === editingId) return null; // let clicks reach the contentEditable
        if (el.type === 'line') {
          const pad = 8;
          const ox = Math.min(el.x1, el.x2) - pad;
          const oy = Math.min(el.y1, el.y2) - pad;
          return (
            <svg
              key={el.id}
              style={{ position: 'absolute', left: ox * zoom, top: oy * zoom, width: (Math.abs(el.x2 - el.x1) + pad * 2) * zoom, height: (Math.abs(el.y2 - el.y1) + pad * 2) * zoom, overflow: 'visible', pointerEvents: 'none' }}
            >
              <line
                data-el-id={el.id}
                x1={(el.x1 - ox) * zoom}
                y1={(el.y1 - oy) * zoom}
                x2={(el.x2 - ox) * zoom}
                y2={(el.y2 - oy) * zoom}
                stroke="transparent"
                strokeWidth={Math.max(14, el.width * zoom + 10)}
                style={{ pointerEvents: 'stroke', cursor: el.locked ? 'default' : 'move' }}
              />
            </svg>
          );
        }
        return (
          <div
            key={el.id}
            data-el-id={el.id}
            data-testid={`el-${el.type}`}
            style={{
              position: 'absolute',
              left: el.x * zoom,
              top: el.y * zoom,
              width: el.w * zoom,
              height: el.h * zoom,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              cursor: el.locked ? 'default' : 'move',
            }}
          />
        );
      })}
    </>
  );
}

function BoxOutline({ el, zoom, className }: { el: El; zoom: number; className: string }) {
  if (el.type === 'line') {
    const b = elBounds(el);
    return <div className={className} style={{ left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, height: b.h * zoom }} />;
  }
  return (
    <div
      className={className}
      style={{ left: el.x * zoom - 1, top: el.y * zoom - 1, width: el.w * zoom + 2, height: el.h * zoom + 2, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
    />
  );
}

const HANDLES: [number, number][] = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
];
const CURSORS: Record<string, string> = { '-1,-1': 'nwse', '1,1': 'nwse', '1,-1': 'nesw', '-1,1': 'nesw', '0,-1': 'ns', '0,1': 'ns', '-1,0': 'ew', '1,0': 'ew' };

function SelectionBox({
  els,
  zoom,
  editing,
  onResize,
  onRotate,
  onLineEnd,
}: {
  els: El[];
  zoom: number;
  editing: boolean;
  onResize: (h: [number, number]) => (e: React.PointerEvent) => void;
  onRotate: (e: React.PointerEvent) => void;
  onLineEnd: (end: 1 | 2, id: string) => (e: React.PointerEvent) => void;
}) {
  const single = els.length === 1 ? els[0] : null;
  const locked = els.some((e) => e.locked);
  if (single?.type === 'line') {
    const l = single;
    return (
      <>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <line x1={l.x1 * zoom} y1={l.y1 * zoom} x2={l.x2 * zoom} y2={l.y2 * zoom} stroke="var(--select)" strokeWidth={1.5} strokeDasharray="4 3" />
        </svg>
        {!locked &&
          ([1, 2] as const).map((end) => (
            <div
              key={end}
              className="handle"
              data-testid={`line-end-${end}`}
              onPointerDown={onLineEnd(end, l.id)}
              style={{ left: (end === 1 ? l.x1 : l.x2) * zoom - 7, top: (end === 1 ? l.y1 : l.y2) * zoom - 7, cursor: 'crosshair' }}
            />
          ))}
      </>
    );
  }
  const box = single ? { x: single.x, y: single.y, w: single.w, h: single.h } : unionBox(els.map(elBounds))!;
  const rot = single?.rotation ?? 0;
  const w = box.w * zoom;
  const h = box.h * zoom;
  const isText = single?.type === 'text';
  const keepRatioOnly = !single || ['image', 'svg', 'video', 'sticky'].includes(single.type);
  const handles = HANDLES.filter(([hx, hy]) => {
    if (hx !== 0 && hy !== 0) return true;
    if (keepRatioOnly) return false;
    if (isText) return hy === 0; // text: left/right only
    return true;
  }).filter(() => w > 24 || h > 24);
  return (
    <div
      className={'sel-box' + (locked ? ' locked' : '')}
      data-testid="selection-box"
      style={{ left: box.x * zoom - 1, top: box.y * zoom - 1, width: w + 2, height: h + 2, transform: rot ? `rotate(${rot}deg)` : undefined }}
    >
      {!locked &&
        !editing &&
        handles.map(([hx, hy]) => {
          const side = hx === 0 ? 'side-v' : hy === 0 ? 'side-h' : '';
          const hw = side === 'side-v' ? 22 : side === 'side-h' ? 8 : 14;
          const hh = side === 'side-v' ? 8 : side === 'side-h' ? 22 : 14;
          return (
            <div
              key={`${hx},${hy}`}
              className={'handle ' + side}
              data-testid={`handle-${hx},${hy}`}
              onPointerDown={onResize([hx, hy])}
              style={{ left: ((hx + 1) / 2) * (w + 2) - hw / 2 - 1, top: ((hy + 1) / 2) * (h + 2) - hh / 2 - 1, cursor: `${CURSORS[`${hx},${hy}`]}-resize` }}
            />
          );
        })}
      {!locked && !editing && (
        <div className="rot-handle" data-testid="rotate-handle" onPointerDown={onRotate} style={{ left: w / 2 - 12, top: h + 14 }} title="Rotate">
          <Icon name="RotateCw" size={14} />
        </div>
      )}
      {locked && (
        <div style={{ position: 'absolute', right: -10, top: -10, background: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'grid', placeItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.25)', color: '#333' }}>
          <Icon name="Lock" size={12} />
        </div>
      )}
    </div>
  );
}

function SizeBadge({ els, zoom, text }: { els: El[]; zoom: number; text: string }) {
  const b = unionBox(els.map(elBounds))!;
  return (
    <div className="size-badge" style={{ left: (b.x + b.w / 2) * zoom, top: (b.y + b.h) * zoom + 44, transform: 'translateX(-50%)' }}>
      {text}
    </div>
  );
}

/* ---------------- Crop / reposition ---------------- */

function CropOverlay({ el, zoom, onResize }: { el: El; zoom: number; onResize: (h: [number, number], el: ImageEl) => (e: React.PointerEvent) => void }) {
  if (el.type === 'image') {
    const crop = el.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    const iw = el.w / crop.w;
    const ih = el.h / crop.h;
    return (
      <div style={{ position: 'absolute', left: el.x * zoom, top: el.y * zoom, width: el.w * zoom, height: el.h * zoom, transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}>
        <div
          className="crop-zone"
          style={{ position: 'absolute', left: -crop.x * iw * zoom, top: -crop.y * ih * zoom, width: iw * zoom, height: ih * zoom, background: 'rgba(0,0,0,.35)', outline: '1px dashed #fff', cursor: 'grab' }}
        />
        <div className="crop-zone" data-el-id={el.id} style={{ position: 'absolute', inset: 0, outline: '2px solid var(--select)', cursor: 'grab' }} />
        {HANDLES.filter(([a, b]) => a !== 0 && b !== 0).map(([hx, hy]) => (
          <div
            key={`${hx},${hy}`}
            className="handle"
            onPointerDown={onResize([hx, hy], el)}
            style={{ left: ((hx + 1) / 2) * el.w * zoom - 7, top: ((hy + 1) / 2) * el.h * zoom - 7, borderRadius: 2, cursor: `${CURSORS[`${hx},${hy}`]}-resize` }}
          />
        ))}
        <div className="size-badge" style={{ left: '50%', top: -30, transform: 'translateX(-50%)' }}>
          Drag to reposition · Esc to finish
        </div>
      </div>
    );
  }
  return (
    <div
      className="crop-zone"
      data-el-id={el.id}
      style={{ position: 'absolute', left: el.x * zoom, top: el.y * zoom, width: el.w * zoom, height: el.h * zoom, outline: '2px dashed var(--select)', cursor: 'grab', transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined }}
    >
      <div className="size-badge" style={{ left: '50%', top: -30, transform: 'translateX(-50%)' }}>
        Drag to reposition media · Esc to finish
      </div>
    </div>
  );
}

function cropPan(d: Extract<Drag, { kind: 'crop-pan' }>, pt: { x: number; y: number }) {
  const s = useEditor.getState();
  const dx = pt.x - d.start.x;
  const dy = pt.y - d.start.y;
  const o = d.orig;
  s.update(
    (dd) => {
      const f = findEl(dd, d.id);
      if (!f) return;
      const el = f.page.elements[f.index] as Draft<El>;
      if (el.type === 'image' && o.type === 'image') {
        const c = o.crop ?? { x: 0, y: 0, w: 1, h: 1 };
        const iw = o.w / c.w;
        const ih = o.h / c.h;
        el.crop = { ...c, x: clamp01(c.x - dx / iw, 1 - c.w), y: clamp01(c.y - dy / ih, 1 - c.h) };
      } else if (el.type === 'frame' && o.type === 'frame') {
        el.media.offsetX = Math.max(-0.5, Math.min(0.5, o.media.offsetX + dx / Math.max(40, o.w)));
        el.media.offsetY = Math.max(-0.5, Math.min(0.5, o.media.offsetY + dy / Math.max(40, o.h)));
      } else if (el.type === 'grid' && o.type === 'grid') {
        const i = d.cell ?? 0;
        if (!el.cells[i]) return;
        el.cells[i].offsetX = Math.max(-0.5, Math.min(0.5, o.cells[i].offsetX + dx / Math.max(40, o.w / 2)));
        el.cells[i].offsetY = Math.max(-0.5, Math.min(0.5, o.cells[i].offsetY + dy / Math.max(40, o.h / 2)));
      } else if (el.type === 'video' && o.type === 'video') {
        const c = o.crop ?? { x: 0, y: 0, w: 1, h: 1 };
        el.crop = { ...c, x: clamp01(c.x - dx / (o.w / c.w), 1 - c.w), y: clamp01(c.y - dy / (o.h / c.h), 1 - c.h) };
      }
    },
    { history: false },
  );
}

function cropResize(d: Extract<Drag, { kind: 'crop-resize' }>, pt: { x: number; y: number }) {
  const s = useEditor.getState();
  const o = d.orig;
  const c = o.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const iw = o.w / c.w;
  const ih = o.h / c.h;
  const [hx, hy] = d.handle;
  const dx = pt.x - d.start.x;
  const dy = pt.y - d.start.y;
  // Shrink/grow the visible window over the fixed-size image.
  let left = o.x;
  let top = o.y;
  let right = o.x + o.w;
  let bottom = o.y + o.h;
  const imgL = o.x - c.x * iw;
  const imgT = o.y - c.y * ih;
  if (hx < 0) left = Math.max(imgL, Math.min(right - 20, o.x + dx));
  if (hx > 0) right = Math.min(imgL + iw, Math.max(left + 20, o.x + o.w + dx));
  if (hy < 0) top = Math.max(imgT, Math.min(bottom - 20, o.y + dy));
  if (hy > 0) bottom = Math.min(imgT + ih, Math.max(top + 20, o.y + o.h + dy));
  s.update(
    (dd) => {
      const f = findEl(dd, d.id);
      if (!f) return;
      const el = f.page.elements[f.index] as Draft<ImageEl>;
      el.x = left;
      el.y = top;
      el.w = right - left;
      el.h = bottom - top;
      el.crop = { x: (left - imgL) / iw, y: (top - imgT) / ih, w: el.w / iw, h: el.h / ih };
    },
    { history: false },
  );
}

const clamp01 = (v: number, max: number) => Math.max(0, Math.min(max, v));

/* ---------------- Resize math ---------------- */

function doResize(
  d: Extract<Drag, { kind: 'resize' }>,
  pt: { x: number; y: number },
  shift: boolean,
  zoom: number,
  design: Design,
  page: Page,
  setBadge: (s: string) => void,
) {
  const s = useEditor.getState();
  const [hx, hy] = d.handle;
  const corner = hx !== 0 && hy !== 0;
  if (d.single) {
    const o = d.single;
    const rot = o.rotation || 0;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    // pointer delta in the element's local frame
    const local = rotatePoint(pt.x, pt.y, cx, cy, -rot);
    const start = rotatePoint(d.start.x, d.start.y, cx, cy, -rot);
    const dlx = local.x - start.x;
    const dly = local.y - start.y;
    let nw = o.w + hx * dlx;
    let nh = o.h + hy * dly;
    const keepRatio = corner && (shift || ['image', 'svg', 'video', 'text', 'sticky', 'frame', 'grid', 'chart', 'table', 'draw', 'embed'].includes(o.type) || !!o.groupId);
    if (keepRatio && !(o.type === 'shape' && !shift)) {
      const r = o.w / o.h;
      if (Math.abs(dlx * hx) / o.w > Math.abs(dly * hy) / o.h) nh = nw / r;
      else nw = nh * r;
    }
    nw = Math.max(8, nw);
    nh = Math.max(8, nh);
    // snap edges (unrotated only)
    if (!rot) {
      const res = snapResize(design, page, o, hx, hy, nw, nh, zoom);
      nw = res.w;
      nh = res.h;
      useEditor.setState({ snapGuides: res.guides.map((g) => ({ ...g, pageId: page.id })) });
    }
    // keep opposite anchor fixed
    const ax = (-hx * o.w) / 2;
    const ay = (-hy * o.h) / 2;
    const anchorWorld = rotatePoint(cx + ax, cy + ay, cx, cy, rot);
    const nax = (-hx * nw) / 2;
    const nay = (-hy * nh) / 2;
    const a = (rot * Math.PI) / 180;
    const ncx = anchorWorld.x - (nax * Math.cos(a) - nay * Math.sin(a));
    const ncy = anchorWorld.y - (nax * Math.sin(a) + nay * Math.cos(a));
    s.update(
      (dd) => {
        const f = findEl(dd, o.id);
        if (!f) return;
        const el = f.page.elements[f.index] as Draft<El>;
        el.w = nw;
        el.h = nh;
        el.x = ncx - nw / 2;
        el.y = ncy - nh / 2;
        if (o.type === 'text' && el.type === 'text') {
          if (corner) el.fontSize = Math.max(1, Math.round(o.fontSize * (nw / o.w) * 10) / 10);
          else el.h = o.h; // width change: height re-measured by auto-height
        }
        if (o.type === 'sticky' && el.type === 'sticky') el.fontSize = Math.max(6, o.fontSize * (nw / o.w));
        if (o.type === 'table' && el.type === 'table' && corner) el.fontSize = Math.max(4, o.fontSize * (nw / o.w));
        if (o.type === 'shape' && el.type === 'shape' && corner && keepRatio && o.fontSize) el.fontSize = o.fontSize * (nw / o.w);
        if (o.type === 'chart' && el.type === 'chart' && corner) el.options.fontSize = Math.max(6, o.options.fontSize * (nw / o.w));
      },
      { history: false },
    );
    setBadge(`w ${Math.round(nw)} h ${Math.round(nh)}`);
    return;
  }
  // multi-selection: scale proportionally from the opposite corner
  const b = d.box;
  const dx = pt.x - d.start.x;
  const dy = pt.y - d.start.y;
  let nw = Math.max(10, b.w + hx * dx);
  let nh = Math.max(10, b.h + hy * dy);
  if (corner) {
    const k = Math.max(nw / b.w, nh / b.h);
    nw = b.w * k;
    nh = b.h * k;
  }
  const nx = hx < 0 ? b.x + b.w - nw : hx > 0 ? b.x : b.x;
  const ny = hy < 0 ? b.y + b.h - nh : hy > 0 ? b.y : b.y;
  const to = { x: nx, y: ny, w: hx === 0 ? b.w : nw, h: hy === 0 ? b.h : nh };
  s.update(
    (dd) => {
      for (const o of d.orig) {
        const f = findEl(dd, o.id);
        if (!f) continue;
        const el = f.page.elements[f.index] as Draft<El>;
        Object.assign(el, structuredClone(o));
        mapElBox(el as El, b, to);
      }
    },
    { history: false },
  );
  setBadge(`w ${Math.round(to.w)} h ${Math.round(to.h)}`);
}

/* ---------------- Snapping ---------------- */

function snapTargets(design: Design, page: Page, exclude: Set<string>) {
  const xs = [0, design.width / 2, design.width];
  const ys = [0, (page.height ?? design.height) / 2, page.height ?? design.height];
  for (const e of page.elements) {
    if (exclude.has(e.id) || e.hidden) continue;
    const b = elBounds(e);
    xs.push(b.x, b.x + b.w / 2, b.x + b.w);
    ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  for (const g of design.settings?.guides ?? []) (g.axis === 'x' ? xs : ys).push(g.pos);
  return { xs, ys };
}

function snapMove(design: Design, page: Page, box: Box, dx: number, dy: number, exclude: Set<string>, zoom: number) {
  if (design.settings?.snap === false) return { dx, dy, guides: [] as { axis: 'x' | 'y'; pos: number }[] };
  const { xs, ys } = snapTargets(design, page, exclude);
  const th = SNAP / zoom;
  const cand = (pos: number[], targets: number[]) => {
    let best: { delta: number; at: number } | null = null;
    for (const p of pos) for (const t of targets) {
      const dd = t - p;
      if (Math.abs(dd) <= th && (!best || Math.abs(dd) < Math.abs(best.delta))) best = { delta: dd, at: t };
    }
    return best;
  };
  const nx = box.x + dx;
  const ny = box.y + dy;
  const sx = cand([nx, nx + box.w / 2, nx + box.w], xs);
  const sy = cand([ny, ny + box.h / 2, ny + box.h], ys);
  const guides: { axis: 'x' | 'y'; pos: number }[] = [];
  if (sx) {
    dx += sx.delta;
    guides.push({ axis: 'x', pos: sx.at });
  }
  if (sy) {
    dy += sy.delta;
    guides.push({ axis: 'y', pos: sy.at });
  }
  return { dx, dy, guides };
}

function snapResize(design: Design, page: Page, o: El, hx: number, hy: number, w: number, h: number, zoom: number) {
  const guides: { axis: 'x' | 'y'; pos: number }[] = [];
  if (design.settings?.snap === false) return { w, h, guides };
  const { xs, ys } = snapTargets(design, page, new Set([o.id]));
  const th = SNAP / zoom;
  if (hx > 0) {
    const edge = o.x + w;
    const t = xs.find((x) => Math.abs(x - edge) <= th);
    if (t !== undefined) {
      w = t - o.x;
      guides.push({ axis: 'x', pos: t });
    }
  }
  if (hy > 0) {
    const edge = o.y + h;
    const t = ys.find((y) => Math.abs(y - edge) <= th);
    if (t !== undefined) {
      h = t - o.y;
      guides.push({ axis: 'y', pos: t });
    }
  }
  return { w, h, guides };
}

/* ---------------- Drawing helpers ---------------- */

function smoothDraw(pts: { x: number; y: number }[]) {
  if (pts.length < 3) return 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l.x.toFixed(1)},${l.y.toFixed(1)}`;
}

/** Shape assist: a closed stroke becomes a clean circle or rectangle. */
function shapeAssist(pts: { x: number; y: number }[], _holdMs: number): string | null {
  if (pts.length < 12) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 30 || h < 30) return null;
  const closed = Math.hypot(last.x - first.x, last.y - first.y) < Math.max(w, h) * 0.15;
  if (!closed) return null;
  const cx = minX + w / 2;
  const cy = minY + h / 2;
  // circle-ness: variance of normalized radius
  const radii = pts.map((p) => Math.hypot((p.x - cx) / (w / 2), (p.y - cy) / (h / 2)));
  const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
  const varr = radii.reduce((a, b) => a + (b - mean) ** 2, 0) / radii.length;
  if (varr < 0.012) return `M${cx - w / 2},${cy} A${w / 2},${h / 2} 0 1 1 ${cx + w / 2},${cy} A${w / 2},${h / 2} 0 1 1 ${cx - w / 2},${cy} Z`;
  // rectangle-ness: points hug the bounding box edges
  const nearEdge = pts.filter((p) => Math.min(p.x - minX, maxX - p.x, p.y - minY, maxY - p.y) < Math.max(w, h) * 0.08).length / pts.length;
  if (nearEdge > 0.85) return `M${minX},${minY} L${maxX},${minY} L${maxX},${maxY} L${minX},${maxY} Z`;
  return null;
}

/* ---------------- Comment pins ---------------- */

function CommentPins({ page, zoom }: { page: Page; zoom: number }) {
  const comments = useEditor((s) => s.design?.comments ?? []);
  const mode = useEditor((s) => s.mode);
  const right = useEditor((s) => s.right);
  if (mode !== 'comment' && right !== 'comments') return null;
  return (
    <>
      {comments
        .filter((c) => c.pageId === page.id && !c.resolved && c.x != null)
        .map((c, i) => (
          <button
            key={c.id}
            className="ctx-keep"
            title={c.text}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              useEditor.setState({ right: 'comments' });
              window.dispatchEvent(new CustomEvent('cream:focus-comment', { detail: c.id }));
            }}
            style={{
              position: 'absolute',
              left: (c.x ?? 0) * zoom - 12,
              top: (c.y ?? 0) * zoom - 24,
              width: 26,
              height: 26,
              borderRadius: '50% 50% 50% 0',
              background: 'var(--primary)',
              color: '#fff',
              border: '2px solid #fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow)',
              zIndex: 10,
            }}
          >
            {i + 1}
          </button>
        ))}
    </>
  );
}

/* ---------------- Grid view (all pages) ---------------- */

function GridView({ zoomFit }: { zoomFit: number }) {
  const design = useEditor((s) => s.design)!;
  const pageId = useEditor((s) => s.pageId);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const thumbW = 220;
  const scale = thumbW / design.width;
  void zoomFit;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${thumbW + 20}px)`, gap: 20, padding: 32, justifyContent: 'center' }}>
      {design.pages.map((p, i) => (
        <div
          key={p.id}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIdx != null && dragIdx !== i) useEditor.getState().reorderPage(design.pages[dragIdx].id, i);
            setDragIdx(null);
          }}
          onDoubleClick={() => useEditor.setState({ view: 'scroll', pageId: p.id })}
          onClick={() => useEditor.setState({ pageId: p.id })}
          style={{ cursor: 'pointer', padding: 6, borderRadius: 10, outline: p.id === pageId ? '2px solid var(--primary)' : 'none', opacity: p.hidden ? 0.5 : 1 }}
        >
          <div style={{ boxShadow: 'var(--shadow-sm)', background: '#fff' }}>
            <PageView design={design} page={p} scale={scale} ctx={{ mode: 'static', pageIndex: i, pageCount: design.pages.length }} />
          </div>
          <div className="row" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-2)' }}>
            <span>{i + 1}</span>
            <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.title}
            </span>
            {p.hidden && <Icon name="EyeOff" size={13} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export { selectedEls, currentPage };
void useApp;
void GRID_LAYOUTS;
