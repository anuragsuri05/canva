import { Suspense, useEffect } from 'react';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { Header } from './Header';
import { Canvas } from './Canvas';
import { Footer } from './Footer';
import { Timeline } from './Timeline';
import { ContextMenu } from './ContextMenu';
import { useEditorShortcuts } from './shortcuts';
import { MODALS, RIGHT_PANELS, SIDE_TABS } from './registry';
import { Icon, Spinner } from '../ui/ui';
import ContextToolbar from '../toolbar/ContextToolbar';
import '../collab/commentBus';

export function Editor({ id }: { id: string }) {
  const design = useEditor((s) => s.design);
  const exists = useApp((s) => !!s.designs[id]);
  useEditorShortcuts();

  useEffect(() => {
    if (exists && useEditor.getState().design?.id !== id) useEditor.getState().open(id);
  }, [id, exists]);
  useEffect(() => () => useEditor.getState().close(), []);

  if (!exists)
    return (
      <div className="empty" style={{ paddingTop: 120 }}>
        <h2>Design not found</h2>
        <button className="btn primary" onClick={() => useApp.getState().navigate({ name: 'home', section: 'home' })}>
          Go home
        </button>
      </div>
    );
  if (!design || design.id !== id) return <Spinner />;
  return (
    <div className="editor" data-testid="editor">
      <Header />
      <div className="editor-main">
        <SideRail />
        <SidePanel />
        <div className="center">
          <div className="ctx-toolbar-wrap ctx-keep">
            <ContextToolbar />
          </div>
          {design.settings?.rulers && <Rulers />}
          <Canvas />
          {useEditor.getState().showTimeline && <TimelineGate />}
          <Footer />
        </div>
        <RightPanel />
      </div>
      <ContextMenu />
      <ModalHost />
    </div>
  );
}

function TimelineGate() {
  const show = useEditor((s) => s.showTimeline);
  return show ? <Timeline /> : null;
}

function SideRail() {
  const side = useEditor((s) => s.side);
  const tabs = useApp((s) => s.settings.editorTabs);
  const visible = SIDE_TABS.filter((t) => tabs.includes(t.id) || t.id === side);
  return (
    <nav className="side-rail" data-testid="side-rail">
      {visible.map((t) => (
        <button
          key={t.id}
          className={'rail-btn' + (side === t.id ? ' active' : '')}
          onClick={() => useEditor.setState({ side: side === t.id ? null : t.id })}
          data-testid={`tab-${t.id}`}
        >
          <Icon name={t.icon} size={22} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

function SidePanel() {
  const side = useEditor((s) => s.side);
  if (!side) return null;
  const tab = SIDE_TABS.find((t) => t.id === side);
  if (!tab) return null;
  const C = tab.component;
  return (
    <aside className="side-panel" data-testid={`panel-${side}`}>
      <div className="side-panel-body">
        <Suspense fallback={<Spinner />}>
          <C />
        </Suspense>
      </div>
      <button className="side-panel-collapse" onClick={() => useEditor.setState({ side: null })} title="Close panel">
        <Icon name="ChevronLeft" size={12} />
      </button>
    </aside>
  );
}

function RightPanel() {
  const right = useEditor((s) => s.right);
  if (!right) return null;
  const p = RIGHT_PANELS[right];
  if (!p) return null;
  const C = p.component;
  return (
    <aside className="right-panel" data-testid={`right-${right}`}>
      <div className="right-panel-head">
        <span className="grow">{p.title}</span>
        <button className="icon-btn" onClick={() => useEditor.setState({ right: null })} aria-label="Close panel">
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="right-panel-body">
        <Suspense fallback={<Spinner />}>
          <C />
        </Suspense>
      </div>
    </aside>
  );
}

function ModalHost() {
  const modal = useEditor((s) => s.modal);
  if (!modal) return null;
  const C = MODALS[modal];
  if (!C) return null;
  return (
    <Suspense fallback={null}>
      <C onClose={() => useEditor.setState({ modal: null })} />
    </Suspense>
  );
}

function Rulers() {
  const design = useEditor((s) => s.design)!;
  const step = design.width > 2000 ? 200 : design.width > 800 ? 100 : 50;
  const ticks = Array.from({ length: Math.floor(design.width / step) + 1 }, (_, i) => i * step);
  return (
    <div style={{ height: 20, flex: 'none', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', paddingLeft: 8 }} data-testid="rulers">
      <span style={{ marginRight: 8 }}>px</span>
      {ticks.map((t) => (
        <span
          key={t}
          style={{ minWidth: 48, borderLeft: '1px solid var(--border-strong)', paddingLeft: 3, cursor: 'copy' }}
          title="Click to add a vertical guide here"
          onClick={() =>
            useEditor.getState().update((d) => {
              d.settings = { ...(d.settings ?? {}), guides: [...(d.settings?.guides ?? []), { axis: 'x', pos: t }] };
            })
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}
