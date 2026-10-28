// Projects, folder pages, Starred, Shared with you, Uploads and Trash.
import { useMemo, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '../store/app';
import type { Asset, Design, DesignCategory, Folder } from '../model/types';
import { CATEGORY_LABEL } from '../model/presets';
import { makeImage, newPage } from '../model/defaults';
import { useSrc } from '../store/blobs';
import { Icon, Menu, MenuButton, Modal, fmtDate, type Anchor, type MenuItem } from '../ui/ui';
import { DropCrumb, ItemsView } from './Items';
import { CreateMenu } from './CreateMenu';
import { fmtBytes, lastActivity, openDesign, pickFiles } from './actions';

const DAY = 86400000;

/* ---------- shared toolbar state ---------- */
type Sort = 'activity' | 'az' | 'za';
type DateFilter = 'any' | 'today' | '7' | '30' | '365';
type Owner = 'any' | 'me' | 'others';

function useViewPref(key: string): ['grid' | 'list', (v: 'grid' | 'list') => void] {
  const [v, setV] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('cream-view-' + key) as any) || 'grid';
    } catch {
      return 'grid';
    }
  });
  return [
    v,
    (n) => {
      setV(n);
      try {
        localStorage.setItem('cream-view-' + key, n);
      } catch {
        /* ignore */
      }
    },
  ];
}

export function ViewToggle({ view, setView }: { view: 'grid' | 'list'; setView: (v: 'grid' | 'list') => void }) {
  return (
    <div className="seg" role="group" aria-label="View">
      <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} title="Grid view" data-testid="view-grid">
        <Icon name="LayoutGrid" size={15} />
      </button>
      <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} title="List view" data-testid="view-list">
        <Icon name="List" size={15} />
      </button>
    </div>
  );
}

function FilterChip({ label, value, items, testId }: { label: string; value: string; items: { v: string; label: string }[]; testId: string }) {
  const cur = items.find((i) => i.v === value);
  const active = value !== items[0].v;
  return (
    <MenuButton
      className={'chip' + (active ? ' active' : '')}
      testId={testId}
      items={items.map((i) => ({ label: i.label, checked: i.v === value, onClick: () => (i as any).on() }))}
    >
      {active ? cur?.label : label} <Icon name="ChevronDown" size={14} />
    </MenuButton>
  );
}

function useFilters() {
  const [owner, setOwner] = useState<Owner>('any');
  const [cat, setCat] = useState<DesignCategory | 'any'>('any');
  const [date, setDate] = useState<DateFilter>('any');
  const [sort, setSort] = useState<Sort>('activity');
  const apply = (ds: Design[]) => {
    let out = ds;
    if (owner === 'others') out = [];
    if (cat !== 'any') out = out.filter((d) => d.category === cat);
    if (date !== 'any') {
      const lim = date === 'today' ? new Date().setHours(0, 0, 0, 0) : Date.now() - Number(date) * DAY;
      out = out.filter((d) => d.updatedAt >= lim);
    }
    return sortDesigns(out, sort);
  };
  const sortFolders = (fs: Folder[]) => (sort === 'activity' ? [...fs].sort((a, b) => b.createdAt - a.createdAt) : [...fs].sort((a, b) => (sort === 'az' ? 1 : -1) * a.name.localeCompare(b.name)));
  const bar = (
    <div className="row filters">
      <FilterChip
        label="Owner"
        value={owner}
        testId="filter-owner"
        items={[
          { v: 'any', label: 'Any owner', on: () => setOwner('any') },
          { v: 'me', label: 'Owned by you', on: () => setOwner('me') },
          { v: 'others', label: 'Owned by others', on: () => setOwner('others') },
        ] as any}
      />
      <FilterChip
        label="Category"
        value={cat}
        testId="filter-category"
        items={[{ v: 'any', label: 'Any category', on: () => setCat('any') }, ...(Object.keys(CATEGORY_LABEL) as DesignCategory[]).map((c) => ({ v: c, label: CATEGORY_LABEL[c], on: () => setCat(c) }))] as any}
      />
      <FilterChip
        label="Date modified"
        value={date}
        testId="filter-date"
        items={[
          { v: 'any', label: 'Any time', on: () => setDate('any') },
          { v: 'today', label: 'Today', on: () => setDate('today') },
          { v: '7', label: 'Last 7 days', on: () => setDate('7') },
          { v: '30', label: 'Last 30 days', on: () => setDate('30') },
          { v: '365', label: 'Last year', on: () => setDate('365') },
        ] as any}
      />
      {(owner !== 'any' || cat !== 'any' || date !== 'any') && (
        <button className="btn ghost sm" onClick={() => (setOwner('any'), setCat('any'), setDate('any'))}>
          Clear all
        </button>
      )}
      <span className="grow" />
      <MenuButton
        className="btn ghost sm"
        testId="sort-btn"
        items={[
          { title: 'Sort by' },
          { label: 'Last activity', checked: sort === 'activity', onClick: () => setSort('activity') },
          { label: 'Alphabetical (A–Z)', checked: sort === 'az', onClick: () => setSort('az') },
          { label: 'Alphabetical (Z–A)', checked: sort === 'za', onClick: () => setSort('za') },
        ]}
      >
        <Icon name="ArrowDownUp" size={15} /> {sort === 'activity' ? 'Last activity' : sort === 'az' ? 'A–Z' : 'Z–A'}
      </MenuButton>
    </div>
  );
  return { apply, sortFolders, bar, owner };
}

