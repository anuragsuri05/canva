import { memo, useEffect, useState } from 'react';
import type { Draft } from 'immer';
import type { El, LineEl, Page } from '../model/types';
import { useCurrentPage, useEditor, useSelected } from '../store/editor';
import { elBounds, moveEl, type Box } from '../model/geometry';
import { PageView } from '../render/PageView';
import { Icon, MOD, ALT } from '../ui/ui';
import { Section } from './common';
import './toolbar.css';

const TYPE_LABEL: Record<El['type'], string> = {
  text: 'Text',
  image: 'Image',
  shape: 'Shape',
  line: 'Line',
  svg: 'Graphic',
  video: 'Video',
  chart: 'Chart',
  table: 'Table',
  frame: 'Frame',
  grid: 'Grid',
  sticky: 'Sticky note',
  draw: 'Drawing',
  embed: 'Embed',
};

export function elLabel(e: El): string {
  if (e.name) return e.name;
  if (e.type === 'text' || e.type === 'sticky') {
    const d = document.createElement('div');
    d.innerHTML = e.html.replace(/<br\s*\/?>/gi, ' ');
    const t = (d.textContent ?? '').trim();
    if (t) return t.slice(0, 40);
  }
  if (e.type === 'image' && e.credit?.title) return e.credit.title;
  if (e.type === 'shape') return `Shape · ${e.shape}`;
  if (e.type === 'chart') return `Chart · ${e.chartType}`;
  return TYPE_LABEL[e.type];
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export default function PositionPanel() {
  const [tab, setTab] = useState<'arrange' | 'layers'>(() => (useEditor.getState().selection.length ? 'arrange' : 'layers'));
  return (
    <div data-testid="position-panel">
      <div className="tabs">
        <button className={'tab' + (tab === 'arrange' ? ' active' : '')} onClick={() => setTab('arrange')} data-testid="pos-tab-arrange">
          Arrange
        </button>
        <button className={'tab' + (tab === 'layers' ? ' active' : '')} onClick={() => setTab('layers')} data-testid="pos-tab-layers">
          Layers
        </button>
      </div>
      {tab === 'arrange' ? <Arrange /> : <Layers />}
    </div>
  );
}

/* ---------------- Arrange ---------------- */

function Arrange() {
  const sel = useSelected();
  const s = useEditor.getState();
  if (!sel.length) return <div className="empty">Select an element to arrange it.</div>;
  const multi = sel.length > 1;
  const btn = (label: string, icon: string, onClick: () => void, title?: string, testId?: string, disabled?: boolean) => (
    <button className="btn sm" onClick={onClick} title={title} data-testid={testId} disabled={disabled}>
      <Icon name={icon} size={16} /> {label}
    </button>
  );
  const align = (op: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', page: boolean) => (page ? s.alignToPage(op) : s.alignSelection(op));
  const alignGrid = (page: boolean, prefix: string) => (
    <div className="ct-grid3">
      {btn('Top', 'AlignStartHorizontal', () => align('top', page), undefined, `${prefix}-top`)}
      {btn('Left', 'AlignStartVertical', () => align('left', page), undefined, `${prefix}-left`)}
      {btn('Middle', 'AlignCenterHorizontal', () => align('middle', page), undefined, `${prefix}-middle`)}
      {btn('Center', 'AlignCenterVertical', () => align('center', page), undefined, `${prefix}-center`)}
      {btn('Bottom', 'AlignEndHorizontal', () => align('bottom', page), undefined, `${prefix}-bottom`)}
      {btn('Right', 'AlignEndVertical', () => align('right', page), undefined, `${prefix}-right`)}
    </div>
  );
  return (
    <div>
      <Section title="Layer">
        <div className="ct-grid2">
          {btn('Forward', 'BringToFront', () => s.arrange('forward'), `${MOD}+]`, 'arrange-forward')}
          {btn('Backward', 'SendToBack', () => s.arrange('backward'), `${MOD}+[`, 'arrange-backward')}
          {btn('To front', 'ArrowUpToLine', () => s.arrange('front'), `${MOD}+${ALT}+]`, 'arrange-front')}
          {btn('To back', 'ArrowDownToLine', () => s.arrange('back'), `${MOD}+${ALT}+[`, 'arrange-back')}
        </div>
      </Section>
      {multi && (
        <Section title="Align elements">
          {alignGrid(false, 'align-el')}
          <div className="ct-grid2" style={{ marginTop: 6 }}>
            {btn('Space evenly ↕', 'AlignVerticalSpaceAround', () => s.distribute('v'), 'Vertically', 'space-v', sel.length < 3)}
            {btn('Space evenly ↔', 'AlignHorizontalSpaceAround', () => s.distribute('h'), 'Horizontally', 'space-h', sel.length < 3)}
          </div>
          <button className="btn sm block" style={{ marginTop: 6 }} onClick={() => s.tidyUp()} title={`${ALT}+Shift+T`} data-testid="tidy-up">
            <Icon name="LayoutGrid" size={16} /> Tidy up
          </button>
        </Section>
      )}
      <Section title="Align to page">{alignGrid(true, 'align-page')}</Section>
      {!multi && <Advanced el={sel[0]} />}
    </div>
  );
}

function NumField({ label, value, onCommit, testId, suffix }: { label: string; value: number; onCommit: (v: number) => void; testId?: string; suffix?: string }) {
  const [txt, setTxt] = useState(String(Math.round(value)));
  useEffect(() => setTxt(String(Math.round(value * 10) / 10)), [value]);
  const commit = () => {
    const n = parseFloat(txt);
    if (Number.isFinite(n) && Math.abs(n - value) > 0.01) onCommit(n);
    else setTxt(String(Math.round(value * 10) / 10));
  };
  return (
    <label className="ct-num">
      <span>{label}</span>
      <input
        value={txt}
        data-testid={testId}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') commit();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            onCommit(value + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
          }
        }}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}

