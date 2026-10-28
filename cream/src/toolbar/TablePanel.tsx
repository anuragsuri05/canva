import type { Draft } from 'immer';
import type { TableCell, TableEl } from '../model/types';
import { useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, Toggle } from '../ui/ui';
import { ColorSwatch, Section, TSlider } from './common';
import { useTbLocal } from './local';
import './toolbar.css';

type T = Draft<TableEl>;
const blank = (): TableCell => ({ html: '' });
const span = (c: TableCell) => ({ cs: c.colspan ?? 1, rs: c.rowspan ?? 1 });

/** The visible (anchor) cell covering (r, c). */
function anchorOf(t: TableEl | T, r: number, c: number): { r: number; c: number } | null {
  for (let i = 0; i <= r; i++)
    for (let j = 0; j <= c; j++) {
      const cell = t.cells[i]?.[j];
      if (!cell || cell.hidden) continue;
      const { cs, rs } = span(cell);
      if (i + rs > r && j + cs > c) return { r: i, c: j };
    }
  return null;
}

function insertRow(t: T, at: number) {
  const cols = t.colWidths.length;
  const row: TableCell[] = Array.from({ length: cols }, blank);
  const bumped = new Set<string>();
  if (at < t.cells.length)
    for (let c = 0; c < cols; c++) {
      const a = anchorOf(t, at, c);
      if (a && a.r < at) {
        row[c].hidden = true;
        const k = a.r + ':' + a.c;
        if (!bumped.has(k)) {
          bumped.add(k);
          t.cells[a.r][a.c].rowspan = (t.cells[a.r][a.c].rowspan ?? 1) + 1;
        }
      }
    }
  t.cells.splice(at, 0, row as Draft<TableCell>[]);
  t.rowHeights.splice(at, 0, t.rowHeights[Math.min(at, t.rowHeights.length - 1)] ?? 44);
  t.h += t.rowHeights[at];
}

function deleteRow(t: T, at: number) {
  if (t.cells.length <= 1) return;
  const cols = t.colWidths.length;
  for (let c = 0; c < cols; c++) {
    const a = anchorOf(t, at, c);
    if (!a) continue;
    const cell = t.cells[a.r][a.c];
    const { rs } = span(cell);
    if (rs <= 1) continue;
    if (a.r < at) {
      if (a.c === c) cell.rowspan = rs - 1;
    } else if (a.r === at && a.c === c) {
      // move the anchor down one row
      const below = t.cells[at + 1][c];
      Object.assign(below, { ...structuredClone(cell), rowspan: rs - 1, hidden: false });
    }
  }
  t.h -= t.rowHeights[at] ?? 0;
  t.cells.splice(at, 1);
  t.rowHeights.splice(at, 1);
}

function insertCol(t: T, at: number) {
  const n = t.colWidths.length;
  const bumped = new Set<string>();
  t.cells.forEach((row, r) => {
    const cell = blank();
    if (at < n) {
      const a = anchorOf(t, r, at);
      if (a && a.c < at) {
        cell.hidden = true;
        const k = a.r + ':' + a.c;
        if (!bumped.has(k)) {
          bumped.add(k);
          t.cells[a.r][a.c].colspan = (t.cells[a.r][a.c].colspan ?? 1) + 1;
        }
      }
    }
    row.splice(at, 0, cell as Draft<TableCell>);
  });
  t.colWidths.splice(at, 0, 1 / n);
  const sum = t.colWidths.reduce((a, b) => a + b, 0);
  t.colWidths = t.colWidths.map((w) => w / sum);
}

function deleteCol(t: T, at: number) {
  if (t.colWidths.length <= 1) return;
  t.cells.forEach((row, r) => {
    const a = anchorOf(t, r, at);
    if (!a) return;
    const cell = t.cells[a.r][a.c];
    const { cs } = span(cell);
    if (cs <= 1) return;
    if (a.c < at) {
      if (a.r === r) cell.colspan = cs - 1;
    } else if (a.c === at && a.r === r) {
      Object.assign(t.cells[r][at + 1], { ...structuredClone(cell), colspan: cs - 1, hidden: false });
    }
  });
  t.cells.forEach((row) => row.splice(at, 1));
  t.colWidths.splice(at, 1);
  const sum = t.colWidths.reduce((a, b) => a + b, 0);
  t.colWidths = t.colWidths.map((w) => w / sum);
}