export function sortDesigns(ds: Design[], sort: Sort) {
  const out = [...ds];
  if (sort === 'activity') out.sort((a, b) => lastActivity(b) - lastActivity(a));
  else out.sort((a, b) => (sort === 'az' ? 1 : -1) * a.title.localeCompare(b.title, undefined, { numeric: true }));
  return out;
}

/* ---------- data hooks ---------- */
function useDesigns() {
  return useApp(useShallow((s) => Object.values(s.designs)));
}

/* ---------- Asset tiles ---------- */
export function AssetTile({ a, trash }: { a: Asset; trash?: boolean }) {
  const src = useSrc(a.kind === 'image' || a.kind === 'video' ? 'asset:' + a.id : undefined);
  const [menu, setMenu] = useState<Anchor | null>(null);
  const app = useApp.getState;
  const items: MenuItem[] = trash
    ? [
        { label: 'Restore', icon: 'RotateCcw', onClick: () => app().patchAsset(a.id, { trashedAt: null }) },
        { label: 'Delete forever', icon: 'Trash2', danger: true, onClick: () => confirm(`Delete "${a.name}" forever?`) && app().deleteAssetForever(a.id) },
      ]
    : [
        ...(a.kind === 'image'
          ? [
              {
                label: 'Use in a new design',
                icon: 'ImagePlus',
                onClick: () => {
                  const w = Math.min(8000, a.width ?? 1080);
                  const h = Math.round((w * (a.height ?? 1080)) / (a.width ?? 1080));
                  const img = makeImage('asset:' + a.id, a.width ?? w, a.height ?? h, 0, 0, w);
                  const d = app().createDesign({ title: a.name.replace(/\.[^.]+$/, ''), width: w, height: Math.max(40, h), category: 'custom', pages: [newPage({ elements: [img] })] });
                  openDesign(d.id);
                },
              },
            ]
          : []),
        {
          label: 'Rename',
          icon: 'PenLine',
          onClick: () => {
            const n = prompt('Rename', a.name);
            if (n?.trim()) app().patchAsset(a.id, { name: n.trim() });
          },
        },
        {
          label: 'Download',
          icon: 'Download',
          onClick: () => {
            const link = document.createElement('a');
            link.href = src;
            link.download = a.name;
            link.click();
          },
        },
        { sep: true },
        { label: 'Move to Trash', icon: 'Trash2', danger: true, onClick: () => (app().patchAsset(a.id, { trashedAt: Date.now() }), app().toast('Moved to Trash')) },
      ];
  return (
    <div className="upload-card" data-testid="asset-card">
      <div className="upload-thumb checker-soft">
        {a.kind === 'image' && src && <img src={src} alt={a.name} loading="lazy" />}
        {a.kind === 'video' && src && <video src={src} muted preload="metadata" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />}
        {a.kind === 'audio' && <Icon name="Music" size={32} />}
        {a.kind === 'font' && <span style={{ fontFamily: a.fontFamily, fontSize: 30 }}>Aa</span>}
        {a.duration ? <span className="page-count">{Math.round(a.duration)}s</span> : null}
        <div className="card-actions show-hover">
          <button className="mini-btn" onClick={(e) => (e.stopPropagation(), setMenu(e.currentTarget))} data-testid="asset-menu">
            <Icon name="Ellipsis" size={16} />
          </button>
        </div>
      </div>
      <div className="meta">
        <div className="name">{a.name}</div>
        <div className="faint">
          {trash && a.trashedAt ? `${Math.max(0, 30 - Math.floor((Date.now() - a.trashedAt) / DAY))} days left` : `${a.width && a.height ? `${a.width} × ${a.height} · ` : ''}${fmtBytes(a.size)}`}
        </div>
      </div>
      {menu && <Menu anchor={menu} items={items} onClose={() => setMenu(null)} placement="bottom-end" />}
    </div>
  );
}

