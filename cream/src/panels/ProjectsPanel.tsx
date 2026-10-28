// Projects tab: your designs, folders, uploaded images and videos. Clicking a design adds its
// first page's elements to the current page as a group.
import { memo, useMemo, useRef, useState } from 'react';
import type { Asset, Design } from '../model/types';
import { useApp } from '../store/app';
import { useEditor } from '../store/editor';
import { useSrc } from '../store/blobs';
import { PageView } from '../render/PageView';
import { Icon, Menu, Segmented, fmtDate, useDebounced } from '../ui/ui';
import { EmptyBox, PanelSearch } from './common';
import { insertAsGroup } from './insert';
import { insertAsset } from './UploadsPanel';
import { matches } from './catalog';

type Tab = 'designs' | 'folders' | 'images' | 'videos';

function insertDesign(d: Design) {
  const page = d.pages[0];
  if (!page || !page.elements.length) {
    useApp.getState().toast('That design has no elements on its first page');
    return;
  }
  insertAsGroup(page.elements, d.width, page.height ?? d.height);
  useApp.getState().toast(`Added “${d.title}” to your page`);
}

const Thumb = memo(function Thumb({ d, size }: { d: Design; size: number }) {
  const page = d.pages[0];
  if (!page) return <Icon name="File" size={24} />;
  const h = page.height ?? d.height;
  const scale = Math.min(size / d.width, (size * 0.75) / h);
  return (
    <div style={{ pointerEvents: 'none', boxShadow: 'var(--shadow-sm)' }}>
      <PageView design={d} page={page} scale={scale} ctx={{ mode: 'static', pageIndex: 0, pageCount: d.pages.length }} />
    </div>
  );
});

function DesignCard({ d }: { d: Design }) {
  const [menu, setMenu] = useState(false);
  const btn = useRef<HTMLSpanElement>(null);
  const current = useEditor((s) => s.design?.id === d.id);
  return (
    <div className="pn-design" role="button" tabIndex={0} data-testid="project-design" onClick={() => insertDesign(d)} onKeyDown={(e) => e.key === 'Enter' && insertDesign(d)} title={`Add “${d.title}” to this page`}>
      <div className="th">
        <Thumb d={d} size={140} />
      </div>
      <div className="nm">
        {d.title}
        {current && <span className="badge" style={{ marginLeft: 6 }}>Current</span>}
      </div>
      <div className="faint">{fmtDate(d.updatedAt)}</div>
      <span
        ref={btn}
        role="button"
        tabIndex={0}
        aria-label="More"
        className="mini-btn more"
        onClick={(e) => {
          e.stopPropagation();
          setMenu(true);
        }}
      >
        <Icon name="Ellipsis" size={16} />
      </span>
      {menu && (
        <Menu
          anchor={btn.current}
          onClose={() => setMenu(false)}
          placement="bottom-end"
          items={[
            { label: 'Add to this page', icon: 'Plus', onClick: () => insertDesign(d) },
            { label: 'Open in new tab', icon: 'ExternalLink', onClick: () => window.open(`${location.pathname}#/design/${d.id}`, '_blank') },
            { label: d.starred ? 'Unstar' : 'Star', icon: 'Star', onClick: () => useApp.getState().patchDesign(d.id, { starred: !d.starred }) },
          ]}
        />
      )}
    </div>
  );
}

function AssetThumb({ a }: { a: Asset }) {
  const src = useSrc('asset:' + a.id);
  return (
    <button className="asset-tile" data-testid="project-asset" title={a.name} onClick={() => insertAsset(a)}>
      {src && (a.kind === 'image' ? <img src={src} alt={a.name} /> : <video src={src + '#t=0.1'} muted preload="metadata" />)}
    </button>
  );
}