function Advanced({ el }: { el: El }) {
  const [lock, setLock] = useState(el.type === 'image' || el.type === 'svg' || el.type === 'video');
  const s = useEditor.getState();
  const b = el.type === 'line' ? { x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2), w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) } : { x: el.x, y: el.y, w: el.w, h: el.h };
  const setBox = (patch: Partial<Box>) =>
    s.updateEl(el.id, (e: Draft<El>) => {
      if (e.type === 'line') {
        const l = e as Draft<LineEl>;
        const nb = { ...b, ...patch };
        const sx = b.w ? nb.w / b.w : 1;
        const sy = b.h ? nb.h / b.h : 1;
        l.x1 = nb.x + (l.x1 - b.x) * sx;
        l.x2 = nb.x + (l.x2 - b.x) * sx;
        l.y1 = nb.y + (l.y1 - b.y) * sy;
        l.y2 = nb.y + (l.y2 - b.y) * sy;
        l.x = Math.min(l.x1, l.x2);
        l.y = Math.min(l.y1, l.y2);
        l.w = Math.abs(l.x2 - l.x1);
        l.h = Math.abs(l.y2 - l.y1);
        return;
      }
      if (patch.x !== undefined || patch.y !== undefined) moveEl(e as El, (patch.x ?? e.x) - e.x, (patch.y ?? e.y) - e.y);
      if (patch.w !== undefined) {
        const r = e.h / e.w;
        e.w = Math.max(1, patch.w);
        if (lock) e.h = e.w * r;
        if (e.type === 'text') e.autoHeight = e.autoHeight ?? true;
      }
      if (patch.h !== undefined) {
        const r = e.w / e.h;
        e.h = Math.max(1, patch.h);
        if (lock) e.w = e.h * r;
        if (e.type === 'text') e.autoHeight = false;
      }
    });
  return (
    <Section title="Advanced">
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="grow">
          <NumField label="W" value={b.w} onCommit={(v) => setBox({ w: v })} testId="pos-w" suffix="px" />
        </div>
        <button className={'icon-btn' + (lock ? ' active' : '')} onClick={() => setLock(!lock)} title="Lock aspect ratio" data-testid="pos-ratio-lock">
          <Icon name={lock ? 'Link' : 'Unlink'} size={16} />
        </button>
        <div className="grow">
          <NumField label="H" value={b.h} onCommit={(v) => setBox({ h: v })} testId="pos-h" suffix="px" />
        </div>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="grow">
          <NumField label="X" value={b.x} onCommit={(v) => setBox({ x: v })} testId="pos-x" suffix="px" />
        </div>
        <span style={{ width: 32 }} />
        <div className="grow">
          <NumField label="Y" value={b.y} onCommit={(v) => setBox({ y: v })} testId="pos-y" suffix="px" />
        </div>
      </div>
      {el.type !== 'line' && (
        <div style={{ width: 'calc(50% - 20px)' }}>
          <NumField label="Rotate" value={el.rotation} onCommit={(v) => s.updateEl(el.id, { rotation: ((v % 360) + 360) % 360 } as Partial<El>)} testId="pos-rotate" suffix="°" />
        </div>
      )}
    </Section>
  );
}

