import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import './collab.css';

export default function NotesPanel() {
  const pages = useEditor((s) => s.design?.pages);
  const pageId = useEditor((s) => s.pageId);
  const designId = useEditor((s) => s.design?.id);
  if (!pages) return null;
  const idx = Math.max(0, pages.findIndex((p) => p.id === pageId));
  const page = pages[idx];
  const words = page.notes.trim() ? page.notes.trim().split(/\s+/).length : 0;
  return (
    <div className="col" style={{ height: '100%' }} data-testid="notes-panel">
      <div className="row">
        <select className="select grow" value={page.id} onChange={(e) => useEditor.getState().setPage(e.target.value)} data-testid="notes-page">
          {pages.map((p, i) => (
            <option key={p.id} value={p.id}>
              Page {i + 1}
              {p.title ? ` – ${p.title}` : ''}
              {p.notes.trim() ? ' •' : ''}
            </option>
          ))}
        </select>
        <button className="icon-btn" disabled={idx === 0} onClick={() => useEditor.getState().setPage(pages[idx - 1].id)} title="Previous page">
          ‹
        </button>
        <button className="icon-btn" disabled={idx === pages.length - 1} onClick={() => useEditor.getState().setPage(pages[idx + 1].id)} title="Next page">
          ›
        </button>
      </div>
      <textarea
        className="textarea"
        style={{ flex: 1, minHeight: 260, fontSize: 14 }}
        placeholder="Add notes to your design… They're shown in Presenter view."
        value={page.notes}
        onChange={(e) => useEditor.getState().update((d) => void (d.pages.find((p) => p.id === page.id)!.notes = e.target.value), { coalesce: 'notes-' + page.id })}
        onKeyDown={(e) => e.stopPropagation()}
        data-testid="notes-input"
      />
      <div className="row faint">
        <span className="grow">
          {words} word{words === 1 ? '' : 's'} · ~{Math.max(0, Math.round(words / 2.5))}s to say
        </span>
        <button className="btn sm" onClick={() => designId && useApp.getState().navigate({ name: 'present', id: designId, mode: 'presenter' })}>
          Presenter view
        </button>
      </div>
    </div>
  );
}
