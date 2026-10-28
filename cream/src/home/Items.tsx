// Design + folder collections: grid/list views, hover star, "…" menus, inline rename,
// drag-to-folder, checkbox multi-select and the bottom bulk action bar.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../store/app';
import type { Design, Folder } from '../model/types';
import { CATEGORY_LABEL, presetById } from '../model/presets';
import { Icon, Menu, Modal, fmtDate, type Anchor, type MenuItem } from '../ui/ui';
import { DesignThumb } from './Thumb';
import { openDesign } from './actions';

const DRAG_DESIGN = 'application/x-cream-design';
const DRAG_FOLDER = 'application/x-cream-folder';
const DAY = 86400000;

type Key = string; // 'd:<id>' | 'f:<id>'

export const designType = (d: Design) => presetById(d.preset)?.name.replace(/\s*\(.*\)$/, '') ?? CATEGORY_LABEL[d.category] ?? 'Design';

export function folderCounts(folderId: string) {
  const s = useApp.getState();
  const designs = Object.values(s.designs).filter((d) => d.folderId === folderId && !d.trashedAt).length;
  const sub = s.folders.filter((f) => f.parentId === folderId && !f.trashedAt).length;
  return { designs, sub };
}

/** All descendant folder ids (to prevent moving a folder into itself). */
function descendants(folders: Folder[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) if (f.parentId && out.has(f.parentId) && !out.has(f.id)) (out.add(f.id), (grew = true));
  }
  return out;
}

export function moveDesignsTo(ids: string[], folderId: string | null) {
  const s = useApp.getState();
  ids.forEach((id) => s.patchDesign(id, { folderId }));
}

export function moveFolderTo(id: string, parentId: string | null) {
  const s = useApp.getState();
  if (parentId && descendants(s.folders, id).has(parentId)) {
    s.toast("Can't move a folder into itself", 'error');
    return false;
  }
  s.patchFolder(id, { parentId });
  return true;
}

