import { useMemo, useState } from 'react';
import { useEditor } from '../store/editor';
import type { Design, El, Fill, Page } from '../model/types';
import { Icon } from '../ui/ui';
import { elBounds } from '../model/geometry';
import { elementText } from './InsightsPanel';
import './collab.css';

/* ---------- colour maths (WCAG 2.1) ---------- */

type RGB = [number, number, number];

export function parseColor(c?: string): RGB | null {
  if (!c) return null;
  c = c.trim().toLowerCase();
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (isNaN(n)) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(/[ ,/]+/).map(Number);
    return [r, g, b];
  }
  const named: Record<string, RGB> = { white: [255, 255, 255], black: [0, 0, 0], red: [255, 0, 0], transparent: [255, 255, 255] };
  return named[c] ?? null;
}

const lin = (v: number) => {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
export const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function contrast(a: RGB, b: RGB) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** Nudge `fg` lighter/darker until it reaches `target` contrast on `bg` (keeps the hue). */
export function accessibleColor(fg: RGB, bg: RGB, target: number): string {
  const towardsWhite = luminance(bg) < 0.4;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c: RGB = fg.map((v) => (towardsWhite ? v + (255 - v) * t : v * (1 - t))) as RGB;
    if (contrast(c, bg) >= target) return toHex(c);
  }
  return towardsWhite ? '#ffffff' : '#000000';
}

function fillColor(f: Fill | undefined): RGB | null {
  if (!f) return null;
  if (f.kind === 'solid') return parseColor(f.color);
  if (f.kind === 'gradient' && f.stops.length) {
    const cs = f.stops.map((s) => parseColor(s.color)).filter(Boolean) as RGB[];
    if (!cs.length) return null;
    return cs.reduce((a, c) => [a[0] + c[0] / cs.length, a[1] + c[1] / cs.length, a[2] + c[2] / cs.length], [0, 0, 0] as RGB);
  }
  return null;
}

/** Colour behind the centre of element `i` on `page` (topmost solid layer below it). */
function backgroundBehind(page: Page, i: number): { rgb: RGB | null; over: string } {
  const el = page.elements[i];
  const b = elBounds(el);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  for (let j = i - 1; j >= 0; j--) {
    const u = page.elements[j];
    if (u.hidden || u.opacity < 0.5) continue;
    const ub = elBounds(u);
    if (cx < ub.x || cx > ub.x + ub.w || cy < ub.y || cy > ub.y + ub.h) continue;
    if (u.type === 'shape') return { rgb: fillColor(u.fill), over: 'shape' };
    if (u.type === 'sticky') return { rgb: parseColor(u.color), over: 'sticky note' };
    if (u.type === 'image' || u.type === 'video' || u.type === 'frame' || u.type === 'grid') return { rgb: null, over: 'image' };
  }
  if (el.type === 'shape') return { rgb: fillColor(el.fill), over: 'shape' };
  if (el.type === 'sticky') return { rgb: parseColor(el.color), over: 'sticky note' };
  if (page.backgroundImage || page.background.kind === 'image') return { rgb: null, over: 'background image' };
  return { rgb: fillColor(page.background), over: 'page' };
}

interface Issue {
  id: string;
  kind: 'contrast' | 'small' | 'alt' | 'image-text';
  sev: 'high' | 'medium' | 'low';
  el: El;
  page: Page;
  pageNo: number;
  title: string;
  detail: string;
  fg?: string;
  bg?: string;
  ratio?: number;
  target?: number;
  fix?: string; // suggested colour
}

function audit(d: Design): Issue[] {
  const issues: Issue[] = [];
  const ref = 1080 / Math.min(d.width, d.height); // normalise font sizes to a 1080px short edge
  d.pages.forEach((page, pi) =>
    page.elements.forEach((el, i) => {
      if (el.hidden) return;
      const text = elementText(el).trim();
      const base = { el, page, pageNo: pi + 1 };
      if (text && (el.type === 'text' || el.type === 'shape' || el.type === 'sticky')) {
        const fgStr = el.type === 'sticky' ? '#1f1f1f' : (el as any).color ?? '#1f1f1f';
        const fg = parseColor(fgStr);
        const size = (el as any).fontSize ?? 24;
        const bold = ((el as any).fontWeight ?? 400) >= 700;
        const large = size * ref >= 24 * 1.333 || (bold && size * ref >= 18.66 * 1.333);
        const target = large ? 3 : 4.5;
        const { rgb: bg, over } = backgroundBehind(page, i);
        if (fg && bg) {
          const ratio = contrast(fg, bg);
          if (ratio < target)
            issues.push({
              ...base,
              id: el.id + ':c',
              kind: 'contrast',
              sev: ratio < 2.5 ? 'high' : 'medium',
              title: 'Low color contrast',
              detail: `“${text.slice(0, 40)}” has a contrast of ${ratio.toFixed(2)}:1 on the ${over} (needs ${target}:1).`,
              fg: toHex(fg),
              bg: toHex(bg),
              ratio,
              target,
              fix: accessibleColor(fg, bg, target + 0.1),
            });
        } else if (fg && !bg)
          issues.push({ ...base, id: el.id + ':i', kind: 'image-text', sev: 'low', title: 'Text over an image', detail: `Check that “${text.slice(0, 40)}” is readable over the ${over}.` });
        if (size * ref < 16)
          issues.push({ ...base, id: el.id + ':s', kind: 'small', sev: 'medium', title: 'Small text', detail: `Text is ${Math.round(size)}px — it may be hard to read when shared or presented.` });
      }
      const media = el.type === 'image' || el.type === 'video' || (el.type === 'frame' && el.media.src) || (el.type === 'grid' && el.cells.some((c) => c.src)) || el.type === 'svg';
      if (media && !el.decorative && !el.alt?.trim())
        issues.push({ ...base, id: el.id + ':a', kind: 'alt', sev: el.type === 'svg' ? 'low' : 'high', title: 'Missing alt text', detail: `This ${el.type === 'svg' ? 'graphic' : el.type} has no alternative text for screen readers.` });
    }),
  );
  return issues;
}

