import { useCallback, useEffect, useState } from 'react';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import type { Design, DesignVersion } from '../model/types';
import { PageView } from '../render/PageView';
import { Icon, Spinner } from '../ui/ui';
import { uid, cloneElements } from '../model/defaults';
import './collab.css';

const dayLabel = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

function Thumb({ d, w }: { d: Design; w: number }) {
  const p = d.pages[0];
  if (!p) return null;
  return (
    <div className="vh-thumb" style={{ width: w }}>
      <PageView design={d} page={p} scale={w / d.width} ctx={{ mode: 'static', pageIndex: 0, pageCount: d.pages.length }} />
    </div>
  );
}

export default function VersionsPanel() {
  const designId = useEditor((s) => s.design?.id);
  const [versions, setVersions] = useState<DesignVersion[] | null>(null);
  const [sel, setSel] = useState<DesignVersion | null>(null);
  const [name, setName] = useState('');
  const app = useApp.getState();

  const load = useCallback(async () => {
    if (!designId) return;
    setVersions(await useApp.getState().listVersions(designId));
  }, [designId]);
  useEffect(() => {
    load();
  }, [load]);

  const saveNamed = async () => {
    const d = useEditor.getState().design;
    if (!d) return;
    await app.saveVersion(d, name.trim() || 'Saved version');
    setName('');
    app.toast('Version saved', 'success');
    load();
  };

  const restore = async (v: DesignVersion) => {
    const cur = useEditor.getState().design;
    if (!cur) return;
    await app.saveVersion(cur, 'Before restoring');
    const snap = structuredClone(v.snapshot);
    useEditor.getState().update((d) => {
      d.title = snap.title;
      d.width = snap.width;
      d.height = snap.height;
      d.unit = snap.unit;
      d.pages = snap.pages as any;
      d.audio = snap.audio as any;
      d.settings = snap.settings as any;
    });
    const ed = useEditor.getState();
    useEditor.setState({ pageId: ed.design?.pages[0]?.id ?? null, selection: [] });
    app.toast('Version restored', 'success');
    setSel(null);
    load();
  };

  const copy = (v: DesignVersion) => {
    const now = Date.now();
    const snap = structuredClone(v.snapshot);
    const d: Design = {
      ...snap,
      id: uid(),
      title: `${snap.title} (${new Date(v.createdAt).toLocaleString()})`,
      createdAt: now,
      updatedAt: now,
      openedAt: now,
      comments: [],
      starred: false,
      trashedAt: null,
      pages: snap.pages.map((p) => ({ ...p, id: uid(), elements: cloneElements(p.elements) })),
    };
    app.addDesign(d);
    app.toast('Copy created in your projects', 'success');
  };

  if (!versions) return <Spinner />;
  if (sel) {
    const d = sel.snapshot;
    return (
      <div data-testid="version-preview">
        <button className="btn ghost sm" onClick={() => setSel(null)} style={{ marginBottom: 8 }}>
          <Icon name="ChevronLeft" size={16} /> All versions
        </button>
        <div style={{ fontWeight: 600 }}>{sel.label ?? new Date(sel.createdAt).toLocaleString()}</div>
        <div className="faint" style={{ marginBottom: 10 }}>
          {new Date(sel.createdAt).toLocaleString()} · {d.pages.length} page{d.pages.length === 1 ? '' : 's'}
        </div>
        <div className="col" style={{ gap: 10, marginBottom: 12 }}>
          {d.pages.map((p, i) => (
            <div key={p.id} className="vh-thumb" style={{ width: 290 }}>
              <PageView design={d} page={p} scale={290 / d.width} ctx={{ mode: 'static', pageIndex: i, pageCount: d.pages.length }} />
            </div>
          ))}
        </div>
        <button className="btn primary block" onClick={() => restore(sel)} data-testid="version-restore">
          Restore this version
        </button>
        <button className="btn block" style={{ marginTop: 8 }} onClick={() => copy(sel)} data-testid="version-copy">
          Make a copy
        </button>
      </div>
    );
  }

  const groups: { day: string; items: DesignVersion[] }[] = [];
  for (const v of versions) {
    const day = dayLabel(v.createdAt);
    const g = groups[groups.length - 1];
    if (g?.day === day) g.items.push(v);
    else groups.push({ day, items: [v] });
  }

  return (
    <div data-testid="versions-panel">
      <div className="row" style={{ marginBottom: 8 }}>
        <input
          className="input grow"
          placeholder="Name this version (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => (e.stopPropagation(), e.key === 'Enter' && saveNamed())}
          data-testid="version-name"
        />
        <button className="btn primary" onClick={saveNamed} data-testid="version-save">
          Save
        </button>
      </div>
      <div className="faint">Versions are saved automatically as you edit. Select one to preview it.</div>
      {!versions.length && <div className="empty">No versions yet. Keep editing and they'll appear here.</div>}
      {groups.map((g) => (
        <div key={g.day}>
          <div className="vh-day">{g.day}</div>
          {g.items.map((v) => (
            <div key={v.id} className="vh-item" onClick={() => setSel(v)} data-testid="version-item">
              <Thumb d={v.snapshot} w={72} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(v.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                <div className="faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.label ? <b style={{ color: 'var(--primary)' }}>{v.label}</b> : 'Autosave'} · {v.snapshot.pages.length} page{v.snapshot.pages.length === 1 ? '' : 's'}
                </div>
              </div>
              <Icon name="ChevronRight" size={16} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
