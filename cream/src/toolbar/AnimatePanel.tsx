import { useEffect, useRef, useState } from 'react';
import type { Draft } from 'immer';
import type { Anim, El, Page } from '../model/types';
import { useCurrentPage, useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { ANIMATIONS, animById, ensureAnimCss, type AnimDef } from '../render/animation';
import { Icon, Segmented, Toggle } from '../ui/ui';
import { Section, TSlider } from './common';
import './toolbar.css';

type Tab = 'page' | 'element' | 'text';

const GROUPS: { id: AnimDef['group']; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'exaggerate', label: 'Exaggerate' },
  { id: 'photo', label: 'Photo movement' },
  { id: 'text', label: 'Text' },
  { id: 'emphasis', label: 'Emphasis' },
];

const SPEEDS = [
  { label: 'Slow', v: 1.5 },
  { label: 'Medium', v: 0.8 },
  { label: 'Fast', v: 0.4 },
];

const DEFAULT_ANIM = (name: string): Anim => ({ name, duration: 0.8, on: 'enter', direction: animById(name)?.directional ? 'up' : undefined });

export default function AnimatePanel() {
  const sel = useSelected();
  const page = useCurrentPage();
  const hasText = sel.length > 0 && sel.every((e) => e.type === 'text');
  const [tab, setTab] = useState<Tab>(sel.length ? (hasText ? 'text' : 'element') : 'page');
  useEffect(() => {
    if (!sel.length && tab !== 'page') setTab('page');
    if (sel.length && tab === 'page') setTab(hasText ? 'text' : 'element');
    if (tab === 'text' && !hasText && sel.length) setTab('element');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.map((e) => e.id).join(',')]);
  useEffect(() => ensureAnimCss(), []);
  if (!page) return null;

  const current: Anim | undefined = tab === 'page' ? page.pageAnim : sel[0]?.anim;
  const groups = tab === 'page' ? GROUPS.filter((g) => g.id !== 'text' && g.id !== 'emphasis') : tab === 'text' ? GROUPS.filter((g) => g.id === 'text' || g.id === 'basic' || g.id === 'exaggerate') : GROUPS.filter((g) => g.id !== 'text');
  const hasPhoto = sel.some((e) => e.type === 'image' || e.type === 'video' || e.type === 'frame' || e.type === 'grid');

  const set = (fn: (a: Anim | undefined) => Anim | undefined, coalesce?: string) => {
    const s = useEditor.getState();
    if (tab === 'page') s.patchPage(page.id, { pageAnim: fn(page.pageAnim) });
    else
      s.updateSelected(
        (e) => {
          const next = fn(e.anim as Anim | undefined);
          if (next) e.anim = next as Draft<Anim>;
          else delete e.anim;
        },
        coalesce ? { coalesce } : undefined,
      );
  };
  const choose = (id: string) => set((a) => ({ ...DEFAULT_ANIM(id), ...(a ? { duration: a.duration, on: a.on, by: a.by, emphasis: a.emphasis } : {}), name: id, direction: animById(id)?.directional ? a?.direction ?? 'up' : undefined }));

  return (
    <div data-testid="animate-panel">
      <div className="tabs">
        <button className={'tab' + (tab === 'page' ? ' active' : '')} onClick={() => setTab('page')} data-testid="anim-tab-page">
          Page animations
        </button>
        {sel.length > 0 && (
          <button className={'tab' + (tab === 'element' ? ' active' : '')} onClick={() => setTab('element')} data-testid="anim-tab-element">
            Element
          </button>
        )}
        {hasText && (
          <button className={'tab' + (tab === 'text' ? ' active' : '')} onClick={() => setTab('text')} data-testid="anim-tab-text">
            Text
          </button>
        )}
      </div>

      {tab === 'page' && (
        <button className="btn grad block" style={{ marginBottom: 14 }} onClick={magicAnimate} data-testid="magic-animate">
          <Icon name="Sparkles" size={16} /> Magic Animate
        </button>
      )}

      {current && <Settings anim={current} tab={tab} set={set} />}

      {groups.map((g) =>
        g.id === 'photo' && tab !== 'page' && !hasPhoto ? null : (
          <Section key={g.id} title={g.label}>
            <div className="ct-tiles">
              {ANIMATIONS.filter((a) => a.group === g.id).map((a) => (
                <AnimTile key={a.id} def={a} active={current?.name === a.id} onClick={() => choose(a.id)} photo={g.id === 'photo'} />
              ))}
            </div>
          </Section>
        ),
      )}
    </div>
  );
}