function AssetGrid({ assets, trash, empty }: { assets: Asset[]; trash?: boolean; empty: ReactNode }) {
  if (!assets.length) return <>{empty}</>;
  return (
    <div className="upload-grid">
      {assets.map((a) => (
        <AssetTile key={a.id} a={a} trash={trash} />
      ))}
    </div>
  );
}

async function uploadTo(folderId: string | null, accept = 'image/*,video/*,audio/*,.ttf,.otf,.woff,.woff2') {
  const files = await pickFiles(accept, true);
  for (const f of files) await useApp.getState().addAssetFromFile(f, folderId);
  if (files.length) useApp.getState().toast(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
}

function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-ico">
        <Icon name={icon} size={30} />
      </div>
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      {action}
    </div>
  );
}

/** "+ Add new" button used on Projects and folder pages. */
function AddNew({ folderId }: { folderId: string | null }) {
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [create, setCreate] = useState<Anchor | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  return (
    <>
      <button className="btn primary" data-testid="add-new" onClick={(e) => setMenu(e.currentTarget)}>
        <Icon name="Plus" size={16} /> Add new
      </button>
      {menu && (
        <Menu
          anchor={menu}
          placement="bottom-end"
          onClose={() => setMenu(null)}
          items={[
            {
              label: folderId ? 'Subfolder' : 'Folder',
              icon: 'FolderPlus',
              testId: 'new-folder',
              onClick: () => setNewFolder(true),
            },
            { label: 'Design', icon: 'SquarePlus', onClick: () => setCreate(menu) },
            { label: 'Upload files', icon: 'CloudUpload', onClick: () => uploadTo(folderId) },
          ]}
        />
      )}
      {create && <CreateMenu anchor={create} onClose={() => setCreate(null)} folderId={folderId} />}
      {newFolder && <NewFolderDialog parentId={folderId} onClose={() => setNewFolder(false)} />}
    </>
  );
}

export function NewFolderDialog({ parentId, onClose, open = false }: { parentId: string | null; onClose: () => void; open?: boolean }) {
  const [name, setName] = useState('');
  const submit = () => {
    const f = useApp.getState().createFolder(name.trim() || 'Untitled folder', parentId);
    useApp.getState().toast(`Folder "${f.name}" created`, 'success');
    onClose();
    if (open) useApp.getState().navigate({ name: 'home', section: 'folder', param: f.id });
  };
  return (
    <Modal
      title="Create a new folder"
      onClose={onClose}
      testId="new-folder-dialog"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} data-testid="new-folder-create">
            Continue
          </button>
        </>
      }
    >
      <div className="field">
        <label>Folder name</label>
        <input className="input" autoFocus placeholder="Untitled folder" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} data-testid="new-folder-name" />
      </div>
    </Modal>
  );
}

/* ---------- Projects ---------- */
type PTab = 'all' | 'folders' | 'designs' | 'images' | 'videos';

