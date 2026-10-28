import { useState } from 'react';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { Icon, Menu, MenuButton, type MenuItem, MOD, ALT } from '../ui/ui';
import { newDesign } from '../model/defaults';
import { PRESETS } from '../model/presets';

export function Header() {
  const design = useEditor((s) => s.design)!;
  const saveState = useEditor((s) => s.saveState);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const mode = useEditor((s) => s.mode);
  const right = useEditor((s) => s.right);
  const userName = useApp((s) => s.settings.userName);
  const [fileAnchor, setFileAnchor] = useState<HTMLElement | null>(null);
  const ed = useEditor.getState;
  const app = useApp.getState;

  const setting = (k: 'rulers' | 'margins' | 'bleed' | 'snap', v: boolean) =>
    ed().update((d) => {
      d.settings = { ...(d.settings ?? {}), [k]: v };
    });

  const fileItems: MenuItem[] = [
    {
      label: 'Create new design',
      icon: 'Plus',
      submenu: PRESETS.slice(0, 14).map((p) => ({
        label: `${p.name}  ·  ${p.display}`,
        onClick: () => {
          const nd = app().addDesign(newDesign({ preset: p.id }));
          window.open(location.pathname + '#/design/' + nd.id, '_blank');
        },
      })),
    },
    { label: 'Import files', icon: 'Upload', onClick: () => useEditor.setState({ side: 'uploads' }) },
    { sep: true },
    {
      label: 'Settings',
      icon: 'Settings2',
      submenu: [
        { label: 'Show rulers and guides', checked: !!design.settings?.rulers, kbd: '⇧R', onClick: () => setting('rulers', !design.settings?.rulers) },
        { label: 'Add guides', icon: 'Grid3x3', onClick: () => useEditor.setState({ modal: 'add-guides' }) },
        { label: 'Clear guides', icon: 'Eraser', onClick: () => ed().update((d) => void (d.settings = { ...(d.settings ?? {}), guides: [] })) },
        { label: 'Show margins', checked: !!design.settings?.margins, onClick: () => setting('margins', !design.settings?.margins) },
        { label: 'Show print bleed', checked: !!design.settings?.bleed, onClick: () => setting('bleed', !design.settings?.bleed) },
        { label: 'Snap to guides & elements', checked: design.settings?.snap !== false, onClick: () => setting('snap', design.settings?.snap === false) },
      ],
    },
    {
      label: 'Accessibility',
      icon: 'Accessibility',
      submenu: [
        { label: 'Check design accessibility', icon: 'ScanEye', onClick: () => useEditor.setState({ right: 'accessibility' }) },
        { label: 'Reduce motion', checked: useApp.getState().settings.reduceMotion, onClick: () => app().updateSettings({ reduceMotion: !app().settings.reduceMotion }) },
        { label: 'High color contrast', checked: useApp.getState().settings.highContrast, onClick: () => app().updateSettings({ highContrast: !app().settings.highContrast }) },
      ],
    },
    { label: 'Find and replace text', icon: 'Search', kbd: `${MOD}+F`, onClick: () => useEditor.setState({ right: 'find-replace' }) },
    { label: 'Translate', icon: 'Languages', onClick: () => useEditor.setState({ right: 'translate' }) },
    { sep: true },
    { label: 'Save', icon: 'Save', kbd: `${MOD}+S`, onClick: () => saveNow() },
    {
      label: 'Make a copy',
      icon: 'Copy',
      onClick: () => {
        const c = app().duplicateDesign(design.id);
        if (c) app().toast('Copy created — opened in a new tab');
        if (c) window.open(location.pathname + '#/design/' + c.id, '_blank');
      },
    },
    {
      label: 'Move to folder',
      icon: 'FolderInput',
      submenu: [
        { label: 'Projects (no folder)', onClick: () => app().patchDesign(design.id, { folderId: null }) },
        ...app()
          .folders.filter((f) => !f.trashedAt)
          .map((f) => ({ label: f.name, icon: 'Folder', onClick: () => app().patchDesign(design.id, { folderId: f.id }) })),
      ],
    },
    { label: 'Version history', icon: 'History', onClick: () => useEditor.setState({ right: 'versions' }) },
    { label: 'Make available offline', icon: 'CloudOff', checked: !!design.offline, onClick: () => ed().update((d) => void (d.offline = !d.offline)) },
    { sep: true },
    { label: 'Download', icon: 'Download', onClick: () => useEditor.setState({ modal: 'download' }) },
    { label: 'Print with Cream', icon: 'Printer', onClick: () => useEditor.setState({ modal: 'print' }) },
    { label: 'Keyboard shortcuts', icon: 'Keyboard', kbd: `${MOD}+/`, onClick: () => useEditor.setState({ modal: 'shortcuts' }) },
    { sep: true },
    {
      label: 'Move to Trash',
      icon: 'Trash2',
      danger: true,
      onClick: () => {
        app().trashDesign(design.id);
        app().navigate({ name: 'home', section: 'home' });
      },
    },
  ];

  return (
    <header className="editor-header" data-testid="editor-header">
      <button className="btn on-dark sm" onClick={() => app().navigate({ name: 'home', section: 'home' })} title="Home" data-testid="home-btn">
        <Icon name="ChevronLeft" size={16} /> Home
      </button>
      <button className="btn on-dark sm" onClick={(e) => setFileAnchor(e.currentTarget)} data-testid="file-menu">
        File
      </button>
      {fileAnchor && <Menu anchor={fileAnchor} items={fileItems} onClose={() => setFileAnchor(null)} width={280} />}
      <button className="btn on-dark sm" onClick={() => useEditor.setState({ modal: 'resize' })} data-testid="resize-btn">
        <Icon name="Wand2" size={15} /> Resize
      </button>
      <MenuButton
        className="btn on-dark sm"
        testId="mode-menu"
        items={[
          { label: 'Editing', icon: 'Pencil', checked: mode === 'edit', onClick: () => useEditor.setState({ mode: 'edit' }) },
          { label: 'Commenting', icon: 'MessageSquare', checked: mode === 'comment', onClick: () => useEditor.setState({ mode: 'comment', right: 'comments', draw: null }) },
          { label: 'Viewing', icon: 'Eye', checked: mode === 'view', onClick: () => useEditor.setState({ mode: 'view', selection: [], draw: null }) },
        ]}
      >
        <Icon name={mode === 'edit' ? 'Pencil' : mode === 'comment' ? 'MessageSquare' : 'Eye'} size={15} />
        {mode === 'edit' ? 'Editing' : mode === 'comment' ? 'Commenting' : 'Viewing'}
        <Icon name="ChevronDown" size={14} />
      </MenuButton>
      <div className="vdivider" style={{ background: 'rgba(255,255,255,.3)' }} />
      <button className="icon-btn on-dark" disabled={!canUndo} onClick={() => ed().undo()} title={`Undo (${MOD}+Z)`} data-testid="undo">
        <Icon name="Undo2" />
      </button>
      <button className="icon-btn on-dark" disabled={!canRedo} onClick={() => ed().redo()} title={`Redo (${MOD}+Y)`} data-testid="redo">
        <Icon name="Redo2" />
      </button>
      <span title={saveState === 'saved' ? 'All changes saved' : 'Saving…'} style={{ opacity: 0.85, display: 'inline-flex', marginLeft: 4 }} data-testid="save-state" data-state={saveState}>
        <Icon name={saveState === 'saved' ? 'CloudCheck' : 'CloudUpload'} size={18} />
      </span>
      <span className="grow" />
      <input
        className="title-input"
        value={design.title}
        onChange={(e) => ed().update((d) => void (d.title = e.target.value), { coalesce: 'title' })}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        data-testid="design-title"
        aria-label="Design title"
      />
      <span className="grow" />
      <div title={userName} style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', color: '#8b3dff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>
        {userName.slice(0, 1).toUpperCase()}
      </div>
      <button className={'icon-btn on-dark' + (right === 'insights' ? ' active' : '')} title="Insights" onClick={() => useEditor.setState({ right: right === 'insights' ? null : 'insights' })}>
        <Icon name="BarChart3" />
      </button>
      <button className={'icon-btn on-dark' + (right === 'timer' ? ' active' : '')} title="Timer" onClick={() => useEditor.setState({ right: right === 'timer' ? null : 'timer' })}>
        <Icon name="Timer" />
      </button>
      <button className={'icon-btn on-dark' + (right === 'comments' ? ' active' : '')} title="Comments" onClick={() => useEditor.setState({ right: right === 'comments' ? null : 'comments' })} data-testid="comments-btn">
        <Icon name="MessageSquare" />
      </button>
      {design.category === 'print' && (
        <button className="btn on-dark sm" onClick={() => useEditor.setState({ modal: 'print' })}>
          <Icon name="Printer" size={15} /> Print
        </button>
      )}
      {design.category === 'website' && (
        <button className="btn on-dark sm" onClick={() => useEditor.setState({ modal: 'publish-website' })}>
          <Icon name="Globe" size={15} /> Publish
        </button>
      )}
      <div className="row" style={{ gap: 0 }}>
        <button
          className="btn on-dark sm"
          style={{ borderRadius: '8px 0 0 8px' }}
          onClick={() => {
            saveNow();
            app().navigate({ name: 'present', id: design.id, mode: 'full' });
          }}
          data-testid="present-btn"
        >
          <Icon name="Play" size={15} /> Present
        </button>
        <MenuButton
          className="btn on-dark sm"
          testId="present-menu"
          items={[
            { label: 'Present full screen', icon: 'Maximize', kbd: `${MOD}+${ALT}+P`, onClick: () => (saveNow(), app().navigate({ name: 'present', id: design.id, mode: 'full' })) },
            { label: 'Presenter view', icon: 'MonitorSpeaker', onClick: () => (saveNow(), app().navigate({ name: 'present', id: design.id, mode: 'presenter' })) },
            { label: 'Autoplay', icon: 'PlayCircle', onClick: () => (saveNow(), app().navigate({ name: 'present', id: design.id, mode: 'autoplay' })) },
            { label: 'Present and record', icon: 'Video', onClick: () => useEditor.setState({ modal: 'present-record' }) },
          ]}
        >
          <Icon name="ChevronDown" size={14} />
        </MenuButton>
      </div>
      <button className="btn sm" style={{ background: '#fff', color: '#1d1a26', borderColor: '#fff' }} onClick={() => useEditor.setState({ modal: 'share' })} data-testid="share-btn">
        <Icon name="Share" size={15} /> Share
      </button>
    </header>
  );
}

export function saveNow() {
  const d = useEditor.getState().design;
  if (!d) return;
  useApp.getState().saveDesign(d, true);
  useEditor.setState({ saveState: 'saved' });
}
