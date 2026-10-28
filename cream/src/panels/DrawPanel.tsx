// Draw tab: Pen, Marker, Highlighter, Glow pen, Eraser and Select, with colour, size and transparency.
import { useEffect, useRef } from 'react';
import { useEditor, type DrawTool } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, Slider } from '../ui/ui';

type ToolId = DrawTool['tool'] | 'select';

const TOOLS: { id: ToolId; label: string; icon: string; nib: string; width: number; opacity: number }[] = [
  { id: 'pen', label: 'Pen', icon: 'PenLine', nib: 'linear-gradient(#444,#111)', width: 4, opacity: 1 },
  { id: 'marker', label: 'Marker', icon: 'Highlighter', nib: 'linear-gradient(#666,#222)', width: 10, opacity: 1 },
  { id: 'highlighter', label: 'Highlighter', icon: 'Highlighter', nib: 'linear-gradient(#ffe066,#fab005)', width: 24, opacity: 0.45 },
  { id: 'glow', label: 'Glow pen', icon: 'Sparkles', nib: 'linear-gradient(#b98cff,#8b3dff)', width: 6, opacity: 1 },
  { id: 'eraser', label: 'Eraser', icon: 'Eraser', nib: 'linear-gradient(#ffc9c9,#fa5252)', width: 20, opacity: 1 },
  { id: 'select', label: 'Select', icon: 'MousePointer2', nib: '', width: 0, opacity: 1 },
];

const COLORS = ['#1d1a26', '#ffffff', '#e5484d', '#ff8a4c', '#fcc419', '#51cf66', '#22b8cf', '#339af0', '#8b3dff', '#f06595', '#8d6e63', '#868e96'];

// Remember per-tool settings for the session (Canva keeps them while you switch tools).
const memory: Partial<Record<DrawTool['tool'], DrawTool>> = {};

function activate(tool: DrawTool['tool']) {
  const t = TOOLS.find((x) => x.id === tool)!;
  const prev = useEditor.getState().draw;
  const next: DrawTool = memory[tool] ?? { tool, color: tool === 'highlighter' ? '#fcc419' : tool === 'glow' ? '#8b3dff' : prev?.color ?? '#1d1a26', width: t.width, opacity: t.opacity };
  useEditor.setState({ draw: next, selection: [], editingId: null });
}

function patch(p: Partial<DrawTool>) {
  const d = useEditor.getState().draw;
  if (!d) return;
  const next = { ...d, ...p };
  memory[d.tool] = next;
  useEditor.setState({ draw: next });
}

export default function DrawPanel() {
  const draw = useEditor((s) => s.draw);
  const lastTool = useRef<DrawTool['tool']>('pen');
  const brand = useApp((s) => s.brandKits[0]?.palettes[0]?.colors);
  const colorInput = useRef<HTMLInputElement>(null);
  if (draw) lastTool.current = draw.tool;

  // Opening the Draw tab starts with the pen; closing the tab exits drawing mode.
  useEffect(() => {
    if (!useEditor.getState().draw) activate('pen');
    return () => useEditor.setState({ draw: null });
  }, []);

  const active: ToolId = draw?.tool ?? 'select';
  const isEraser = draw?.tool === 'eraser';

  return (
    <div className="pn" data-testid="draw-panel">
      <h4 style={{ marginTop: 0 }}>Tools</h4>
      <div className="pn-tools" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={'pn-tool' + (active === t.id ? ' active' : '')}
            aria-pressed={active === t.id}
            data-testid={`draw-${t.id}`}
            onClick={() => (t.id === 'select' ? useEditor.setState({ draw: null }) : activate(t.id))}
            title={t.label}
          >
            {t.nib ? (
              <span className="nib" style={{ background: t.id === 'eraser' ? t.nib : `linear-gradient(to bottom, ${draw?.tool === t.id ? draw.color : 'transparent'} 0 22%, transparent 22%), ${t.nib}`, boxShadow: t.id === 'glow' ? '0 0 10px #b98cff' : undefined }} />
            ) : (
              <Icon name={t.icon} size={22} />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {draw && !isEraser && (
        <>
          <h4>Colour</h4>
          <div className="swatches" role="radiogroup" aria-label="Pen colour">
            <button className="swatch add" title="Custom colour" aria-label="Custom colour" onClick={() => colorInput.current?.click()} data-testid="draw-custom-color" />
            {COLORS.map((c) => (
              <button key={c} className={'swatch' + (draw.color.toLowerCase() === c ? ' active' : '')} style={{ background: c }} aria-label={c} onClick={() => patch({ color: c })} />
            ))}
          </div>
          <input ref={colorInput} type="color" value={draw.color} onChange={(e) => patch({ color: e.target.value })} hidden data-testid="draw-color-input" />
          {brand && brand.length > 0 && (
            <>
              <div className="faint" style={{ margin: '10px 0 6px' }}>Brand colours</div>
              <div className="swatches">
                {brand.map((c) => (
                  <button key={c} className={'swatch' + (draw.color.toLowerCase() === c.toLowerCase() ? ' active' : '')} style={{ background: c }} aria-label={c} onClick={() => patch({ color: c })} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {draw && (
        <>
          <h4>Settings</h4>
          <Slider label={isEraser ? 'Eraser size' : 'Size'} min={1} max={isEraser ? 80 : 60} value={draw.width} onChange={(v) => patch({ width: v })} testId="draw-size" />
          {!isEraser && <Slider label="Transparency" min={0} max={100} value={Math.round((1 - draw.opacity) * 100)} onChange={(v) => patch({ opacity: Math.max(0.05, 1 - v / 100) })} testId="draw-transparency" />}
          {!isEraser && (
            <div style={{ display: 'grid', placeItems: 'center', height: 70, background: 'var(--surface-2)', borderRadius: 10, marginTop: 6 }} aria-hidden>
              <svg width="220" height="50" viewBox="0 0 220 50">
                <path
                  d="M10,35 C50,5 80,45 120,22 S190,10 210,28"
                  fill="none"
                  stroke={draw.color}
                  strokeWidth={Math.min(30, draw.tool === 'marker' ? draw.width * 1.6 : draw.width)}
                  strokeOpacity={draw.tool === 'highlighter' ? Math.min(0.5, draw.opacity) : draw.opacity}
                  strokeLinecap={draw.tool === 'highlighter' ? 'butt' : 'round'}
                  style={draw.tool === 'glow' ? { filter: `drop-shadow(0 0 6px ${draw.color})` } : undefined}
                />
              </svg>
            </div>
          )}
          <p className="faint" style={{ marginTop: 12 }}>
            {isEraser ? 'Drag over a drawing to erase it.' : 'Draw anywhere on the page. Choose Select to stop drawing.'}
          </p>
        </>
      )}
      {!draw && (
        <div className="empty">
          You're in select mode.
          <br />
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => activate(lastTool.current === 'eraser' ? 'pen' : lastTool.current)}>
            Resume drawing
          </button>
        </div>
      )}
    </div>
  );
}