export function ProjectsPage() {
  const [tab, setTab] = useState<PTab>('all');
  const [view, setView] = useViewPref('projects');
  const designs = useDesigns();
  const folders = useApp((s) => s.folders);
  const assets = useApp((s) => s.assets);
  const f = useFilters();

  const liveFolders = folders.filter((x) => !x.trashedAt && x.parentId === null);
  const live = designs.filter((d) => !d.trashedAt);
  const shownDesigns = tab === 'all' ? f.apply(live.filter((d) => !d.folderId || !folders.some((x) => x.id === d.folderId && !x.trashedAt))) : tab === 'designs' ? f.apply(live) : [];
  const shownFolders = tab === 'all' || tab === 'folders' ? (f.owner === 'others' ? [] : f.sortFolders(liveFolders)) : [];
  const imgs = assets.filter((a) => !a.trashedAt && a.kind === 'image');
  const vids = assets.filter((a) => !a.trashedAt && a.kind === 'video');

  return (
    <div className="home-content" data-testid="projects-page">
      <div className="page-head-row">
        <h1 className="page-title">Projects</h1>
        <AddNew folderId={null} />
      </div>
      <div className="tabs">
        {(
          [
            ['all', 'All'],
            ['folders', 'Folders'],
            ['designs', 'Designs'],
            ['images', 'Images'],
            ['videos', 'Videos'],
          ] as [PTab, string][]
        ).map(([id, label]) => (
          <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)} data-testid={'ptab-' + id}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'images' || tab === 'videos' ? (
        <>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="grow muted">{tab === 'images' ? 'Images you uploaded' : 'Videos you uploaded'}</span>
            <button className="btn" onClick={() => uploadTo(null, tab === 'images' ? 'image/*' : 'video/*')}>
              <Icon name="CloudUpload" size={16} /> Upload
            </button>
          </div>
          <AssetGrid
            assets={tab === 'images' ? imgs : vids}
            empty={<EmptyState icon={tab === 'images' ? 'Images' : 'Film'} title={`No ${tab} yet`} text="Uploads you add to Cream show up here." />}
          />
        </>
      ) : (
        <>
          <div className="toolbar-row">
            {f.bar}
            <ViewToggle view={view} setView={setView} />
          </div>
          <ItemsView
            designs={shownDesigns}
            folders={shownFolders}
            view={view}
            empty={
              <EmptyState
                icon={tab === 'folders' ? 'FolderPlus' : 'LayoutTemplate'}
                title={tab === 'folders' ? 'No folders yet' : 'No designs found'}
                text={tab === 'folders' ? 'Create folders to organise your designs and uploads.' : 'Designs you create will appear here.'}
              />
            }
          />
        </>
      )}
    </div>
  );
}

/* ---------- Folder page ---------- */
export function FolderPage({ id }: { id: string }) {
  const folders = useApp((s) => s.folders);
  const designs = useDesigns();
  const assets = useApp((s) => s.assets);
  const [view, setView] = useViewPref('folder');
  const [menu, setMenu] = useState<Anchor | null>(null);
  const [renaming, setRenaming] = useState(false);
  const f = useFilters();
  const app = useApp.getState;
  const folder = folders.find((x) => x.id === id);
  if (!folder)
    return (
      <div className="home-content">
        <EmptyState icon="FolderX" title="Folder not found" text="It may have been deleted." action={<button className="btn" onClick={() => app().navigate({ name: 'home', section: 'projects' })}>Back to Projects</button>} />
      </div>
    );
  const chain: Folder[] = [];
  let cur: Folder | undefined = folder;
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? folders.find((x) => x.id === cur!.parentId) : undefined;
    if (chain.length > 50) break;
  }
  const sub = f.sortFolders(folders.filter((x) => x.parentId === id && !x.trashedAt));
  const ds = f.apply(designs.filter((d) => d.folderId === id && !d.trashedAt));
  const fileAssets = assets.filter((a) => a.folderId === id && !a.trashedAt);
  return (
    <div className="home-content" data-testid="folder-page">
      <div className="breadcrumb" data-testid="breadcrumb">
        <DropCrumb folderId={null} onClick={() => app().navigate({ name: 'home', section: 'projects' })}>
          Projects
        </DropCrumb>
        {chain.map((c) => (
          <span key={c.id} className="row" style={{ gap: 2 }}>
            <Icon name="ChevronRight" size={14} className="faint" />
            {c.id === id ? <span className="crumb current">{c.name}</span> : <DropCrumb folderId={c.id} onClick={() => app().navigate({ name: 'home', section: 'folder', param: c.id })}>{c.name}</DropCrumb>}
          </span>
        ))}
      </div>
      <div className="page-head-row">
        <Icon name="Folder" size={28} style={{ color: folder.color ?? 'var(--text-2)' }} />
        {renaming ? (
          <input
            className="input page-title-input"
            autoFocus
            defaultValue={folder.name}
            data-testid="folder-rename-input"
            onBlur={(e) => {
              if (e.target.value.trim()) app().patchFolder(id, { name: e.target.value.trim() });
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <h1 className="page-title" onDoubleClick={() => setRenaming(true)} data-testid="folder-title">
            {folder.name}
          </h1>
        )}
        <button className={'icon-btn' + (folder.starred ? ' starred' : '')} title={folder.starred ? 'Unstar' : 'Star'} onClick={() => app().patchFolder(id, { starred: !folder.starred })} data-testid="folder-star">
          <Icon name="Star" size={18} />
        </button>
        <button className="icon-btn" onClick={(e) => setMenu(e.currentTarget)} data-testid="folder-menu">
          <Icon name="Ellipsis" size={18} />
        </button>
        <span className="grow" />
        <AddNew folderId={id} />
      </div>
      <div className="toolbar-row">
        {f.bar}
        <ViewToggle view={view} setView={setView} />
      </div>
      <ItemsView
        designs={ds}
        folders={sub}
        view={view}
        empty={
          !fileAssets.length && (
            <EmptyState icon="FolderOpen" title="This folder is empty" text="Drag designs onto this folder, or use “Move to folder” from a design's ⋯ menu." />
          )
        }
      />
      {fileAssets.length > 0 && (
        <>
          <h3 className="sub-head">Uploads</h3>
          <AssetGrid assets={fileAssets} empty={null} />
        </>
      )}
      {menu && (
        <Menu
          anchor={menu}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Rename', icon: 'PenLine', onClick: () => setRenaming(true), testId: 'folder-rename' },
            { label: folder.starred ? 'Unstar' : 'Star', icon: 'Star', onClick: () => app().patchFolder(id, { starred: !folder.starred }) },
            {
              label: 'Copy link',
              icon: 'Link',
              onClick: () => {
                navigator.clipboard?.writeText(location.href).catch(() => {});
                app().toast('Link copied');
              },
            },
            { sep: true },
            {
              label: 'Move to Trash',
              icon: 'Trash2',
              danger: true,
              testId: 'folder-trash',
              onClick: () => {
                app().trashFolder(id);
                app().toast('Folder moved to Trash');
                app().navigate(folder.parentId ? { name: 'home', section: 'folder', param: folder.parentId } : { name: 'home', section: 'projects' });
              },
            },
          ]}
        />
      )}
    </div>
  );
}