const SEV = { high: '#e5484d', medium: '#f59f00', low: '#8d889c' };

function focusEl(i: Issue) {
  const ed = useEditor.getState();
  ed.setPage(i.page.id);
  ed.select([i.el.id]);
}

export default function AccessibilityPanel() {
  const design = useEditor((s) => s.design);
  const issues = useMemo(() => (design ? audit(design) : []), [design]);
  const [tab, setTab] = useState<'issues' | 'order'>('issues');
  const [alt, setAlt] = useState<Record<string, string>>({});
  if (!design) return null;
  const upd = (id: string, patch: Partial<El>) => useEditor.getState().updateEl(id, patch);
  const count = (k: Issue['kind']) => issues.filter((i) => i.kind === k).length;
  return (
    <div data-testid="a11y-panel">
      <div className="tabs">
        <button className={'tab' + (tab === 'issues' ? ' active' : '')} onClick={() => setTab('issues')}>
          Design check
        </button>
        <button className={'tab' + (tab === 'order' ? ' active' : '')} onClick={() => setTab('order')} data-testid="a11y-order-tab">
          Reading order
        </button>
      </div>
      {tab === 'issues' && (
        <>
          <div className="a11y-summary">
            <div>
              <b data-testid="a11y-contrast-count">{count('contrast')}</b>Contrast
            </div>
            <div>
              <b data-testid="a11y-alt-count">{count('alt')}</b>Alt text
            </div>
            <div>
              <b>{count('small')}</b>Small text
            </div>
          </div>
          {!issues.length && (
            <div className="empty" data-testid="a11y-clear">
              <Icon name="CircleCheck" size={30} style={{ color: 'var(--success)' }} />
              <div style={{ marginTop: 6 }}>Looks good! No accessibility issues found.</div>
            </div>
          )}
          {issues.map((i) => (
            <div key={i.id} className="a11y-item" data-testid={'a11y-issue-' + i.kind}>
              <div className="row">
                <span className="a11y-sev" style={{ background: SEV[i.sev] }} />
                <b className="grow">{i.title}</b>
                <span className="faint">Page {i.pageNo}</span>
              </div>
              <div className="muted" style={{ margin: '4px 0 8px' }}>
                {i.detail}
              </div>
              {i.kind === 'contrast' && (
                <div className="row" style={{ marginBottom: 8, fontSize: 12 }}>
                  <span className="a11y-swatch" style={{ background: i.fg }} /> on <span className="a11y-swatch" style={{ background: i.bg }} />
                  <span className="grow" />
                  Suggested <span className="a11y-swatch" style={{ background: i.fix }} /> {i.fix}
                </div>
              )}
              {i.kind === 'alt' && (
                <div className="row" style={{ marginBottom: 8 }}>
                  <input
                    className="input sm grow"
                    placeholder="Describe this image"
                    value={alt[i.el.id] ?? ''}
                    onChange={(e) => setAlt({ ...alt, [i.el.id]: e.target.value })}
                    onKeyDown={(e) => (e.stopPropagation(), e.key === 'Enter' && alt[i.el.id]?.trim() && upd(i.el.id, { alt: alt[i.el.id].trim() }))}
                    data-testid="a11y-alt-input"
                  />
                  <button className="btn sm primary" disabled={!alt[i.el.id]?.trim()} onClick={() => upd(i.el.id, { alt: alt[i.el.id].trim() })} data-testid="a11y-alt-save">
                    Save
                  </button>
                </div>
              )}
              <div className="row">
                <button className="btn sm" onClick={() => focusEl(i)} data-testid="a11y-focus">
                  <Icon name="Crosshair" size={14} /> Show
                </button>
                {i.kind === 'contrast' && (
                  <button className="btn sm primary" onClick={() => upd(i.el.id, { color: i.fix } as Partial<El>)} data-testid="a11y-fix-contrast">
                    Fix color
                  </button>
                )}
                {i.kind === 'small' && (
                  <button className="btn sm primary" onClick={() => upd(i.el.id, { fontSize: Math.ceil((16 * Math.min(design.width, design.height)) / 1080) } as Partial<El>)}>
                    Increase size
                  </button>
                )}
                {i.kind === 'alt' && (
                  <button className="btn sm ghost" onClick={() => upd(i.el.id, { decorative: true })} data-testid="a11y-decorative">
                    Mark as decorative
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {tab === 'order' && (
        <div data-testid="a11y-order">
          <div className="faint" style={{ marginBottom: 8 }}>
            Screen readers read elements from back to front. Use Position → Arrange to change the order.
          </div>
          {design.pages.map((p, pi) => (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, margin: '6px 0' }}>Page {pi + 1}</div>
              {p.elements
                .filter((e) => !e.hidden && !e.decorative)
                .map((e, n) => (
                  <div key={e.id} className="fr-hit" onClick={() => (useEditor.getState().setPage(p.id), useEditor.getState().select([e.id]))}>
                    <b>{n + 1}.</b> <span style={{ textTransform: 'capitalize' }}>{e.type}</span>
                    <span className="muted"> — {(elementText(e) || e.alt || e.name || '').slice(0, 50) || '(no text)'}</span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
