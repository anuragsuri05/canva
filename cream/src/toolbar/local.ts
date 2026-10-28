// Toolbar-local shared state + helpers (selection range for partial text formatting, txn helpers).
import { create } from 'zustand';
import { useEditor } from '../store/editor';

interface ToolbarLocal {
  tableCell: { r: number; c: number } | null;
  paintArmed: string | null; // id of element whose style was copied with the paint roller
  set(p: Partial<ToolbarLocal>): void;
}

export const useTbLocal = create<ToolbarLocal>((set) => ({
  tableCell: null,
  paintArmed: null,
  set: (p) => set(p),
}));

/* ---------- Saved text selection (for partial formatting while editing) ---------- */

let savedRange: Range | null = null;

function editableHost(n: Node | null): HTMLElement | null {
  const el = n instanceof Element ? n : n?.parentElement;
  return (el?.closest('[contenteditable="true"]') as HTMLElement | null) ?? null;
}

if (typeof document !== 'undefined') {
  document.addEventListener('selectionchange', () => {
    const s = window.getSelection();
    if (!s || !s.rangeCount) return;
    const r = s.getRangeAt(0);
    const host = editableHost(r.commonAncestorContainer);
    if (!host || !host.closest('.page-frame')) return; // ignore selections in panels / inputs
    savedRange = r.collapsed ? null : r.cloneRange();
  });
  // Track focus inside table cells so the table panel knows the active cell.
  document.addEventListener('focusin', (e) => {
    const td = (e.target as HTMLElement)?.closest?.('[data-cell]') as HTMLElement | null;
    if (!td || !td.closest('.page-frame')) return;
    const [r, c] = (td.dataset.cell ?? '0:0').split(':').map(Number);
    useTbLocal.setState({ tableCell: { r, c } });
  });
}

/** Host + range of a live (non-collapsed) selection inside the element being edited. */
function liveSelection(): { host: HTMLElement; range: Range } | null {
  const ed = useEditor.getState().editingId;
  if (!ed || !savedRange) return null;
  const host = editableHost(savedRange.commonAncestorContainer);
  if (!host || !document.contains(host)) return null;
  const owner = host.closest('[data-el-id]') as HTMLElement | null;
  if (owner && owner.dataset.elId !== ed) return null;
  return { host, range: savedRange };
}

export const hasPartialSelection = () => !!liveSelection();

/** Run document.execCommand on the saved selection of the text being edited. Returns false if none. */
export function execOnSelection(cmd: string, value?: string): boolean {
  const live = liveSelection();
  if (!live) return false;
  live.host.focus();
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(live.range);
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  const ok = document.execCommand(cmd, false, value);
  // the input event triggered by execCommand persists html via Canvas onTextInput
  const s = window.getSelection();
  if (s?.rangeCount) savedRange = s.getRangeAt(0).collapsed ? savedRange : s.getRangeAt(0).cloneRange();
  return ok;
}

/* ---------- Transactions for slider drags ---------- */

let txnOpen = false;
/** Begin an undo transaction that ends on the next pointerup anywhere. */
export function startDrag() {
  if (txnOpen) return;
  txnOpen = true;
  useEditor.getState().begin();
  const end = () => {
    window.removeEventListener('pointerup', end, true);
    window.removeEventListener('pointercancel', end, true);
    txnOpen = false;
    useEditor.getState().commit();
  };
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
}

export const openRight = (id: NonNullable<ReturnType<typeof useEditor.getState>['right']>, extra: Record<string, unknown> = {}) => {
  const s = useEditor.getState();
  const same = s.right === id && !Object.keys(extra).length;
  useEditor.setState({ right: same ? null : id, ...extra } as any);
};
