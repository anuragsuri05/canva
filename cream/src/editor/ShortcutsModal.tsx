import { useState } from 'react';
import { Modal, MOD, ALT } from '../ui/ui';

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'General',
    items: [
      ['Undo', `${MOD}+Z`],
      ['Redo', `${MOD}+Y / ${MOD}+⇧+Z`],
      ['Copy / Cut / Paste', `${MOD}+C / X / V`],
      ['Duplicate', `${MOD}+D`],
      ['Select all', `${MOD}+A`],
      ['Deselect / exit', 'Esc'],
      ['Delete', 'Delete / Backspace'],
      ['Save', `${MOD}+S`],
      ['Find and replace', `${MOD}+F`],
      ['Add link', `${MOD}+K`],
      ['Keyboard shortcuts', `${MOD}+/ or ?`],
    ],
  },
  {
    group: 'Add elements',
    items: [
      ['Text box', 'T'],
      ['Rectangle', 'R'],
      ['Circle', 'C'],
      ['Line', 'L'],
      ['Draw', 'D'],
      ['Sticky note (whiteboard)', 'S'],
    ],
  },
  {
    group: 'Arrange',
    items: [
      ['Group / Ungroup', `${MOD}+G / ${MOD}+⇧+G`],
      ['Bring forward / Send backward', `${MOD}+] / ${MOD}+[`],
      ['Bring to front / Send to back', `${MOD}+${ALT}+] / [`],
      ['Lock / unlock', `${ALT}+⇧+L`],
      ['Tidy up', `${ALT}+⇧+T`],
      ['Next / previous element', 'Tab / ⇧+Tab'],
      ['Nudge / big nudge', 'Arrows / ⇧+Arrows'],
      ['Duplicate by dragging', `${ALT}+drag`],
      ['Keep proportions', '⇧+drag corner'],
      ['Rotate in 15° steps', '⇧+rotate'],
    ],
  },
  {
    group: 'Text',
    items: [
      ['Bold / Italic / Underline', `${MOD}+B / I / U`],
      ['Uppercase', `${MOD}+⇧+K`],
      ['Align left / centre / right / justify', `${MOD}+⇧+L / C / R / J`],
      ['Font size − / +', `${MOD}+⇧+, / .`],
      ['Line spacing − / +', `${MOD}+${ALT}+↓ / ↑`],
      ['Letter spacing − / +', `${MOD}+${ALT}+, / .`],
      ['Anchor top / middle / bottom', `${MOD}+⇧+H / M / B`],
      ['Numbered / bulleted list', `${MOD}+⇧+7 / 8`],
      ['Copy / paste style', `${MOD}+${ALT}+C / V`],
      ['Open font menu', `${MOD}+⇧+F`],
      ['Edit selected text', 'Enter'],
    ],
  },
  {
    group: 'View',
    items: [
      ['Zoom in / out', `${MOD}+= / ${MOD}+-`],
      ['Actual size / Fit / Fill', `${MOD}+0 / ${MOD}+${ALT}+0 / ${MOD}+⇧+0`],
      ['Rulers & guides', '⇧+R'],
      ['Scroll / Thumbnail / Grid view', `${MOD}+${ALT}+1 / 2 / 3`],
      ['Present full screen', `${MOD}+${ALT}+P`],
      ['Pan canvas', 'Space+drag'],
      ['Zoom with wheel', `${MOD}+scroll`],
    ],
  },
  {
    group: 'Pages, video & comments',
    items: [
      ['Add page', `${MOD}+Enter`],
      ['Delete empty page', `${MOD}+Backspace`],
      ['Previous / next page', '← / → (nothing selected)'],
      ['Play / pause', 'Space'],
      ['Mute video', 'M'],
      ['Add comment', `${MOD}+${ALT}+N`],
    ],
  },
  {
    group: 'While presenting (Magic Shortcuts)',
    items: [
      ['Blur', 'B'],
      ['Confetti', 'C'],
      ['Drumroll', 'D'],
      ['Mic drop', 'M'],
      ['Bubbles', 'O'],
      ['Quiet', 'Q'],
      ['Curtain call', 'U'],
      ['Countdown timer (minutes)', '1 – 9'],
      ['Clear effects', 'X'],
      ['Next / previous slide', '→ / ←'],
    ],
  },
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} size="wide" testId="shortcuts-modal">
      <div className="search" style={{ marginBottom: 14 }}>
        <input placeholder="Search shortcuts" value={q} onChange={(e) => setQ(e.target.value)} autoFocus onKeyDown={(e) => e.stopPropagation()} />
      </div>
      <div style={{ columns: 2, columnGap: 28 }}>
        {SHORTCUTS.map((g) => {
          const items = g.items.filter(([a]) => a.toLowerCase().includes(q.toLowerCase()));
          if (!items.length) return null;
          return (
            <div key={g.group} style={{ breakInside: 'avoid', marginBottom: 16 }}>
              <div className="menu-title" style={{ paddingLeft: 0 }}>
                {g.group}
              </div>
              {items.map(([a, b]) => (
                <div key={a} className="row" style={{ justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{a}</span>
                  <kbd style={{ fontFamily: 'inherit', fontSize: 12, background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>{b}</kbd>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