function merge(t: T, r: number, c: number, dir: 'right' | 'down'): boolean {
  const cell = t.cells[r]?.[c];
  if (!cell || cell.hidden) return false;
  const { cs, rs } = span(cell);
  const nr = dir === 'down' ? r + rs : r;
  const nc = dir === 'right' ? c + cs : c;
  const next = t.cells[nr]?.[nc];
  if (!next || next.hidden) return false;
  const ns = span(next);
  if (dir === 'right' && ns.rs !== rs) return false;
  if (dir === 'down' && ns.cs !== cs) return false;
  if (next.html && next.html.replace(/<br\s*\/?>|&nbsp;|\s/g, '')) cell.html = (cell.html ? cell.html + ' ' : '') + next.html;
  if (dir === 'right') cell.colspan = cs + ns.cs;
  else cell.rowspan = rs + ns.rs;
  const fs = span(cell);
  for (let i = r; i < r + fs.rs; i++)
    for (let j = c; j < c + fs.cs; j++) {
      if (i === r && j === c) continue;
      t.cells[i][j] = { html: '', hidden: true } as Draft<TableCell>;
    }
  return true;
}

function unmerge(t: T, r: number, c: number) {
  const cell = t.cells[r]?.[c];
  if (!cell) return;
  const { cs, rs } = span(cell);
  for (let i = r; i < r + rs; i++)
    for (let j = c; j < c + cs; j++) {
      const x = t.cells[i]?.[j];
      if (!x) continue;
      delete x.hidden;
      delete x.colspan;
      delete x.rowspan;
    }
}