function AnimTile({ def, active, onClick, photo }: { def: AnimDef; active: boolean; onClick: () => void; photo?: boolean }) {
  const [hover, setHover] = useState(false);
  const name = def.directional ? `cream-${def.id}-up` : `cream-${def.id}`;
  const anim = hover ? `${name} ${def.group === 'emphasis' ? 1.2 : 1}s ${def.easing ?? 'cubic-bezier(.22,.9,.3,1)'} 0s infinite both` : undefined;
  return (
    <button
      className={'ct-tile' + (active ? ' active' : '')}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={`anim-${def.id}`}
      title={`${def.label} — hover to preview`}
    >
      <span className="ct-tile-box" style={{ background: 'var(--surface-2)' }}>
        <span className="ct-anim-sample" style={{ animation: anim, ...(photo ? { width: '100%', height: '100%', borderRadius: 0 } : {}) }}>
          {photo ? <Icon name="Mountain" size={22} /> : 'Aa'}
        </span>
      </span>
      <span className="lbl">{def.label}</span>
    </button>
  );
}

function Settings({ anim, tab, set }: { anim: Anim; tab: Tab; set: (fn: (a: Anim | undefined) => Anim | undefined, c?: string) => void }) {
  const def = animById(anim.name);
  const patch = (p: Partial<Anim>, c?: string) => set((a) => (a ? { ...a, ...p } : a), c);
  const [pathOpen, setPathOpen] = useState(false);
  return (
    <div className="ct-settings" data-testid="anim-settings">
      <div className="row" style={{ marginBottom: 10 }}>
        <Icon name="Sparkles" size={16} style={{ color: 'var(--primary)' }} />
        <b className="grow">{def?.label ?? anim.name}</b>
        <button className="btn sm ghost" onClick={() => set(() => undefined)} data-testid="anim-remove">
          <Icon name="Trash2" size={14} /> Remove
        </button>
      </div>
      {def?.group !== 'emphasis' && (
        <>
          <div className="row" style={{ marginBottom: 6, gap: 4 }}>
            {SPEEDS.map((sp) => (
              <button key={sp.label} className={'chip' + (Math.abs(anim.duration - sp.v) < 0.01 ? ' active' : '')} style={{ height: 26, fontSize: 12, flex: 1, justifyContent: 'center' }} onClick={() => patch({ duration: sp.v })} data-testid={`anim-speed-${sp.label.toLowerCase()}`}>
                {sp.label}
              </button>
            ))}
          </div>
          <TSlider label="Duration (s)" value={anim.duration} min={0.1} max={10} step={0.1} onChange={(v) => patch({ duration: v }, 'anim-dur')} testId="anim-duration" />
          <div className="label" style={{ margin: '4px 0 6px' }}>Animate on</div>
          <Segmented
            value={anim.on}
            options={[
              { value: 'enter', label: 'Enter' },
              { value: 'exit', label: 'Exit' },
              { value: 'both', label: 'Both' },
            ]}
            onChange={(v) => patch({ on: v })}
          />
        </>
      )}
      {def?.directional && (
        <>
          <div className="label" style={{ margin: '10px 0 6px' }}>Direction</div>
          <div className="ct-row-btns">
            {(['up', 'down', 'left', 'right'] as const).map((d) => (
              <button key={d} className={'ct-opt' + ((anim.direction ?? 'up') === d ? ' active' : '')} onClick={() => patch({ direction: d })} title={d} data-testid={`anim-dir-${d}`} style={{ width: 44 }}>
                <Icon name={{ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d]} size={16} />
              </button>
            ))}
          </div>
        </>
      )}
      {tab === 'text' && (
        <>
          <div className="label" style={{ margin: '10px 0 6px' }}>Animate by</div>
          <Segmented
            value={anim.by ?? 'element'}
            options={[
              { value: 'element', label: 'Element' },
              { value: 'line', label: 'Line' },
              { value: 'word', label: 'Word' },
              { value: 'letter', label: 'Letter' },
            ]}
            onChange={(v) => patch({ by: v as Anim['by'] })}
          />
        </>
      )}
      {def?.group !== 'emphasis' && tab !== 'page' && (
        <>
          <div className="label" style={{ margin: '10px 0 6px' }}>Emphasis (loops while on screen)</div>
          <select className="select" value={anim.emphasis ?? ''} onChange={(e) => patch({ emphasis: e.target.value || undefined })} data-testid="anim-emphasis">
            <option value="">None</option>
            {ANIMATIONS.filter((a) => a.group === 'emphasis').map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </>
      )}
      {tab === 'page' && (
        <button
          className="btn sm block"
          style={{ marginTop: 10 }}
          onClick={() => {
            useEditor.getState().update((d) => d.pages.forEach((p) => (p.pageAnim = structuredClone(anim) as Draft<Anim>)));
            useApp.getState().toast('Animation applied to all pages');
          }}
          data-testid="anim-apply-all"
        >
          Apply to all pages
        </button>
      )}
      {tab !== 'page' && (
        <>
          <button className="btn sm block" style={{ marginTop: 10 }} onClick={() => setPathOpen(!pathOpen)} data-testid="anim-create-path">
            <Icon name="Route" size={14} /> {anim.path?.length ? 'Edit motion path' : 'Create an animation'}
          </button>
          {pathOpen && <MotionPath anim={anim} patch={patch} />}
        </>
      )}
    </div>
  );
}

/** "Create an animation": record a drag path on a mini page; stored as relative px offsets. */
function MotionPath({ anim, patch }: { anim: Anim; patch: (p: Partial<Anim>) => void }) {
  const design = useEditor((s) => s.design)!;
  const el = useSelected()[0] as El | undefined;
  const ref = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<{ x: number; y: number }[]>(anim.path ?? []);
  const W = 268;
  const scale = W / design.width;
  const H = design.height * scale;
  if (!el) return null;
  const cx = (el.x + el.w / 2) * scale;
  const cy = (el.y + el.h / 2) * scale;
  const down = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const rec: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    let straight = e.shiftKey;
    const move = (ev: PointerEvent) => {
      straight = ev.shiftKey;
      const p = { x: Math.round((ev.clientX - r.left - cx) / scale), y: Math.round((ev.clientY - r.top - cy) / scale) };
      if (straight) rec.splice(1, rec.length, p);
      else rec.push(p);
      setPts([...rec]);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (rec.length > 1) patch({ path: rec.filter((_, i) => i % 2 === 0 || i === rec.length - 1) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <div style={{ marginTop: 10 }}>
      <div className="faint" style={{ marginBottom: 6 }}>Drag from the element to draw its path (hold Shift for a straight line).</div>
      <div ref={ref} className="ct-path-pad" style={{ width: W, height: H }} onPointerDown={down} data-testid="motion-pad">
        <div style={{ position: 'absolute', left: el.x * scale, top: el.y * scale, width: el.w * scale, height: el.h * scale, background: 'var(--primary-soft)', border: '1px solid var(--primary)', borderRadius: 3 }} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {pts.length > 1 && <polyline points={pts.map((p) => `${cx + p.x * scale},${cy + p.y * scale}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 3" />}
          {pts.length > 1 && <circle cx={cx + pts[pts.length - 1].x * scale} cy={cy + pts[pts.length - 1].y * scale} r={4} fill="var(--primary)" />}
        </svg>
      </div>
      <div className="label" style={{ margin: '8px 0 6px' }}>Movement style</div>
      <Segmented
        value={anim.pathStyle ?? 'original'}
        options={[
          { value: 'original', label: 'Original' },
          { value: 'smooth', label: 'Smooth' },
          { value: 'steady', label: 'Steady' },
        ]}
        onChange={(v) => patch({ pathStyle: v as Anim['pathStyle'] })}
      />
      <Toggle label="Orient element to path" on={!!anim.orientToPath} onChange={(v) => patch({ orientToPath: v })} />
      {pts.length > 1 && (
        <button
          className="btn sm ghost block"
          onClick={() => {
            setPts([]);
            patch({ path: undefined });
          }}
        >
          Clear path
        </button>
      )}
    </div>
  );
}

/** Magic Animate: varied, type-aware animations for every element on every page + page styles. */
function magicAnimate() {
  const pageStyles = ['rise', 'pan', 'fade', 'drift', 'succession', 'breathe'];
  useEditor.getState().update((d) => {
    d.pages.forEach((p: Draft<Page>, pi) => {
      const style = pageStyles[pi % pageStyles.length];
      p.pageAnim = { name: style, duration: 0.8, on: 'enter', direction: animById(style)?.directional ? 'up' : undefined };
      // order by size: big things first, text after
      p.elements.forEach((e: Draft<El>, i) => {
        let name = 'fade';
        if (e.type === 'text') {
          const big = e.fontSize >= 40;
          name = big ? (['ascend', 'rise', 'baseline'] as const)[(pi + i) % 3] : (['fade', 'shift', 'succession'] as const)[(pi + i) % 3];
          e.anim = { name, duration: big ? 1 : 0.8, on: 'enter', by: big ? 'word' : 'line', direction: animById(name)?.directional ? 'up' : undefined };
          return;
        }
        if (e.type === 'image' || e.type === 'video' || e.type === 'frame' || e.type === 'grid') name = (['photo-zoom', 'photo-rise', 'photo-flow'] as const)[(pi + i) % 3];
        else if (e.type === 'shape' || e.type === 'svg') name = (['pop', 'breathe', 'drift'] as const)[(pi + i) % 3];
        else if (e.type === 'chart') name = 'rise';
        else name = 'fade';
        e.anim = { name, duration: 0.8, on: 'enter', direction: animById(name)?.directional ? (['up', 'left', 'right'] as const)[i % 3] : undefined };
      });
    });
  });
  useApp.getState().toast('Magic Animate applied to every page', 'success');
}