export default function ProjectsPanel() {
  const designsMap = useApp((s) => s.designs);
  const folders = useApp((s) => s.folders);
  const assets = useApp((s) => s.assets);
  const [tab, setTab] = useState<Tab>('designs');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 200);

  const designs = useMemo(() => Object.values(designsMap).filter((d) => !d.trashedAt && matches(dq, d.title)).sort((a, b) => b.updatedAt - a.updatedAt), [designsMap, dq]);
  const liveFolders = useMemo(() => folders.filter((f) => !f.trashedAt), [folders]);
  const liveAssets = useMemo(() => assets.filter((a) => !a.trashedAt && matches(dq, a.name)), [assets, dq]);

  const folder = folderId ? liveFolders.find((f) => f.id === folderId) : null;
  const subFolders = liveFolders.filter((f) => f.parentId === (folderId ?? null) && matches(dq, f.name));
  const folderDesigns = folderId ? designs.filter((d) => d.folderId === folderId) : [];
  const folderAssets = folderId ? liveAssets.filter((a) => a.folderId === folderId) : [];

  const designGrid = (list: Design[]) =>
    list.length ? (
      <div className="pn-grid c2" style={{ gap: 12 }}>
        {list.map((d) => (
          <DesignCard key={d.id} d={d} />
        ))}
      </div>
    ) : null;
  const assetGrid = (list: Asset[]) =>
    list.length ? (
      <div className="asset-grid">
        {list.map((a) => (
          <AssetThumb key={a.id} a={a} />
        ))}
      </div>
    ) : null;

  return (
    <div className="pn" data-testid="projects-panel">
      <div className="pn-sticky">
        <PanelSearch value={q} onChange={setQ} placeholder="Search your content" testId="projects-search" />
        <div style={{ marginTop: 10 }}>
          <Segmented
            value={tab}
            onChange={(t) => {
              setTab(t);
              setFolderId(null);
            }}
            options={[
              { value: 'designs', label: 'Designs' },
              { value: 'folders', label: 'Folders' },
              { value: 'images', label: 'Images' },
              { value: 'videos', label: 'Videos' },
            ]}
          />
        </div>
      </div>
      {tab === 'designs' && (designGrid(designs) ?? <EmptyBox icon="LayoutTemplate">{dq ? `No designs match “${dq}”.` : 'No designs yet.'}</EmptyBox>)}
      {tab === 'images' && (assetGrid(liveAssets.filter((a) => a.kind === 'image')) ?? <EmptyBox icon="Image">No images yet. Upload some from the Uploads tab.</EmptyBox>)}
      {tab === 'videos' && (assetGrid(liveAssets.filter((a) => a.kind === 'video')) ?? <EmptyBox icon="Film">No videos yet.</EmptyBox>)}
      {tab === 'folders' && (
        <>
          {folder && (
            <div className="pn-back">
              <button className="icon-btn" aria-label="Back" onClick={() => setFolderId(folder.parentId)}>
                <Icon name="ChevronLeft" size={18} />
              </button>
              <h3>{folder.name}</h3>
            </div>
          )}
          <div className="col" style={{ gap: 6 }}>
            {subFolders.map((f) => (
              <button key={f.id} className="pn-folder" onClick={() => setFolderId(f.id)} data-testid="project-folder">
                <Icon name="Folder" size={20} style={{ color: f.color ?? 'var(--primary)' }} />
                <span className="grow" style={{ fontWeight: 500 }}>
                  {f.name}
                </span>
                <span className="faint">{designs.filter((d) => d.folderId === f.id).length + liveAssets.filter((a) => a.folderId === f.id).length} items</span>
                <Icon name="ChevronRight" size={16} />
              </button>
            ))}
          </div>
          {folderId && (
            <>
              {folderDesigns.length > 0 && <h4>Designs</h4>}
              {designGrid(folderDesigns)}
              {folderAssets.length > 0 && <h4>Uploads</h4>}
              {assetGrid(folderAssets)}
            </>
          )}
          {!subFolders.length && (!folderId || (!folderDesigns.length && !folderAssets.length)) && <EmptyBox icon="FolderOpen">{folderId ? 'This folder is empty.' : 'No folders yet. Create folders from Projects on the home page.'}</EmptyBox>}
        </>
      )}
    </div>
  );
}
