import { useState } from 'react';
import type { Draft } from 'immer';
import type { Transition } from '../model/types';
import { useCurrentPage, useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { Icon } from '../ui/ui';
import { TSlider } from './common';
import './toolbar.css';

const TYPES: { id: Transition['type']; label: string; kf?: string; dir?: boolean }[] = [
  { id: 'none', label: 'None' },
  { id: 'match-move', label: 'Match & Move', kf: 'ct-t-match' },
  { id: 'dissolve', label: 'Dissolve', kf: 'ct-t-dissolve' },
  { id: 'slide', label: 'Slide', kf: 'ct-t-slide', dir: true },
  { id: 'circle-wipe', label: 'Circle wipe', kf: 'ct-t-circle' },
  { id: 'line-wipe', label: 'Line wipe', kf: 'ct-t-line', dir: true },
  { id: 'color-wipe', label: 'Color wipe', kf: 'ct-t-color', dir: true },
  { id: 'flow', label: 'Flow', kf: 'ct-t-flow', dir: true },
  { id: 'stack', label: 'Stack and crop', kf: 'ct-t-stack', dir: true },
  { id: 'zoom', label: 'Zoom', kf: 'ct-t-zoom' },
];

export default function TransitionPanel() {
  const page = useCurrentPage();
  const pages = useEditor((s) => s.design?.pages);
  if (!page || !pages) return null;
  const idx = pages.findIndex((p) => p.id === page.id);
  const tr = page.transition;
  const cur = tr?.type ?? 'none';
  const def = TYPES.find((t) => t.id === cur);
  const set = (patch: Partial<Transition> | null, coalesce?: string) =>
    useEditor.getState().update(
      (d) => {
        const p = d.pages.find((x) => x.id === page.id);
        if (!p) return;
        if (!patch || patch.type === 'none') delete p.transition;
        else p.transition = { type: 'dissolve', duration: 0.6, ...(p.transition ?? {}), ...patch } as Draft<Transition>;
      },
      { coalesce },
    );
  const isLast = idx === pages.length - 1;
  return (
    <div data-testid="transition-panel">
      <div className="faint" style={{ marginBottom: 12 }}>
        {isLast ? (
          <>
            <Icon name="Info" size={12} /> Page {idx + 1} is the last page — the transition plays when looping or when you add a page after it.
          </>
        ) : (
          <>
            Transition between page {idx + 1} and page {idx + 2}
          </>
        )}
      </div>
      <div className="ct-tiles">
        {TYPES.map((t) => (
          <TransTile key={t.id} t={t} active={cur === t.id} onClick={() => set(t.id === 'none' ? null : { type: t.id })} />
        ))}
      </div>
      {tr && cur !== 'none' && (
        <div className="ct-settings" data-testid="transition-settings">
          <TSlider label="Duration (s)" value={tr.duration} min={0.1} max={2.5} step={0.1} onChange={(v) => set({ duration: v }, 'tr-dur')} testId="transition-duration" />
          {def?.dir && (
            <>
              <div className="label" style={{ margin: '4px 0 6px' }}>Direction</div>
              <div className="ct-row-btns">
                {(['left', 'right', 'up', 'down'] as const).map((d) => (
                  <button key={d} className={'ct-opt' + ((tr.direction ?? 'left') === d ? ' active' : '')} style={{ width: 44 }} onClick={() => set({ direction: d })} data-testid={`transition-dir-${d}`}>
                    <Icon name={{ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d]} size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <button
          className="btn block"
          disabled={!tr}
          data-testid="transition-apply-all"
          onClick={() => {
            useEditor.getState().update((d) =>
              d.pages.forEach((p, i) => {
                if (i < d.pages.length - 1 || d.pages.length === 1) p.transition = structuredClone(tr!) as Draft<Transition>;
              }),
            );
            useApp.getState().toast('Transition applied between all pages');
          }}
        >
          Apply between all pages
        </button>
        {tr && (
          <button className="btn ghost block" style={{ marginTop: 6 }} onClick={() => set(null)} data-testid="transition-remove">
            Remove transition
          </button>
        )}
      </div>
    </div>
  );
}

function TransTile({ t, active, onClick }: { t: (typeof TYPES)[number]; active: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button className={'ct-tile' + (active ? ' active' : '')} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-testid={`transition-${t.id}`}>
      <span className="ct-tile-box">
        {t.id === 'none' ? (
          <Icon name="Ban" size={24} style={{ color: 'var(--text-3)' }} />
        ) : (
          <>
            <span className="ct-trans-a" />
            <span className="ct-trans-b" style={hover ? { animation: `${t.kf} 1.4s ease-in-out infinite both` } : { clipPath: 'inset(0 0 0 55%)' }} />
          </>
        )}
      </span>
      <span className="lbl">{t.label}</span>
    </button>
  );
}
