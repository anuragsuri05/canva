import { useEditor, currentPage } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, MenuButton, PopoverButton } from '../ui/ui';
import { PageView } from '../render/PageView';

export function Footer() {
  const design = useEditor((s) => s.design)!;
  const pageId = useEditor((s) => s.pageId);
  const zoom = useEditor((s) => s.zoom);
  const fit = useEditor((s) => s.fit);
  const fitZoom = useEditor((s) => (s as any).fitZoomValue as number) ?? 0.5;
  const view = useEditor((s) => s.view);
  const right = useEditor((s) => s.right);
  const showTimeline = useEditor((s) => s.showTimeline);
  const idx = Math.max(0, design.pages.findIndex((p) => p.id === pageId));
  const z = fit ? fitZoom : zoom;
  const setZoom = (v: number) => useEditor.setState({ zoom: Math.max(0.05, Math.min(5, v)), fit: false });
  const page = currentPage(useEditor.getState());

  return (
    <>
      {view === 'thumbs' && <ThumbStrip />}
      <div className="editor-footer" data-testid="editor-footer">
        <button className={'btn ghost sm' + (right === 'notes' ? ' active' : '')} onClick={() => useEditor.setState({ right: right === 'notes' ? null : 'notes' })} data-testid="notes-btn">
          <Icon name="StickyNote" size={16} /> Notes
        </button>
        {(design.category === 'video' || design.category === 'presentation' || design.category === 'social') && (
          <button className={'btn ghost sm' + (showTimeline ? ' active' : '')} onClick={() => useEditor.setState({ showTimeline: !showTimeline })} data-testid="timeline-btn">
            <Icon name="Clock" size={16} /> {page ? `${page.duration.toFixed(1)}s` : 'Duration'}
          </button>
        )}
        <span className="grow" />
        <input
          type="range"
          min={5}
          max={500}
          value={Math.round(z * 100)}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          style={{ width: 140 }}
          aria-label="Zoom"
          data-testid="zoom-slider"
        />
        <MenuButton
          className="btn ghost sm"
          testId="zoom-menu"
          items={[
            { label: 'Fit', onClick: () => useEditor.setState({ fit: true }) },
            { label: 'Fill', onClick: () => setZoom(fitZoom * 1.35) },
            { sep: true },
            ...[300, 200, 125, 100, 75, 50, 25, 10].map((p) => ({ label: `${p}%`, onClick: () => setZoom(p / 100) })),
          ]}
        >
          <span style={{ minWidth: 40 }}>{Math.round(z * 100)}%</span>
        </MenuButton>
        <span className="faint" data-testid="page-counter" style={{ margin: '0 6px' }}>
          Pages {idx + 1} / {design.pages.length}
        </span>
        <button className={'icon-btn' + (view === 'scroll' ? ' active' : '')} title="Scroll view (Ctrl+Alt+1)" onClick={() => useEditor.setState({ view: 'scroll' })}>
          <Icon name="Rows3" size={17} />
        </button>
        <button className={'icon-btn' + (view === 'thumbs' ? ' active' : '')} title="Thumbnail view (Ctrl+Alt+2)" onClick={() => useEditor.setState({ view: view === 'thumbs' ? 'scroll' : 'thumbs' })} data-testid="thumbs-view">
          <Icon name="GalleryHorizontal" size={17} />
        </button>
        <button className={'icon-btn' + (view === 'grid' ? ' active' : '')} title="Grid view (Ctrl+Alt+3)" onClick={() => useEditor.setState({ view: view === 'grid' ? 'scroll' : 'grid' })} data-testid="grid-view">
          <Icon name="LayoutGrid" size={17} />
        </button>
        <button className="icon-btn" title="Present full screen" onClick={() => useApp.getState().navigate({ name: 'present', id: design.id, mode: 'full' })}>
          <Icon name="Maximize" size={17} />
        </button>
        <PopoverButton
          className="icon-btn"
          title="Help"
          width={240}
          placement="top-start"
          content={(close) => (
            <div className="col" style={{ gap: 2 }}>
              <button className="menu-item" onClick={() => (close(), useEditor.setState({ modal: 'shortcuts' }))}>
                <Icon name="Keyboard" size={16} /> Keyboard shortcuts
              </button>
              <button className="menu-item" onClick={() => (close(), useEditor.setState({ right: 'accessibility' }))}>
                <Icon name="Accessibility" size={16} /> Check accessibility
              </button>
              <button className="menu-item" onClick={() => (close(), useApp.getState().toast('Cream is local-first: your work is saved in this browser.'))}>
                <Icon name="Info" size={16} /> About Cream
              </button>
            </div>
          )}
        >
          <Icon name="HelpCircle" size={17} />
        </PopoverButton>
      </div>
    </>
  );
}

function ThumbStrip() {
  const design = useEditor((s) => s.design)!;
  const pageId = useEditor((s) => s.pageId);
  const h = 72;
  const scale = h / design.height;
  return (
    <div className="hscroll" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '10px 14px', gap: 10, alignItems: 'center' }} data-testid="thumb-strip">
      {design.pages.map((p, i) => (
        <button
          key={p.id}
          onClick={() => useEditor.setState({ pageId: p.id, selection: [] })}
          style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer', outline: p.id === pageId ? '2px solid var(--primary)' : '1px solid var(--border)', outlineOffset: 2, borderRadius: 4, position: 'relative', opacity: p.hidden ? 0.5 : 1 }}
        >
          <PageView design={design} page={p} scale={scale} ctx={{ mode: 'static', pageIndex: i, pageCount: design.pages.length }} />
          <span style={{ position: 'absolute', left: 4, bottom: 2, fontSize: 10, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 3, padding: '0 4px' }}>{i + 1}</span>
        </button>
      ))}
      <button className="btn" style={{ height: h, width: 48 }} onClick={() => useEditor.getState().addPage()} title="Add page">
        <Icon name="Plus" />
      </button>
    </div>
  );
}
