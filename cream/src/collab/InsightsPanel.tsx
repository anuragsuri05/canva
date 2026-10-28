import { useMemo } from 'react';
import { useEditor } from '../store/editor';
import { htmlToText } from '../model/defaults';
import type { El } from '../model/types';
import { fmtDate } from '../ui/ui';
import './collab.css';

export function elementText(e: El): string {
  if (e.type === 'text' || e.type === 'sticky') return htmlToText(e.html);
  if (e.type === 'shape') return e.html ? htmlToText(e.html) : '';
  if (e.type === 'table') return e.cells.flat().map((c) => htmlToText(c.html)).join(' ');
  return '';
}

function readInsights(id: string) {
  try {
    return JSON.parse(localStorage.getItem('cream-insights-' + id) || '{}') as { views?: number; presents?: number; byDay?: Record<string, number>; lastViewed?: number };
  } catch {
    return {};
  }
}

export default function InsightsPanel() {
  const design = useEditor((s) => s.design);
  const stats = useMemo(() => {
    if (!design) return null;
    let words = 0;
    let els = 0;
    const types: Record<string, number> = {};
    for (const p of design.pages)
      for (const e of p.elements) {
        els++;
        types[e.type] = (types[e.type] ?? 0) + 1;
        const t = elementText(e).trim();
        if (t) words += t.split(/\s+/).length;
      }
    const duration = design.pages.reduce((s, p) => s + (p.duration || 0), 0);
    return { words, els, types, duration };
  }, [design]);
  if (!design || !stats) return null;
  const ins = readInsights(design.id);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { d, n: ins.byDay?.[d] ?? 0 };
  });
  const max = Math.max(1, ...days.map((x) => x.n));
  return (
    <div data-testid="insights-panel">
      <div className="in-grid">
        <div className="in-stat">
          <b data-testid="insights-views">{ins.views ?? 0}</b>
          <span>Views</span>
        </div>
        <div className="in-stat">
          <b>{ins.presents ?? 0}</b>
          <span>Times presented</span>
        </div>
        <div className="in-stat">
          <b data-testid="insights-pages">{design.pages.length}</b>
          <span>Pages</span>
        </div>
        <div className="in-stat">
          <b data-testid="insights-words">{stats.words}</b>
          <span>Words</span>
        </div>
        <div className="in-stat">
          <b>{stats.els}</b>
          <span>Elements</span>
        </div>
        <div className="in-stat">
          <b>{design.comments?.filter((c) => !c.resolved).length ?? 0}</b>
          <span>Open comments</span>
        </div>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13 }}>Views in the last 14 days</div>
      <div className="in-bars" title="Views per day">
        {days.map((x) => (
          <div key={x.d} style={{ height: `${(x.n / max) * 100}%` }} title={`${x.d}: ${x.n}`} />
        ))}
      </div>
      <div className="faint" style={{ marginBottom: 12 }}>Views are counted when someone opens the view link or presents this design on this device.</div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Content</div>
      {Object.entries(stats.types).map(([t, n]) => (
        <div key={t} className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
          <span style={{ textTransform: 'capitalize' }}>{t}</span>
          <span className="muted">{n}</span>
        </div>
      ))}
      <div className="faint" style={{ marginTop: 12 }}>
        Last edited {fmtDate(design.updatedAt)} · Created {new Date(design.createdAt).toLocaleDateString()}
        {ins.lastViewed ? ` · Last viewed ${fmtDate(ins.lastViewed)}` : ''} · Estimated reading time {Math.max(1, Math.round(stats.words / 200))} min · Video length {stats.duration.toFixed(0)}s
      </div>
    </div>
  );
}
