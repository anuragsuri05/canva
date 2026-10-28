// Sticky notes tab: pick a colour to add a sticky note (whiteboard style).
import { STICKY_COLORS } from '../model/defaults';
import { insertSticky } from '../editor/dnd';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { Icon } from '../ui/ui';

const NAMES = ['Yellow', 'Orange', 'Pink', 'Blue', 'Green', 'Purple', 'White'];

export default function StickiesPanel() {
  const user = useApp((s) => s.settings.userName);
  return (
    <div className="pn" data-testid="stickies-panel">
      <button className="btn primary block lg" onClick={() => useEditor.getState().design && insertSticky()} data-testid="add-sticky">
        <Icon name="StickyNote" size={18} /> Add a sticky note
      </button>
      <p className="faint" style={{ margin: '8px 0 0' }}>
        Shortcut: press S on the canvas. Notes are signed by {user || 'you'}.
      </p>
      <h4>Colours</h4>
      <div className="pn-grid c3" style={{ gap: 10 }}>
        {STICKY_COLORS.map((c, i) => (
          <button
            key={c}
            className="pn-tile sq"
            style={{ background: c, boxShadow: '0 2px 6px rgba(0,0,0,.12)', borderRadius: 4, alignItems: 'start', justifyItems: 'start', padding: 10, color: '#3a3646', fontSize: 12, fontWeight: 500 }}
            data-testid={`sticky-${i}`}
            onClick={() => useEditor.getState().design && insertSticky(c)}
            title={`${NAMES[i] ?? ''} sticky note`}
          >
            {NAMES[i]}
          </button>
        ))}
      </div>
    </div>
  );
}