/* ---------- Starred ---------- */
export function StarredPage() {
  const designs = useDesigns();
  const folders = useApp((s) => s.folders);
  const [view, setView] = useViewPref('starred');
  return (
    <div className="home-content" data-testid="starred-page">
      <div className="page-head-row">
        <h1 className="page-title">Starred</h1>
        <span className="grow" />
        <ViewToggle view={view} setView={setView} />
      </div>
      <ItemsView
        designs={sortDesigns(designs.filter((d) => d.starred && !d.trashedAt), 'activity')}
        folders={folders.filter((f) => f.starred && !f.trashedAt)}
        view={view}
        empty={<EmptyState icon="Star" title="Nothing starred yet" text="Hover a design or folder and click the star to keep it close at hand." />}
      />
    </div>
  );
}

/* ---------- Shared with you ---------- */
export function SharedPage() {
  return (
    <div className="home-content">
      <div className="page-head-row">
        <h1 className="page-title">Shared with you</h1>
      </div>
      <EmptyState
        icon="Users"
        title="Nothing shared with you yet"
        text={
          <>
            Cream is local-first: your designs live in this browser and never leave your device. When someone sends you a view-only link or a <b>.cream</b> file, import it
            and it will appear in your Projects.
          </>
        }
        action={
          <button className="btn" onClick={async () => {
            const { importFiles } = await import('./actions');
            const files = await pickFiles('.cream,.json', true);
            if (files.length) importFiles(files);
          }}>
            <Icon name="FileUp" size={16} /> Import a .cream file
          </button>
        }
      />
    </div>
  );
}

