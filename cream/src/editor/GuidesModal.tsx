import { useState } from 'react';
import { Modal } from '../ui/ui';
import { useEditor } from '../store/editor';

const PRESETS = [
  { id: '3col', label: '3 columns', cols: 3, rows: 0 },
  { id: '6col', label: '6 columns', cols: 6, rows: 0 },
  { id: '12col', label: '12 columns', cols: 12, rows: 0 },
  { id: '3x3', label: '3×3 grid', cols: 3, rows: 3 },
];

export default function GuidesModal({ onClose }: { onClose: () => void }) {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(0);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(0);
  const apply = () => {
    const d = useEditor.getState().design!;
    const guides: { axis: 'x' | 'y'; pos: number }[] = [];
    const add = (axis: 'x' | 'y', total: number, n: number) => {
      if (n < 1) return;
      const inner = total - margin * 2 - gap * (n - 1);
      const cw = inner / n;
      guides.push({ axis, pos: margin });
      for (let i = 0; i < n; i++) {
        const start = margin + i * (cw + gap);
        if (i > 0) guides.push({ axis, pos: start });
        if (gap > 0 || i === n - 1) guides.push({ axis, pos: start + cw });
      }
    };
    add('x', d.width, cols);
    add('y', d.height, rows);
    useEditor.getState().update((dd) => {
      dd.settings = { ...(dd.settings ?? {}), guides, rulers: true };
    });
    onClose();
  };
  return (
    <Modal
      title="Add guides"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={apply} data-testid="apply-guides">
            Add guides
          </button>
        </>
      }
    >
      <div className="chips" style={{ marginBottom: 16 }}>
        {PRESETS.map((p) => (
          <button key={p.id} className={'chip' + (cols === p.cols && rows === p.rows ? ' active' : '')} onClick={() => (setCols(p.cols), setRows(p.rows))}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 12 }}>
        {[
          ['Columns', cols, setCols],
          ['Rows', rows, setRows],
          ['Gap (px)', gap, setGap],
          ['Margin (px)', margin, setMargin],
        ].map(([l, v, set]: any) => (
          <div className="field grow" key={l}>
            <label>{l}</label>
            <input className="input" type="number" min={0} value={v} onChange={(e) => set(Math.max(0, Number(e.target.value)))} onKeyDown={(e) => e.stopPropagation()} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