export default function TablePanel() {
  const el = useSelected().find((e): e is TableEl => e.type === 'table');
  const cellSel = useTbLocal((s) => s.tableCell);
  if (!el) return <div className="empty">Select a table to edit it.</div>;
  const rows = el.cells.length;
  const cols = el.colWidths.length;
  let r = Math.min(cellSel?.r ?? 0, rows - 1);
  let c = Math.min(cellSel?.c ?? 0, cols - 1);
  const anc = anchorOf(el, r, c);
  if (anc) ({ r, c } = anc);
  const cell = el.cells[r][c];
  const merged = (cell.colspan ?? 1) > 1 || (cell.rowspan ?? 1) > 1;

  const upd = (fn: (t: T) => void, coalesce?: string) => useEditor.getState().updateEl(el.id, (e) => fn(e as T), coalesce ? { coalesce } : undefined);
  const setCell = (fn: (x: Draft<TableCell>) => void) => upd((t) => fn(t.cells[r][c]));
  const pick = (rr: number, cc: number) => useTbLocal.setState({ tableCell: { r: rr, c: cc } });
  const toast = useApp.getState().toast;

  return (
    <div data-testid="table-panel">
      <Section title={`Cell · row ${r + 1}, column ${c + 1}`}>
        <div className="ct-mini-table" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, marginBottom: 10 }} data-testid="table-cell-picker">
          {el.cells.map((row, ri) =>
            row.map((x, ci) => {
              const a = anchorOf(el, ri, ci);
              const on = a?.r === r && a?.c === c;
              return (
                <button
                  key={ri + ':' + ci}
                  className={(on ? 'active' : '') + (x.hidden ? ' hiddenc' : '')}
                  style={{ background: on ? undefined : x.fill ?? (ri === 0 ? el.headerFill : undefined) }}
                  onClick={() => pick(ri, ci)}
                  data-testid={`pick-cell-${ri}-${ci}`}
                  title={`Row ${ri + 1}, column ${ci + 1}`}
                >
                  {x.html ? x.html.replace(/<[^>]+>/g, '').slice(0, 6) : ''}
                </button>
              );
            }),
          )}
        </div>
        <div className="ct-grid2">
          <button className="btn sm" onClick={() => upd((t) => insertRow(t, r))} data-testid="table-row-above">
            <Icon name="ArrowUpToLine" size={14} /> Add row above
          </button>
          <button className="btn sm" onClick={() => upd((t) => insertRow(t, r + (cell.rowspan ?? 1)))} data-testid="table-row-below">
            <Icon name="ArrowDownToLine" size={14} /> Add row below
          </button>
          <button className="btn sm" onClick={() => upd((t) => insertCol(t, c))} data-testid="table-col-left">
            <Icon name="ArrowLeftToLine" size={14} /> Add column left
          </button>
          <button className="btn sm" onClick={() => upd((t) => insertCol(t, c + (cell.colspan ?? 1)))} data-testid="table-col-right">
            <Icon name="ArrowRightToLine" size={14} /> Add column right
          </button>
          <button
            className="btn sm"
            disabled={rows <= 1}
            onClick={() => {
              upd((t) => deleteRow(t, r));
              pick(Math.max(0, r - 1), c);
            }}
            data-testid="table-del-row"
          >
            <Icon name="Trash2" size={14} /> Delete row
          </button>
          <button
            className="btn sm"
            disabled={cols <= 1}
            onClick={() => {
              upd((t) => deleteCol(t, c));
              pick(r, Math.max(0, c - 1));
            }}
            data-testid="table-del-col"
          >
            <Icon name="Trash2" size={14} /> Delete column
          </button>
          <button className="btn sm" onClick={() => upd((t) => void (merge(t, r, c, 'right') || toast('Can’t merge with the cell on the right', 'error')))} data-testid="table-merge-right">
            <Icon name="TableCellsMerge" size={14} /> Merge right
          </button>
          <button className="btn sm" onClick={() => upd((t) => void (merge(t, r, c, 'down') || toast('Can’t merge with the cell below', 'error')))} data-testid="table-merge-down">
            <Icon name="TableCellsMerge" size={14} /> Merge down
          </button>
        </div>
        {merged && (
          <button className="btn sm block" style={{ marginTop: 6 }} onClick={() => upd((t) => unmerge(t, r, c))} data-testid="table-unmerge">
            <Icon name="TableCellsSplit" size={14} /> Unmerge
          </button>
        )}
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <ColorSwatch value={cell.fill ?? '#ffffff'} onChange={(v) => setCell((x) => void (x.fill = v))} title="Cell color" testId="table-cell-fill" />
          <button className="btn sm ghost" onClick={() => setCell((x) => void delete x.fill)} title="No fill">
            <Icon name="Ban" size={14} />
          </button>
          <div className="seg">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} className={(cell.align ?? 'left') === a ? 'active' : ''} onClick={() => setCell((x) => void (x.align = a))} data-testid={`table-align-${a}`}>
                <Icon name={a === 'left' ? 'AlignLeft' : a === 'center' ? 'AlignCenter' : 'AlignRight'} size={14} />
              </button>
            ))}
          </div>
          <button className={'icon-btn' + (cell.bold ? ' active' : '')} onClick={() => setCell((x) => void (x.bold = !x.bold))} data-testid="table-bold" title="Bold">
            <Icon name="Bold" size={16} />
          </button>
          <button className="icon-btn" onClick={() => setCell((x) => void (x.html = ''))} title="Clear cell" data-testid="table-clear">
            <Icon name="Eraser" size={16} />
          </button>
        </div>
        <button className="btn sm block" style={{ marginTop: 8 }} onClick={() => upd((t) => t.cells.forEach((row) => row.forEach((x) => (x.align = cell.align ?? 'left'))))}>
          Apply alignment to all cells
        </button>
      </Section>

      <Section title="Table">
        <Toggle
          label="Header row fill"
          on={!!el.headerFill}
          onChange={(v) => upd((t) => void (v ? (t.headerFill = '#f2ebff') : delete t.headerFill))}
          testId="table-header-toggle"
        />
        {el.headerFill && (
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="label">Header color</span>
            <ColorSwatch value={el.headerFill} onChange={(v) => upd((t) => void (t.headerFill = v), 'hf')} testId="table-header-fill" />
          </div>
        )}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="label">Border</span>
          <span className="row" style={{ gap: 6 }}>
            <select className="select" style={{ height: 30, width: 100 }} value={el.borderStyle} onChange={(e) => upd((t) => void (t.borderStyle = e.target.value as TableEl['borderStyle']))} data-testid="table-border-style">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="none">None</option>
            </select>
            <ColorSwatch value={el.borderColor} onChange={(v) => upd((t) => void (t.borderColor = v), 'bc')} testId="table-border-color" />
          </span>
        </div>
        <TSlider label="Border weight" value={el.borderWidth} min={0} max={20} onChange={(v) => upd((t) => void (t.borderWidth = v), 'bw')} testId="table-border-width" />
        <TSlider label="Cell spacing" value={el.cellPadding} min={0} max={60} onChange={(v) => upd((t) => void (t.cellPadding = v), 'cp')} testId="table-padding" />
        <div className="ct-grid2" style={{ marginTop: 4 }}>
          <button
            className="btn sm"
            onClick={() =>
              upd((t) => {
                const avg = t.rowHeights.reduce((a, b) => a + b, 0) / t.rowHeights.length;
                t.rowHeights = t.rowHeights.map(() => avg);
              })
            }
            data-testid="table-distribute-rows"
          >
            <Icon name="AlignVerticalSpaceAround" size={14} /> Distribute rows
          </button>
          <button className="btn sm" onClick={() => upd((t) => void (t.colWidths = t.colWidths.map(() => 1 / t.colWidths.length)))} data-testid="table-distribute-cols">
            <Icon name="AlignHorizontalSpaceAround" size={14} /> Distribute columns
          </button>
        </div>
      </Section>

      <Section title="Text">
        <button className="btn sm block" style={{ fontFamily: `'${el.fontFamily}'`, marginBottom: 8 }} onClick={() => useEditor.setState({ right: 'font' })} data-testid="table-font">
          <Icon name="Type" size={14} /> {el.fontFamily}
        </button>
        <TSlider label="Font size" value={el.fontSize} min={6} max={72} onChange={(v) => upd((t) => void (t.fontSize = v), 'tfs')} testId="table-font-size" />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label">Text color</span>
          <ColorSwatch value={el.color} onChange={(v) => upd((t) => void (t.color = v), 'tcol')} testId="table-text-color" />
        </div>
      </Section>
    </div>
  );
}
