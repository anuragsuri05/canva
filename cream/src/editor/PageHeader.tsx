import type { Page } from '../model/types';
import { useEditor } from '../store/editor';
import { Icon, MenuButton } from '../ui/ui';

export function PageHeader({ page, index }: { page: Page; index: number }) {
  const count = useEditor((s) => s.design?.pages.length ?? 1);
  const ed = useEditor.getState;
  return (
    <div className="page-head ctx-keep" data-testid={`page-head-${index}`}>
      <span style={{ fontWeight: 600, marginRight: 4 }}>Page {index + 1}</span>
      <span className="faint">-</span>
      <input
        className="page-title"
        placeholder="Add page title"
        value={page.title ?? ''}
        onChange={(e) => ed().patchPage(page.id, { title: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <span className="grow" />
      <button className="icon-btn" title="Move page up" disabled={index === 0} onClick={() => ed().movePage(page.id, -1)}>
        <Icon name="ChevronUp" size={16} />
      </button>
      <button className="icon-btn" title="Move page down" disabled={index === count - 1} onClick={() => ed().movePage(page.id, 1)}>
        <Icon name="ChevronDown" size={16} />
      </button>
      <button className={'icon-btn' + (page.hidden ? ' active' : '')} title={page.hidden ? 'Unhide page' : 'Hide page'} onClick={() => ed().patchPage(page.id, { hidden: !page.hidden })} data-testid="hide-page">
        <Icon name={page.hidden ? 'EyeOff' : 'Eye'} size={16} />
      </button>
      <button className={'icon-btn' + (page.locked ? ' active' : '')} title={page.locked ? 'Unlock page' : 'Lock page'} onClick={() => ed().patchPage(page.id, { locked: !page.locked })} data-testid="lock-page">
        <Icon name={page.locked ? 'Lock' : 'Unlock'} size={16} />
      </button>
      <button className="icon-btn" title="Duplicate page" onClick={() => ed().duplicatePage(page.id)} data-testid="duplicate-page">
        <Icon name="Copy" size={16} />
      </button>
      <button className="icon-btn" title="Delete page" onClick={() => ed().deletePage(page.id)} data-testid="delete-page">
        <Icon name="Trash2" size={16} />
      </button>
      <button className="icon-btn" title="Add page" onClick={() => ed().addPage(page.id)}>
        <Icon name="FilePlus2" size={16} />
      </button>
      <MenuButton
        className="icon-btn"
        title="More page options"
        items={[
          { label: 'Add notes', icon: 'StickyNote', onClick: () => useEditor.setState({ right: 'notes', pageId: page.id }) },
          { label: 'Add transition', icon: 'ArrowRightLeft', onClick: () => useEditor.setState({ right: 'transition', pageId: page.id }) },
          { label: 'Animate page', icon: 'Sparkles', onClick: () => useEditor.setState({ right: 'animate', pageId: page.id, selection: [] }) },
          { sep: true },
          { label: 'Copy link to page', icon: 'Link', onClick: () => navigator.clipboard?.writeText(location.href.split('?')[0] + '?page=' + (index + 1)) },
          { label: 'Expand to whiteboard', icon: 'Maximize2', onClick: () => ed().patchPage(page.id, { height: page.height ? undefined : (ed().design!.height * 3) }) },
        ]}
      >
        <Icon name="MoreHorizontal" size={16} />
      </MenuButton>
    </div>
  );
}
