import { useEditor, selectedEls, findEl } from '../store/editor';
import { Menu, type MenuItem, MOD, ALT } from '../ui/ui';
import { setPageBackgroundImage } from './dnd';
import { useApp } from '../store/app';

export function ContextMenu() {
  const menu = useEditor((s) => s.ctxMenu);
  if (!menu) return null;
  const s = useEditor.getState();
  const els = selectedEls(s);
  const close = () => useEditor.setState({ ctxMenu: null });
  const el = els[0];
  const items: MenuItem[] = [];
  if (els.length) {
    items.push(
      { label: 'Copy', icon: 'Copy', kbd: `${MOD}+C`, onClick: () => s.copy() },
      { label: 'Copy style', icon: 'Paintbrush', kbd: `${MOD}+${ALT}+C`, onClick: () => s.copyStyle() },
      { label: 'Paste', icon: 'ClipboardPaste', kbd: `${MOD}+V`, onClick: () => s.paste() },
      { label: 'Paste style', icon: 'PaintBucket', kbd: `${MOD}+${ALT}+V`, disabled: !s.styleClipboard, onClick: () => s.pasteStyle() },
      { label: 'Duplicate', icon: 'CopyPlus', kbd: `${MOD}+D`, onClick: () => s.duplicateSelected() },
      { label: 'Delete', icon: 'Trash2', kbd: 'Del', onClick: () => s.deleteSelected() },
      { sep: true },
      {
        label: 'Layer',
        icon: 'Layers',
        submenu: [
          { label: 'Bring forward', kbd: `${MOD}+]`, onClick: () => s.arrange('forward') },
          { label: 'Bring to front', kbd: `${MOD}+${ALT}+]`, onClick: () => s.arrange('front') },
          { label: 'Send backward', kbd: `${MOD}+[`, onClick: () => s.arrange('backward') },
          { label: 'Send to back', kbd: `${MOD}+${ALT}+[`, onClick: () => s.arrange('back') },
          { sep: true },
          { label: 'Show layers', onClick: () => useEditor.setState({ right: 'position' }) },
        ],
      },
      {
        label: els.length > 1 ? 'Align elements' : 'Align to page',
        icon: 'AlignCenter',
        submenu: (['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((op) => ({
          label: op[0].toUpperCase() + op.slice(1),
          onClick: () => (els.length > 1 ? s.alignSelection(op) : s.alignToPage(op)),
        })),
      },
    );
    if (els.length > 1) items.push({ label: els.every((e) => e.groupId && e.groupId === els[0].groupId) ? 'Ungroup' : 'Group', icon: 'Group', kbd: `${MOD}+G`, onClick: () => (els.every((e) => e.groupId && e.groupId === els[0].groupId) ? s.ungroup() : s.group()) });
    else if (el?.groupId) items.push({ label: 'Ungroup', icon: 'Ungroup', kbd: `${MOD}+⇧+G`, onClick: () => s.ungroup() });
    items.push(
      { label: 'Comment', icon: 'MessageSquarePlus', kbd: `${MOD}+${ALT}+N`, onClick: () => {
        window.dispatchEvent(new CustomEvent('cream:add-comment', { detail: { pageId: menu.pageId, elId: el?.id, x: el ? el.x + el.w : undefined, y: el?.y } }));
        useEditor.setState({ right: 'comments' });
      } },
      { label: 'Link', icon: 'Link', kbd: `${MOD}+K`, onClick: () => useEditor.setState({ modal: 'link' }) },
      {
        label: el?.locked ? 'Unlock' : 'Lock',
        icon: el?.locked ? 'Unlock' : 'Lock',
        submenu: el?.locked
          ? [{ label: 'Unlock', onClick: () => s.toggleLock() }]
          : [
              { label: 'Lock', kbd: `${ALT}+⇧+L`, onClick: () => s.toggleLock('full') },
              { label: 'Lock position only', onClick: () => s.toggleLock('position') },
            ],
      },
      { label: 'Alternative text', icon: 'ScanText', onClick: () => useEditor.setState({ modal: 'alt-text' }) },
    );
    if (el && els.length === 1) {
      items.push({ label: 'Show timing', icon: 'Clock', onClick: () => {
        s.updateEl(el.id, { timing: el.timing ?? { start: 0, end: (findEl(s.design!, el.id)?.page.duration ?? 5) } });
        useEditor.setState({ showTimeline: true });
      } });
      items.push({ label: 'Animate', icon: 'Sparkles', onClick: () => useEditor.setState({ right: 'animate' }) });
    }
    if (el?.type === 'image') {
      items.push(
        { sep: true },
        { label: 'Set image as background', icon: 'Wallpaper', onClick: () => {
          setPageBackgroundImage(el.src, el.credit);
          s.deleteSelected();
        } },
        { label: 'Apply colors to page', icon: 'Palette', onClick: () => applyImageColors(el.src) },
        { label: 'Replace', icon: 'Replace', onClick: () => useEditor.setState({ side: 'photos' }) },
        { label: 'Edit image', icon: 'SlidersHorizontal', onClick: () => useEditor.setState({ right: 'edit-image' }) },
        { label: 'Crop', icon: 'Crop', onClick: () => useEditor.setState({ cropId: el.id }) },
      );
      if (el.credit) items.push({ label: 'Info', icon: 'Info', onClick: () => useApp.getState().toast(`${el.credit?.title ?? 'Image'} by ${el.credit?.creator ?? 'unknown'} · ${el.credit?.license ?? ''} · ${el.credit?.source ?? ''}`) });
    }
    if (el?.type === 'text') items.push({ sep: true }, { label: 'Translate', icon: 'Languages', onClick: () => useEditor.setState({ right: 'translate' }) }, { label: 'Magic Write', icon: 'Wand2', onClick: () => useEditor.setState({ right: 'magic-write' }) });
    if (el?.type === 'video') items.push({ sep: true }, { label: 'Edit video', icon: 'Film', onClick: () => useEditor.setState({ right: 'video' }) });
    if (el?.type === 'chart') items.push({ sep: true }, { label: 'Edit chart data', icon: 'Table', onClick: () => useEditor.setState({ right: 'chart-data' }) });
    if (el?.type === 'frame' || el?.type === 'grid') items.push({ sep: true }, { label: 'Detach image', icon: 'ImageOff', onClick: () => detachMedia(el.id) });
  } else {
    const pid = menu.pageId!;
    const page = s.design?.pages.find((p) => p.id === pid);
    items.push(
      { label: 'Paste', icon: 'ClipboardPaste', kbd: `${MOD}+V`, onClick: () => s.paste() },
      { sep: true },
      { label: 'Add page', icon: 'FilePlus2', kbd: `${MOD}+Enter`, onClick: () => s.addPage(pid) },
      { label: 'Duplicate page', icon: 'Copy', onClick: () => s.duplicatePage(pid) },
      { label: 'Delete page', icon: 'Trash2', onClick: () => s.deletePage(pid) },
      { label: page?.hidden ? 'Unhide page' : 'Hide page', icon: 'EyeOff', onClick: () => s.patchPage(pid, { hidden: !page?.hidden }) },
      { label: page?.locked ? 'Unlock page' : 'Lock page', icon: 'Lock', onClick: () => s.patchPage(pid, { locked: !page?.locked }) },
      { sep: true },
      { label: 'Add notes', icon: 'StickyNote', onClick: () => useEditor.setState({ right: 'notes' }) },
      { label: 'Background color', icon: 'PaintBucket', onClick: () => useEditor.setState({ right: 'color', colorTarget: { kind: 'page-bg' } }) },
      { label: 'Remove background image', icon: 'ImageOff', disabled: !page?.backgroundImage, onClick: () => s.patchPage(pid, { backgroundImage: undefined }) },
      { label: s.design?.settings?.rulers ? 'Hide rulers' : 'Show rulers', icon: 'Ruler', kbd: '⇧R', onClick: () => s.update((d) => void (d.settings = { ...(d.settings ?? {}), rulers: !d.settings?.rulers })) },
      { label: 'Add guides', icon: 'Grid3x3', onClick: () => useEditor.setState({ modal: 'add-guides' }) },
      { label: 'Comment', icon: 'MessageSquarePlus', onClick: () => useEditor.setState({ mode: 'comment', right: 'comments' }) },
      { label: 'Expand to whiteboard', icon: 'Maximize2', onClick: () => s.patchPage(pid, { height: page?.height ? undefined : (s.design!.height * 3) }) },
    );
  }
  return <Menu anchor={{ x: menu.x, y: menu.y }} items={items} onClose={close} width={250} />;
}