/* ---------- Uploads ---------- */
export function UploadsPage() {
  const assets = useApp((s) => s.assets);
  const [tab, setTab] = useState<'image' | 'video' | 'audio' | 'font'>('image');
  const [drag, setDrag] = useState(false);
  const live = assets.filter((a) => !a.trashedAt);
  const shown = live.filter((a) => a.kind === tab);
  const total = live.reduce((n, a) => n + (a.size || 0), 0);
  return (
    <div
      className={'home-content' + (drag ? ' drop-active' : '')}
      data-testid="uploads-page"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDrag(false);
        const files = Array.from(e.dataTransfer.files);
        for (const f of files) await useApp.getState().addAssetFromFile(f);
        if (files.length) useApp.getState().toast(`Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
      }}
    >
      <div className="page-head-row">
        <h1 className="page-title">Uploads</h1>
        <span className="faint">{fmtBytes(total)} used · stored on this device</span>
        <span className="grow" />
        <button className="btn primary" onClick={() => uploadTo(null)} data-testid="upload-files">
          <Icon name="CloudUpload" size={16} /> Upload files
        </button>
      </div>
      <div className="tabs">
        {(
          [
            ['image', 'Images'],
            ['video', 'Videos'],
            ['audio', 'Audio'],
            ['font', 'Fonts'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
            {label} <span className="faint">{live.filter((a) => a.kind === id).length || ''}</span>
          </button>
        ))}
      </div>
      <AssetGrid
        assets={shown}
        empty={<EmptyState icon="CloudUpload" title="Drag files here to upload" text="Images, videos, audio and fonts (OTF, TTF, WOFF). Everything stays in this browser." />}
      />
    </div>
  );
}

/* ---------- Trash ---------- */
export function TrashPage() {
  const designs = useDesigns();
  const folders = useApp((s) => s.folders);
  const assets = useApp((s) => s.assets);
  const [tab, setTab] = useState<'designs' | 'folders' | 'images' | 'videos'>('designs');
  const [view, setView] = useViewPref('trash');
  const td = useMemo(() => designs.filter((d) => d.trashedAt).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)), [designs]);
  const tf = folders.filter((f) => f.trashedAt);
  const ti = assets.filter((a) => a.trashedAt && a.kind === 'image');
  const tv = assets.filter((a) => a.trashedAt && (a.kind === 'video' || a.kind === 'audio' || a.kind === 'font'));
  const total = td.length + tf.length + assets.filter((a) => a.trashedAt).length;
  return (
    <div className="home-content" data-testid="trash-page">
      <div className="page-head-row">
        <h1 className="page-title">Trash</h1>
        <span className="grow" />
        {tab !== 'images' && tab !== 'videos' && <ViewToggle view={view} setView={setView} />}
        <button
          className="btn"
          disabled={!total}
          data-testid="trash-empty"
          onClick={() => {
            if (!confirm(`Permanently delete all ${total} item${total === 1 ? '' : 's'} in Trash? This can't be undone.`)) return;
            useApp.getState().emptyTrash();
            useApp.getState().toast('Trash emptied');
          }}
        >
          <Icon name="Trash2" size={16} /> Empty trash
        </button>
      </div>
      <div className="notice">
        <Icon name="Info" size={16} /> Items in Trash are deleted forever after 30 days. Select items to restore them or delete them forever.
      </div>
      <div className="tabs">
        {(
          [
            ['designs', 'Designs', td.length],
            ['folders', 'Folders', tf.length],
            ['images', 'Images', ti.length],
            ['videos', 'Videos', tv.length],
          ] as const
        ).map(([id, label, n]) => (
          <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)} data-testid={'trash-tab-' + id}>
            {label} {n ? <span className="faint">{n}</span> : null}
          </button>
        ))}
      </div>
      {tab === 'designs' || tab === 'folders' ? (
        <ItemsView
          trash
          view={view}
          designs={tab === 'designs' ? td : []}
          folders={tab === 'folders' ? tf : []}
          showFolderHeadings={false}
          empty={<EmptyState icon="Trash2" title="Trash is empty" text="Designs and folders you delete show up here for 30 days." />}
        />
      ) : (
        <AssetGrid trash assets={tab === 'images' ? ti : tv} empty={<EmptyState icon="Trash2" title="Trash is empty" text="Uploads you delete show up here for 30 days." />} />
      )}
    </div>
  );
}

/** Permanently remove anything trashed more than 30 days ago. */
export function purgeOldTrash() {
  const s = useApp.getState();
  const cutoff = Date.now() - 30 * DAY;
  Object.values(s.designs).forEach((d) => d.trashedAt && d.trashedAt < cutoff && s.deleteDesignForever(d.id));
  s.folders.forEach((f) => f.trashedAt && f.trashedAt < cutoff && s.deleteFolderForever(f.id));
  s.assets.forEach((a) => a.trashedAt && a.trashedAt < cutoff && s.deleteAssetForever(a.id));
}

export { fmtDate };