/* ---------------- Layers ---------------- */

type LayerRow = { kind: 'el'; el: El; child?: boolean } | { kind: 'group'; id: string; els: El[] };

function Layers() {
  const page = useCurrentPage();
  const selection = useEditor((s) => s.selection);
  const [mode, setMode] = useState<'all' | 'overlap'>('all');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; above: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  if (!page) return null;

  // Top-most first.
  let els = [...page.elements].reverse();
  if (mode === 'overlap') {
    const ref = page.elements.filter((e) => selection.includes(e.id));
    if (ref.length) {
      const boxes = ref.map(elBounds);
      els = els.filter((e) => selection.includes(e.id) || boxes.some((b) => overlaps(b, elBounds(e))));
    } else {
      els = els.filter((e) => page.elements.some((o) => o.id !== e.id && overlaps(elBounds(o), elBounds(e))));
    }
  }
  const rows: LayerRow[] = [];
  const seen = new Set<string>();
  for (const e of els) {
    if (e.groupId) {
      if (seen.has(e.groupId)) continue;
      seen.add(e.groupId);
      const members = els.filter((x) => x.groupId === e.groupId);
      rows.push({ kind: 'group', id: e.groupId, els: members });
      if (open[e.groupId]) members.forEach((m) => rows.push({ kind: 'el', el: m, child: true }));
    } else rows.push({ kind: 'el', el: e });
  }

  const ids = (r: LayerRow) => (r.kind === 'el' ? [r.el.id] : r.els.map((x) => x.id));
  const rowKey = (r: LayerRow) => (r.kind === 'el' ? r.el.id : 'g:' + r.id);

  /** Move dragged ids so they sit above/below the target row (in visual, top-first order). */
  const reorder = (dragKey: string, targetKey: string, above: boolean) => {
    const dragRow = rows.find((r) => rowKey(r) === dragKey);
    const targetRow = rows.find((r) => rowKey(r) === targetKey);
    if (!dragRow || !targetRow || dragKey === targetKey) return;
    const moving = new Set(ids(dragRow));
    const targetIds = ids(targetRow);
    useEditor.getState().update((d) => {
      const p = d.pages.find((x) => x.id === page.id) as Draft<Page>;
      const visual = [...p.elements].reverse();
      const moved = visual.filter((e) => moving.has(e.id));
      const rest = visual.filter((e) => !moving.has(e.id));
      let idx = above ? rest.findIndex((e) => targetIds.includes(e.id)) : rest.length - [...rest].reverse().findIndex((e) => targetIds.includes(e.id));
      if (idx < 0) idx = rest.length;
      rest.splice(idx, 0, ...moved);
      p.elements = rest.reverse() as Draft<El>[];
    });
  };

  const hover = (id: string | null) => useEditor.setState({ hoverId: id });

  return (
    <div>
      <div className="seg" style={{ width: '100%', marginBottom: 12 }}>
        <button className={mode === 'all' ? 'active' : ''} style={{ flex: 1 }} onClick={() => setMode('all')} data-testid="layers-all">
          All
        </button>
        <button className={mode === 'overlap' ? 'active' : ''} style={{ flex: 1 }} onClick={() => setMode('overlap')} data-testid="layers-overlapping">
          Overlapping
        </button>
      </div>
      {!rows.length && <div className="empty">{mode === 'overlap' ? 'No overlapping elements' : 'This page is empty'}</div>}
      <div className="ct-layers" data-testid="layers-list" onMouseLeave={() => hover(null)}>
        {rows.map((r) => {
          const key = rowKey(r);
          const rIds = ids(r);
          const active = rIds.every((id) => selection.includes(id));
          const els2 = r.kind === 'el' ? [r.el] : r.els;
          const locked = els2.every((e) => e.locked);
          const hidden = els2.every((e) => e.hidden);
          return (
            <div
              key={key}
              className={
                'ct-layer' +
                (active ? ' active' : '') +
                (r.kind === 'el' && r.child ? ' child' : '') +
                (dragId === key ? ' dragging' : '') +
                (hidden ? ' hidden-el' : '') +
                (drop?.id === key ? (drop.above ? ' drop-above' : ' drop-below') : '')
              }
              draggable={!(r.kind === 'el' && r.child) && renaming !== key}
              data-testid={`layer-${key}`}
              onDragStart={(e) => {
                setDragId(key);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', key);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDrop(null);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const above = e.clientY < rect.top + rect.height / 2;
                if (drop?.id !== key || drop.above !== above) setDrop({ id: key, above });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && drop) reorder(dragId, key, drop.above);
                setDragId(null);
                setDrop(null);
              }}
              onMouseEnter={() => hover(rIds[0])}
              onClick={(e) => useEditor.getState().select(rIds, e.shiftKey)}
            >
              {r.kind === 'group' ? (
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen({ ...open, [r.id]: !open[r.id] });
                  }}
                  data-testid={`layer-expand-${r.id}`}
                >
                  <Icon name={open[r.id] ? 'ChevronDown' : 'ChevronRight'} size={14} />
                </button>
              ) : (
                <Icon name="GripVertical" size={14} style={{ color: 'var(--text-3)', flex: 'none', cursor: 'grab' }} />
              )}
              <span className="thumb">
                <LayerThumb els={els2} />
              </span>
              {renaming === key && r.kind === 'el' ? (
                <input
                  className="input sm grow"
                  autoFocus
                  defaultValue={r.el.name ?? elLabel(r.el)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    useEditor.getState().updateEl(r.el.id, { name: v || undefined } as Partial<El>);
                    setRenaming(null);
                  }}
                  data-testid="layer-rename-input"
                />
              ) : (
                <span className="nm" onDoubleClick={() => r.kind === 'el' && setRenaming(key)} title="Double-click to rename">
                  {r.kind === 'group' ? `Group (${r.els.length})` : elLabel(r.el)}
                  <small>{r.kind === 'group' ? 'Group' : TYPE_LABEL[r.el.type]}</small>
                </span>
              )}
              <span className={'acts' + (locked || hidden ? ' show' : '')}>
                {r.kind === 'el' && (
                  <button
                    className="icon-btn"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming(key);
                    }}
                  >
                    <Icon name="Pencil" size={13} />
                  </button>
                )}
                <button
                  className={'icon-btn' + (locked ? ' active' : '')}
                  title={locked ? 'Unlock' : 'Lock'}
                  data-testid={`layer-lock-${key}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditor.getState().update((d) => {
                      d.pages.forEach((p) =>
                        p.elements.forEach((x) => {
                          if (rIds.includes(x.id)) {
                            if (locked) delete x.locked;
                            else x.locked = 'full';
                          }
                        }),
                      );
                    });
                  }}
                >
                  <Icon name={locked ? 'Lock' : 'LockOpen'} size={14} />
                </button>
                <button
                  className={'icon-btn' + (hidden ? ' active' : '')}
                  title={hidden ? 'Show' : 'Hide'}
                  data-testid={`layer-hide-${key}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    useEditor.getState().update((d) => {
                      d.pages.forEach((p) =>
                        p.elements.forEach((x) => {
                          if (rIds.includes(x.id)) {
                            if (hidden) delete x.hidden;
                            else x.hidden = true;
                          }
                        }),
                      );
                    });
                  }}
                >
                  <Icon name={hidden ? 'EyeOff' : 'Eye'} size={14} />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {rows.length > 1 && <div className="faint" style={{ marginTop: 10 }}>Drag layers to reorder. Top of the list is in front.</div>}
    </div>
  );
}

const THUMB_W = 64;
const THUMB_H = 42;

const LayerThumb = memo(function LayerThumb({ els }: { els: El[] }) {
  const boxes = els.map(elBounds);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const w = Math.max(1, Math.max(...boxes.map((b) => b.x + b.w)) - x);
  const h = Math.max(1, Math.max(...boxes.map((b) => b.y + b.h)) - y);
  const scale = Math.min(THUMB_W / w, THUMB_H / h);
  const shifted = els.map((e) => {
    const c = structuredClone(e) as El;
    moveEl(c, -x, -y);
    c.hidden = false;
    c.anim = undefined;
    return c;
  });
  const page: Page = { id: 'thumb', background: { kind: 'solid', color: 'transparent' }, elements: shifted, notes: '', duration: 5 };
  return <PageView design={{ width: w, height: h }} page={page} scale={scale} ctx={{ mode: 'static', pageIndex: 0, pageCount: 1 }} style={{ pointerEvents: 'none' }} />;
});