function detachMedia(id: string) {
  useEditor.getState().updateEl(id, (e) => {
    if (e.type === 'frame') e.media = { scale: 1, offsetX: 0, offsetY: 0, fill: '#d9d9d9' };
    if (e.type === 'grid') e.cells = e.cells.map(() => ({ scale: 1, offsetX: 0, offsetY: 0, fill: '#d9d9d9' }));
  });
}

/** Extract a small palette from an image and recolour the page (background + text). */
export async function applyImageColors(src: string) {
  const { resolveSrc } = await import('../store/blobs');
  const url = await resolveSrc(src);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode().catch(() => {});
  const c = document.createElement('canvas');
  c.width = 40;
  c.height = 40;
  const g = c.getContext('2d')!;
  try {
    g.drawImage(img, 0, 0, 40, 40);
    const data = g.getImageData(0, 0, 40, 40).data;
    const buckets = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const k = [data[i], data[i + 1], data[i + 2]].map((v) => Math.round(v / 32) * 32).join(',');
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const top = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => '#' + k.split(',').map((v) => Math.min(255, +v).toString(16).padStart(2, '0')).join(''));
    const pid = useEditor.getState().pageId!;
    useEditor.getState().update((d) => {
      const p = d.pages.find((x) => x.id === pid)!;
      p.background = { kind: 'solid', color: top[0] };
      p.elements.forEach((e, i) => {
        if (e.type === 'shape') e.fill = { kind: 'solid', color: top[(i % 3) + 1] ?? top[0] };
      });
    });
  } catch {
    useApp.getState().toast('Could not read colours from this image', 'error');
  }
}
