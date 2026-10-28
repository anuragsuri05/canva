import { useEffect, useMemo, useState } from 'react';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import type { Design, El } from '../model/types';
import { Icon } from '../ui/ui';
import './collab.css';

interface Hit {
  elId: string;
  pageId: string;
  pageNo: number;
  cell?: [number, number];
  occ: number; // occurrence index within that html
  before: string;
  match: string;
  after: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function makeRe(q: string, matchCase: boolean, whole: boolean) {
  if (!q) return null;
  const body = whole ? `(?<![\\p{L}\\p{N}_])${esc(q)}(?![\\p{L}\\p{N}_])` : esc(q);
  return new RegExp(body, 'gu' + (matchCase ? '' : 'i'));
}

/** Text nodes of an html fragment, in order. */
function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) out.push(n as Text);
  return out;
}

function htmlFields(el: El): { html: string; cell?: [number, number] }[] {
  if (el.type === 'text' || el.type === 'sticky') return [{ html: el.html }];
  if (el.type === 'shape' && el.html) return [{ html: el.html }];
  if (el.type === 'table') return el.cells.flatMap((row, r) => row.map((c, ci) => ({ html: c.html, cell: [r, ci] as [number, number] })));
  return [];
}

function findHits(d: Design, re: RegExp): Hit[] {
  const hits: Hit[] = [];
  d.pages.forEach((p, pi) =>
    p.elements.forEach((el) =>
      htmlFields(el).forEach(({ html, cell }) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        let occ = 0;
        for (const t of textNodes(div)) {
          const s = t.data;
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(s))) {
            if (!m[0]) {
              re.lastIndex++;
              continue;
            }
            hits.push({ elId: el.id, pageId: p.id, pageNo: pi + 1, cell, occ: occ++, before: s.slice(Math.max(0, m.index - 24), m.index), match: m[0], after: s.slice(m.index + m[0].length, m.index + m[0].length + 24) });
          }
        }
      }),
    ),
  );
  return hits;
}

/** Replace occurrence `only` (or all when undefined) in an html string, editing text nodes only. */
function replaceIn(html: string, re: RegExp, rep: string, only?: number): { html: string; count: number } {
  const div = document.createElement('div');
  div.innerHTML = html;
  let occ = 0;
  let count = 0;
  for (const t of textNodes(div)) {
    t.data = t.data.replace(re, (m) => {
      const i = occ++;
      if (only === undefined || i === only) {
        count++;
        return rep;
      }
      return m;
    });
  }
  return { html: div.innerHTML, count };
}

export default function FindReplacePanel() {
  const design = useEditor((s) => s.design);
  const [q, setQ] = useState('');
  const [rep, setRep] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [whole, setWhole] = useState(false);
  const [cur, setCur] = useState(0);
  const re = useMemo(() => makeRe(q, matchCase, whole), [q, matchCase, whole]);
  const hits = useMemo(() => (design && re ? findHits(design, re) : []), [design, re]);
  useEffect(() => setCur(0), [q, matchCase, whole]);
  const idx = hits.length ? Math.min(cur, hits.length - 1) : -1;

  const goto = (i: number) => {
    if (!hits.length) return;
    const n = (i + hits.length) % hits.length;
    setCur(n);
    const h = hits[n];
    const ed = useEditor.getState();
    ed.setPage(h.pageId);
    ed.select([h.elId]);
    requestAnimationFrame(() => document.querySelector(`.page-frame [data-el-id="${h.elId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };

  const doReplace = (all: boolean) => {
    if (!re || !hits.length) return;
    let total = 0;
    const target = hits[idx];
    useEditor.getState().update((d) => {
      for (const p of d.pages)
        for (const el of p.elements) {
          if (!all && el.id !== target.elId) continue;
          const apply = (html: string, cell?: [number, number]) => {
            if (!all && (cell?.[0] !== target.cell?.[0] || cell?.[1] !== target.cell?.[1])) return html;
            const r = replaceIn(html, re, rep, all ? undefined : target.occ);
            total += r.count;
            return r.html;
          };
          if (el.type === 'text' || el.type === 'sticky') el.html = apply(el.html);
          else if (el.type === 'shape' && el.html) el.html = apply(el.html);
          else if (el.type === 'table') el.cells.forEach((row, r) => row.forEach((c, ci) => (c.html = apply(c.html, [r, ci]))));
        }
    });
    useApp.getState().toast(`Replaced ${total} match${total === 1 ? '' : 'es'}`, 'success');
  };

  return (
    <div data-testid="find-panel">
      <div className="field">
        <label>Find</label>
        <div className="search">
          <Icon name="Search" size={16} />
          <input
            autoFocus
            value={q}
            placeholder="Find text in this design"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') goto(e.shiftKey ? idx - 1 : idx + 1);
            }}
            data-testid="find-input"
          />
          <span className="faint" data-testid="find-count">
            {q ? (hits.length ? `${idx + 1} of ${hits.length}` : '0 results') : ''}
          </span>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="row" style={{ fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} data-testid="find-case" /> Match case
        </label>
        <label className="row" style={{ fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} data-testid="find-whole" /> Whole words
        </label>
        <span className="grow" />
        <button className="icon-btn" title="Previous (Shift+Enter)" onClick={() => goto(idx - 1)} disabled={!hits.length} data-testid="find-prev">
          <Icon name="ChevronUp" size={16} />
        </button>
        <button className="icon-btn" title="Next (Enter)" onClick={() => goto(idx + 1)} disabled={!hits.length} data-testid="find-next">
          <Icon name="ChevronDown" size={16} />
        </button>
      </div>
      <div className="field">
        <label>Replace with</label>
        <input className="input" value={rep} onChange={(e) => setRep(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Replacement text" data-testid="replace-input" />
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn grow" disabled={!hits.length} onClick={() => doReplace(false)} data-testid="replace-one">
          Replace
        </button>
        <button className="btn primary grow" disabled={!hits.length} onClick={() => doReplace(true)} data-testid="replace-all">
          Replace all
        </button>
      </div>
      {hits.map((h, i) => (
        <div key={i} className={'fr-hit' + (i === idx ? ' active' : '')} onClick={() => goto(i)} data-testid="find-hit">
          <div className="faint">Page {h.pageNo}</div>
          …{h.before}
          <mark>{h.match}</mark>
          {h.after}…
        </div>
      ))}
    </div>
  );
}