/* ---------------- Move dialog ---------------- */
export function MoveDialog({ designIds, folderIds = [], onClose }: { designIds: string[]; folderIds?: string[]; onClose: () => void }) {
  const folders = useApp((s) => s.folders);
  const [target, setTarget] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState('');
  const blocked = useMemo(() => {
    const b = new Set<string>();
    folderIds.forEach((id) => descendants(folders, id).forEach((x) => b.add(x)));
    return b;
  }, [folders, folderIds]);
  const live = folders.filter((f) => !f.trashedAt && !blocked.has(f.id));
  const tree = (parent: string | null, depth: number): ReactNode[] =>
    live
      .filter((f) => f.parentId === parent && (!q || f.name.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((f) => [
        <button key={f.id} className={'move-row' + (target === f.id ? ' active' : '')} style={{ paddingLeft: 12 + depth * 18 }} onClick={() => setTarget(f.id)}>
          <Icon name="Folder" size={16} />
          <span className="grow">{f.name}</span>
          {target === f.id && <Icon name="Check" size={16} />}
        </button>,
        ...(q ? [] : tree(f.id, depth + 1)),
      ]);
  const n = designIds.length + folderIds.length;
  const doMove = () => {
    moveDesignsTo(designIds, target);
    folderIds.forEach((id) => moveFolderTo(id, target));
    const name = target ? folders.find((f) => f.id === target)?.name : 'Projects';
    useApp.getState().toast(`Moved ${n} item${n > 1 ? 's' : ''} to ${name}`, 'success');
    onClose();
  };
  return (
    <Modal
      title={`Move ${n} item${n > 1 ? 's' : ''}`}
      onClose={onClose}
      testId="move-dialog"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={doMove} data-testid="move-confirm">
            Move
          </button>
        </>
      }
    >
      <div className="search" style={{ marginBottom: 10 }}>
        <Icon name="Search" size={16} />
        <input placeholder="Search folders" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="move-list">
        <button className={'move-row' + (target === null ? ' active' : '')} onClick={() => setTarget(null)}>
          <Icon name="FolderKanban" size={16} />
          <span className="grow">Projects (top level)</span>
          {target === null && <Icon name="Check" size={16} />}
        </button>
        {tree(null, 1)}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input className="input" placeholder="New folder name" value={creating} onChange={(e) => setCreating(e.target.value)} />
        <button
          className="btn"
          disabled={!creating.trim()}
          onClick={() => {
            const f = useApp.getState().createFolder(creating.trim(), null);
            setTarget(f.id);
            setCreating('');
          }}
        >
          <Icon name="FolderPlus" size={16} /> Create
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Inline rename input ---------------- */
function RenameInput({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      className="input sm"
      autoFocus
      value={v}
      data-testid="rename-input"
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v.trim() || null)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
}

/* ---------------- Collection view ---------------- */
export interface ItemsViewProps {
  designs: Design[];
  folders?: Folder[];
  view: 'grid' | 'list';
  trash?: boolean;
  empty?: ReactNode;
  showFolderHeadings?: boolean;
}

export function ItemsView({ designs, folders = [], view, trash, empty, showFolderHeadings = true }: ItemsViewProps) {
  const [sel, setSel] = useState<Set<Key>>(new Set());
  const [renaming, setRenaming] = useState<Key | null>(null);
  const [menu, setMenu] = useState<{ anchor: Anchor; items: MenuItem[] } | null>(null);
  const [moving, setMoving] = useState<{ d: string[]; f: string[] } | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const lastClicked = useRef<Key | null>(null);
  const app = useApp.getState;

  const allKeys = useMemo(() => [...folders.map((f) => 'f:' + f.id), ...designs.map((d) => 'd:' + d.id)], [folders, designs]);
  // Drop selections that disappeared.
  const selected = allKeys.filter((k) => sel.has(k));
  const selD = selected.filter((k) => k.startsWith('d:')).map((k) => k.slice(2));
  const selF = selected.filter((k) => k.startsWith('f:')).map((k) => k.slice(2));

  const toggle = (k: Key, shift: boolean) => {
    setSel((prev) => {
      const n = new Set(prev);
      if (shift && lastClicked.current) {
        const a = allKeys.indexOf(lastClicked.current);
        const b = allKeys.indexOf(k);
        if (a >= 0 && b >= 0) {
          allKeys.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((x) => n.add(x));
          return n;
        }
      }
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
    lastClicked.current = k;
  };
  const clear = () => setSel(new Set());

  const designMenu = (d: Design): MenuItem[] =>
    trash
      ? [
          { label: 'Restore', icon: 'RotateCcw', onClick: () => (app().restoreDesign(d.id), app().toast('Design restored', 'success')), testId: 'menu-restore' },
          { label: 'Delete forever', icon: 'Trash2', danger: true, onClick: () => confirm(`Delete "${d.title}" forever? This can't be undone.`) && app().deleteDesignForever(d.id), testId: 'menu-delete-forever' },
        ]
      : [
          { label: 'Open', icon: 'ExternalLink', onClick: () => openDesign(d.id) },
          { label: 'Open in new tab', icon: 'SquareArrowOutUpRight', onClick: () => openDesign(d.id, { newTab: true }) },
          { sep: true },
          { label: d.starred ? 'Unstar' : 'Star', icon: 'Star', onClick: () => app().patchDesign(d.id, { starred: !d.starred }), testId: 'menu-star' },
          { label: 'Make a copy', icon: 'Copy', onClick: () => (app().duplicateDesign(d.id), app().toast('Copy created', 'success')), testId: 'menu-copy' },
          { label: 'Move to folder', icon: 'FolderInput', onClick: () => setMoving({ d: [d.id], f: [] }), testId: 'menu-move' },
          { label: 'Rename', icon: 'PenLine', onClick: () => setRenaming('d:' + d.id), testId: 'menu-rename' },
          { sep: true },
          { label: 'Share', icon: 'UserPlus', onClick: () => openDesign(d.id, { modal: 'share' }) },
          { label: 'Download', icon: 'Download', onClick: () => openDesign(d.id, { modal: 'download' }) },
          {
            label: 'Copy link',
            icon: 'Link',
            onClick: () => {
              navigator.clipboard?.writeText(location.origin + location.pathname + '#/design/' + d.id).catch(() => {});
              app().toast('Link copied');
            },
          },
          {
            label: d.offline ? 'Remove offline access' : 'Make available offline',
            icon: d.offline ? 'CloudOff' : 'CloudDownload',
            onClick: () => {
              app().patchDesign(d.id, { offline: !d.offline });
              app().toast(d.offline ? 'Removed from offline' : 'Available offline — Cream stores everything on this device', 'success');
            },
          },
          { sep: true },
          { label: 'Move to Trash', icon: 'Trash2', danger: true, onClick: () => (app().trashDesign(d.id), app().toast('Moved to Trash')), testId: 'menu-trash' },
        ];

  const folderMenu = (f: Folder): MenuItem[] =>
    trash
      ? [
          { label: 'Restore', icon: 'RotateCcw', onClick: () => app().restoreFolder(f.id) },
          { label: 'Delete forever', icon: 'Trash2', danger: true, onClick: () => confirm(`Delete folder "${f.name}" forever? Designs inside move to Projects.`) && app().deleteFolderForever(f.id) },
        ]
      : [
          { label: 'Open', icon: 'FolderOpen', onClick: () => app().navigate({ name: 'home', section: 'folder', param: f.id }) },
          { label: f.starred ? 'Unstar' : 'Star', icon: 'Star', onClick: () => app().patchFolder(f.id, { starred: !f.starred }) },
          { label: 'Rename', icon: 'PenLine', onClick: () => setRenaming('f:' + f.id), testId: 'menu-rename' },
          { label: 'Move', icon: 'FolderInput', onClick: () => setMoving({ d: [], f: [f.id] }) },
          {
            label: 'Folder color',
            icon: 'Palette',
            submenu: ['', '#8b3dff', '#00c4cc', '#ff6105', '#2f9e6e', '#22b8cf', '#f59f00'].map((c) => ({
              label: c ? c : 'Default',
              checked: (f.color ?? '') === c,
              onClick: () => app().patchFolder(f.id, { color: c || undefined }),
            })),
          },
          { sep: true },
          { label: 'Move to Trash', icon: 'Trash2', danger: true, onClick: () => (app().trashFolder(f.id), app().toast('Folder moved to Trash')), testId: 'menu-trash' },
        ];

  const onCardClick = (k: Key, e: React.MouseEvent, open: () => void) => {
    if (selected.length || e.shiftKey || e.metaKey || e.ctrlKey) {
      toggle(k, e.shiftKey);
      return;
    }
    open();
  };

  const folderDropProps = (f: Folder | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (trash) return;
      if (e.dataTransfer.types.includes(DRAG_DESIGN) || e.dataTransfer.types.includes(DRAG_FOLDER)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropOn(f?.id ?? 'root');
      }
    },
    onDragLeave: () => setDropOn(null),
    onDrop: (e: React.DragEvent) => {
      setDropOn(null);
      const dId = e.dataTransfer.getData(DRAG_DESIGN);
      const fId = e.dataTransfer.getData(DRAG_FOLDER);
      if (!dId && !fId) return;
      e.preventDefault();
      const target = f?.id ?? null;
      // Dragging a selected item moves the whole selection.
      const ds = dId && selD.includes(dId) ? selD : dId ? [dId] : [];
      const fs = fId && selF.includes(fId) ? selF : fId ? [fId] : [];
      moveDesignsTo(ds, target);
      let n = ds.length;
      fs.filter((x) => x !== target).forEach((x) => moveFolderTo(x, target) && n++);
      if (n) app().toast(`Moved ${n} item${n > 1 ? 's' : ''} to ${f?.name ?? 'Projects'}`, 'success');
      clear();
    },
  });

  const dragProps = (k: Key) => ({
    draggable: !trash && renaming !== k,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(k.startsWith('d:') ? DRAG_DESIGN : DRAG_FOLDER, k.slice(2));
      e.dataTransfer.effectAllowed = 'move';
    },
  });

  const trashNote = (t: number | null) => {
    if (!t) return '';
    const left = Math.max(0, 30 - Math.floor((Date.now() - t) / DAY));
    return `${left} day${left === 1 ? '' : 's'} left`;
  };

  const check = (k: Key) => (
    <button
      className={'card-check' + (selected.length ? ' show' : '') + (sel.has(k) ? ' on' : '')}
      aria-label="Select"
      data-testid="card-check"
      onClick={(e) => {
        e.stopPropagation();
        toggle(k, e.shiftKey);
      }}
    >
      {sel.has(k) && <Icon name="Check" size={14} />}
    </button>
  );

  const menuBtn = (items: () => MenuItem[], testId = 'card-menu') => (
    <button
      className="mini-btn"
      title="More"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        setMenu({ anchor: e.currentTarget, items: items() });
      }}
    >
      <Icon name="Ellipsis" size={16} />
    </button>
  );

  const finishRename = (k: Key, v: string | null) => {
    if (v) {
      if (k.startsWith('d:')) app().patchDesign(k.slice(2), { title: v });
      else app().patchFolder(k.slice(2), { name: v });
    }
    setRenaming(null);
  };

  if (!designs.length && !folders.length) return <>{empty ?? <div className="empty">Nothing here yet</div>}</>;

  const folderEls = folders.map((f) => {
    const k = 'f:' + f.id;
    const c = folderCounts(f.id);
    const open = () => !trash && app().navigate({ name: 'home', section: 'folder', param: f.id });
    if (view === 'list')
      return (
        <div
          key={k}
          className={'list-row' + (sel.has(k) ? ' selected' : '') + (dropOn === f.id ? ' drop' : '')}
          data-testid="folder-card"
          onClick={(e) => onCardClick(k, e, open)}
          onContextMenu={(e) => (e.preventDefault(), setMenu({ anchor: { x: e.clientX, y: e.clientY }, items: folderMenu(f) }))}
          {...dragProps(k)}
          {...folderDropProps(f)}
        >
          {check(k)}
          <div className="list-thumb folder-ico" style={{ color: f.color }}>
            <Icon name="Folder" size={22} />
          </div>
          <div className="grow list-name">{renaming === k ? <RenameInput value={f.name} onDone={(v) => finishRename(k, v)} /> : f.name}</div>
          <div className="list-col">Folder</div>
          <div className="list-col">{c.designs + c.sub} items</div>
          <div className="list-col">{trash ? trashNote(f.trashedAt) : fmtDate(f.createdAt)}</div>
          <div className="list-actions">{menuBtn(() => folderMenu(f))}</div>
        </div>
      );
    return (
      <div
        key={k}
        className={'folder-card' + (sel.has(k) ? ' selected' : '') + (dropOn === f.id ? ' drop' : '')}
        data-testid="folder-card"
        onClick={(e) => onCardClick(k, e, open)}
        onContextMenu={(e) => (e.preventDefault(), setMenu({ anchor: { x: e.clientX, y: e.clientY }, items: folderMenu(f) }))}
        {...dragProps(k)}
        {...folderDropProps(f)}
      >
        {check(k)}
        <div className="folder-ico" style={{ color: f.color }}>
          <Icon name={dropOn === f.id ? 'FolderInput' : 'Folder'} size={26} />
        </div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="name">{renaming === k ? <RenameInput value={f.name} onDone={(v) => finishRename(k, v)} /> : f.name}</div>
          <div className="faint">
            {trash ? trashNote(f.trashedAt) : `${c.designs} design${c.designs === 1 ? '' : 's'}${c.sub ? ` · ${c.sub} folder${c.sub === 1 ? '' : 's'}` : ''}`}
          </div>
        </div>
        {f.starred && !trash && <Icon name="Star" size={14} className="star-on" />}
        <div className="folder-actions">{menuBtn(() => folderMenu(f))}</div>
      </div>
    );
  });

  const designEls = designs.map((d) => {
    const k = 'd:' + d.id;
    const open = () => !trash && openDesign(d.id);
    const ctx = (e: React.MouseEvent) => (e.preventDefault(), setMenu({ anchor: { x: e.clientX, y: e.clientY }, items: designMenu(d) }));
    const star = !trash && (
      <button
        className={'mini-btn' + (d.starred ? ' starred' : '')}
        title={d.starred ? 'Unstar' : 'Star'}
        data-testid="card-star"
        onClick={(e) => {
          e.stopPropagation();
          app().patchDesign(d.id, { starred: !d.starred });
        }}
      >
        <Icon name="Star" size={15} />
      </button>
    );
    if (view === 'list')
      return (
        <div key={k} className={'list-row' + (sel.has(k) ? ' selected' : '')} data-testid="design-card" data-id={d.id} onClick={(e) => onCardClick(k, e, open)} onContextMenu={ctx} {...dragProps(k)}>
          {check(k)}
          <div className="list-thumb">
            <DesignThumb design={d} pad={3} />
          </div>
          <div className="grow list-name">
            {renaming === k ? <RenameInput value={d.title} onDone={(v) => finishRename(k, v)} /> : d.title}
            {d.offline && <Icon name="CloudCheck" size={14} className="faint" />}
          </div>
          <div className="list-col">{designType(d)}</div>
          <div className="list-col">You</div>
          <div className="list-col">{trash ? trashNote(d.trashedAt) : fmtDate(Math.max(d.updatedAt, d.openedAt))}</div>
          <div className="list-actions">
            {star}
            {menuBtn(() => designMenu(d))}
          </div>
        </div>
      );
    return (
      <div key={k} className={'design-card' + (sel.has(k) ? ' selected' : '')} data-testid="design-card" data-id={d.id} onClick={(e) => onCardClick(k, e, open)} onContextMenu={ctx} {...dragProps(k)}>
        <div className="thumb">
          <DesignThumb design={d} />
          {d.pages.length > 1 && <span className="page-count">{d.pages.length} pages</span>}
        </div>
        {check(k)}
        <div className={'card-actions' + (d.starred && !trash ? ' show' : '')}>
          {star}
          {menuBtn(() => designMenu(d))}
        </div>
        <div className="meta">
          <div className="name">{renaming === k ? <RenameInput value={d.title} onDone={(v) => finishRename(k, v)} /> : d.title}</div>
          <div className="faint row" style={{ gap: 4 }}>
            {d.offline && <Icon name="CloudCheck" size={12} />}
            {trash ? `Trashed · ${trashNote(d.trashedAt)}` : `${designType(d)} · ${fmtDate(Math.max(d.updatedAt, d.openedAt))}`}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="items-view">
      {view === 'list' ? (
        <div className="list-view">
          <div className="list-head">
            <span style={{ width: 22 }} />
            <span style={{ width: 64 }} />
            <span className="grow">Name</span>
            <span className="list-col">Type</span>
            <span className="list-col">{folders.length && !designs.length ? 'Items' : 'Owner'}</span>
            <span className="list-col">{trash ? 'Time left' : 'Edited'}</span>
            <span className="list-actions" />
          </div>
          {folderEls}
          {designEls}
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <>
              {showFolderHeadings && <h3 className="sub-head">Folders</h3>}
              <div className="folder-grid">{folderEls}</div>
            </>
          )}
          {designs.length > 0 && (
            <>
              {showFolderHeadings && folders.length > 0 && <h3 className="sub-head">Designs</h3>}
              <div className="design-grid">{designEls}</div>
            </>
          )}
        </>
      )}

      {selected.length > 0 && (
        <div className="bulk-bar" data-testid="bulk-bar">
          <button className="icon-btn on-dark" onClick={clear} title="Clear selection">
            <Icon name="X" size={16} />
          </button>
          <span className="bulk-count">{selected.length} selected</span>
          <span className="bulk-sep" />
          {trash ? (
            <>
              <button
                className="bulk-btn"
                data-testid="bulk-restore"
                onClick={() => {
                  selD.forEach((id) => app().restoreDesign(id));
                  selF.forEach((id) => app().restoreFolder(id));
                  app().toast(`Restored ${selected.length} item${selected.length > 1 ? 's' : ''}`, 'success');
                  clear();
                }}
              >
                <Icon name="RotateCcw" size={16} /> Restore
              </button>
              <button
                className="bulk-btn danger"
                data-testid="bulk-delete-forever"
                onClick={() => {
                  if (!confirm(`Delete ${selected.length} item(s) forever?`)) return;
                  selD.forEach((id) => app().deleteDesignForever(id));
                  selF.forEach((id) => app().deleteFolderForever(id));
                  clear();
                }}
              >
                <Icon name="Trash2" size={16} /> Delete forever
              </button>
            </>
          ) : (
            <>
              <button className="bulk-btn" data-testid="bulk-move" onClick={() => setMoving({ d: selD, f: selF })}>
                <Icon name="FolderInput" size={16} /> Move
              </button>
              <button
                className="bulk-btn"
                data-testid="bulk-star"
                onClick={() => {
                  const allStarred = selD.every((id) => app().designs[id]?.starred) && selF.every((id) => app().folders.find((f) => f.id === id)?.starred);
                  selD.forEach((id) => app().patchDesign(id, { starred: !allStarred }));
                  selF.forEach((id) => app().patchFolder(id, { starred: !allStarred }));
                }}
              >
                <Icon name="Star" size={16} /> Star
              </button>
              <button
                className="bulk-btn"
                data-testid="bulk-copy"
                disabled={!selD.length}
                onClick={() => {
                  selD.forEach((id) => app().duplicateDesign(id));
                  app().toast(`Copied ${selD.length} design${selD.length > 1 ? 's' : ''}`, 'success');
                  clear();
                }}
              >
                <Icon name="Copy" size={16} /> Make a copy
              </button>
              <button
                className="bulk-btn"
                data-testid="bulk-trash"
                onClick={() => {
                  selD.forEach((id) => app().trashDesign(id));
                  selF.forEach((id) => app().trashFolder(id));
                  app().toast(`Moved ${selected.length} item${selected.length > 1 ? 's' : ''} to Trash`);
                  clear();
                }}
              >
                <Icon name="Trash2" size={16} /> Trash
              </button>
            </>
          )}
        </div>
      )}

      {menu && <Menu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} placement="bottom-end" width={240} />}
      {moving && (
        <MoveDialog
          designIds={moving.d}
          folderIds={moving.f}
          onClose={() => {
            setMoving(null);
            clear();
          }}
        />
      )}
    </div>
  );
}

/** Wraps a breadcrumb crumb so designs/folders can be dropped onto it. */
export function DropCrumb({ folderId, children, onClick }: { folderId: string | null; children: ReactNode; onClick: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <button
      className={'crumb' + (over ? ' drop' : '')}
      onClick={onClick}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_DESIGN) || e.dataTransfer.types.includes(DRAG_FOLDER)) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const d = e.dataTransfer.getData(DRAG_DESIGN);
        const f = e.dataTransfer.getData(DRAG_FOLDER);
        if (d) moveDesignsTo([d], folderId);
        if (f && f !== folderId) moveFolderTo(f, folderId);
        if (d || f) useApp.getState().toast('Moved', 'success');
      }}
    >
      {children}
    </button>
  );
}
