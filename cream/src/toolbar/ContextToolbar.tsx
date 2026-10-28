import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Draft } from 'immer';
import type {
  ChartEl,
  ChartType,
  DrawEl,
  El,
  EmbedEl,
  FrameEl,
  GridEl,
  ImageEl,
  LineCap,
  LineEl,
  ShapeEl,
  StickyEl,
  Stroke,
  SvgEl,
  TableEl,
  TextEl,
  VideoEl,
} from '../model/types';
import { findEl, useCurrentPage, useEditor, useSelected } from '../store/editor';
import { useApp } from '../store/app';
import { ALT, Icon, Menu, MenuButton, MOD, PopoverButton, Segmented, Toggle, type MenuItem } from '../ui/ui';
import { svgColors } from '../render/Elements';
import { STICKY_COLORS } from '../model/defaults';
import { setPageBackgroundImage } from '../editor/dnd';
import { applyImageColors } from '../editor/ContextMenu';
import { FillSwatch, TSlider, keepFocus } from './common';
import { fillCssOf, solid, stripInlineColor, type ColorTarget } from './colors';
import { execOnSelection, hasPartialSelection, useTbLocal } from './local';
import { applyAspect, applyZoom, ASPECTS, currentZoom, removeBackground, replaceFromFile } from './imageTools';
import './toolbar.css';

/* =====================================================================
   Helpers
   ===================================================================== */

const S = () => useEditor.getState();
const upd = (fn: (e: Draft<El>) => void, coalesce?: string) => S().updateSelected(fn, coalesce ? { coalesce } : undefined);

function openPanel(id: NonNullable<ReturnType<typeof S>['right']>) {
  useEditor.setState({ right: S().right === id ? null : id });
}

function openColor(target: ColorTarget) {
  const s = S();
  const same = s.right === 'color' && s.colorTarget?.kind === target.kind && s.colorTarget?.key === target.key;
  useEditor.setState({ right: same ? null : 'color', colorTarget: same ? null : target });
}

function useRightIs(id: string, kind?: string, key?: string) {
  return useEditor((s) => s.right === id && (!kind || (s.colorTarget?.kind === kind && (key === undefined || s.colorTarget?.key === key))));
}

function TB({
  icon,
  label,
  title,
  active,
  onClick,
  testId,
  disabled,
  children,
  className = '',
}: {
  icon?: string;
  label?: ReactNode;
  title?: string;
  active?: boolean;
  onClick?: () => void;
  testId?: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={'tb-btn ' + className + (active ? ' active' : '')}
      title={title}
      aria-label={title}
      data-testid={testId}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={18} />}
      {label != null && <span className="tb-label">{label}</span>}
      {children}
    </button>
  );
}

const Sep = () => <span className="tb-sep" />;

const PopTitle = ({ children }: { children: ReactNode }) => <div className="ct-pop-title" style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{children}</div>;

/* =====================================================================
   Root
   ===================================================================== */

export default function ContextToolbar() {
  const els = useSelected();
  const cropId = useEditor((s) => s.cropId);
  const selKey = useEditor((s) => s.selection.join(','));
  const mode = useEditor((s) => s.mode);

  // Paint roller: paste the copied style onto the next element selected.
  useEffect(() => {
    const armed = useTbLocal.getState().paintArmed;
    if (armed && selKey && selKey !== armed) {
      S().pasteStyle();
      useTbLocal.setState({ paintArmed: null });
    }
  }, [selKey]);

  let body: ReactNode;
  if (mode === 'view') body = <span className="tb-locked-msg"><Icon name="Eye" size={16} /> View only</span>;
  else if (cropId) body = <CropBar id={cropId} />;
  else if (!els.length) body = <PageBar />;
  else if (els.some((e) => e.locked === 'full' || e.brandLocked)) body = <LockedBar els={els} />;
  else if (els.length > 1 && !(els.every((e) => e.type === els[0].type) && ['text', 'shape', 'line'].includes(els[0].type))) body = <MultiBar els={els} />;
  else body = <ElementBar els={els} />;

  return (
    <div className="ctx-toolbar" data-testid="ctx-toolbar" onMouseDown={keepFocus}>
      {body}
    </div>
  );
}

function ElementBar({ els }: { els: El[] }) {
  const el = els[0];
  const multi = els.length > 1;
  const pre = multi ? <GroupBtn els={els} /> : null;
  switch (el.type) {
    case 'text':
      return <>{pre}<TextBar els={els as TextEl[]} /></>;
    case 'shape':
      return <>{pre}<ShapeBar els={els as ShapeEl[]} /></>;
    case 'line':
      return <>{pre}<LineBar els={els as LineEl[]} /></>;
    case 'image':
      return <ImageBar el={el} />;
    case 'svg':
      return <SvgBar el={el} />;
    case 'video':
      return <VideoBar el={el} />;
    case 'chart':
      return <ChartBar el={el} />;
    case 'table':
      return <TableBar el={el} />;
    case 'frame':
    case 'grid':
      return <FrameBar el={el} />;
    case 'sticky':
      return <StickyBar el={el} />;
    case 'draw':
      return <DrawBar el={el} />;
    case 'embed':
      return <EmbedBar el={el} />;
  }
}

/* =====================================================================
   Common trailing controls
   ===================================================================== */

function Tail({ els, copyStyle = true, animate = true }: { els: El[]; copyStyle?: boolean; animate?: boolean }) {
  const animOn = useRightIs('animate');
  const posOn = useRightIs('position');
  const hasAnim = els.some((e) => e.anim);
  return (
    <>
      <Sep />
      {animate && (
        <TB label="Animate" icon={hasAnim ? 'Sparkles' : undefined} title="Animate" testId="tb-animate" active={animOn} onClick={() => openPanel('animate')} />
      )}
      <TB label="Position" title="Position" testId="tb-position" active={posOn} onClick={() => openPanel('position')} />
      <Sep />
      <TransparencyBtn els={els} />
      {copyStyle && <CopyStyleBtn />}
      <LockBtn els={els} />
      <MoreBtn els={els} />
    </>
  );
}

function TransparencyBtn({ els }: { els: El[] }) {
  const v = Math.round((els[0]?.opacity ?? 1) * 100);
  return (
    <PopoverButton
      title="Transparency"
      testId="tb-transparency"
      width={260}
      content={() => (
        <div>
          <PopTitle>Transparency</PopTitle>
          <TSlider value={v} min={0} max={100} onChange={(n) => upd((e) => void (e.opacity = n / 100), 'opacity')} testId="transparency-slider" />
        </div>
      )}
    >
      <span className="tb-swatch checker" style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.9 }} />
    </PopoverButton>
  );
}

function CopyStyleBtn() {
  const armed = useTbLocal((s) => !!s.paintArmed);
  return (
    <TB
      icon="Paintbrush"
      title={`Copy style (${MOD}+${ALT}+C)`}
      testId="tb-copy-style"
      active={armed}
      onClick={() => {
        if (armed) return useTbLocal.setState({ paintArmed: null });
        S().copyStyle();
        useTbLocal.setState({ paintArmed: S().selection.join(',') });
      }}
    />
  );
}

function LockBtn({ els }: { els: El[] }) {
  const locked = els.every((e) => e.locked);
  if (locked)
    return <TB icon="Lock" title={`Unlock (${ALT}+Shift+L)`} testId="tb-lock" active onClick={() => S().toggleLock()} />;
  return (
    <MenuButton
      className="tb-btn"
      title={`Lock (${ALT}+Shift+L)`}
      testId="tb-lock"
      items={[
        { label: 'Lock', icon: 'Lock', kbd: `${ALT}+⇧+L`, onClick: () => S().toggleLock('full'), testId: 'lock-full' },
        { label: 'Lock position only', icon: 'Move', onClick: () => S().toggleLock('position'), testId: 'lock-position' },
      ]}
    >
      <Icon name="LockOpen" size={18} />
    </MenuButton>
  );
}

function addComment(el?: El) {
  const s = S();
  window.dispatchEvent(new CustomEvent('cream:add-comment', { detail: { pageId: s.pageId, elId: el?.id, x: el ? el.x + el.w : undefined, y: el?.y } }));
  useEditor.setState({ right: 'comments' });
}

function moreItems(els: El[]): MenuItem[] {
  const s = S();
  const el = els[0];
  const one = els.length === 1;
  const items: MenuItem[] = [
    { label: 'Copy', icon: 'Copy', kbd: `${MOD}+C`, onClick: () => s.copy() },
    { label: 'Copy style', icon: 'Paintbrush', kbd: `${MOD}+${ALT}+C`, onClick: () => s.copyStyle() },
    { label: 'Paste style', icon: 'PaintBucket', kbd: `${MOD}+${ALT}+V`, disabled: !s.styleClipboard, onClick: () => s.pasteStyle() },
    { label: 'Duplicate', icon: 'CopyPlus', kbd: `${MOD}+D`, onClick: () => s.duplicateSelected(), testId: 'more-duplicate' },
    { label: 'Delete', icon: 'Trash2', kbd: 'Del', onClick: () => s.deleteSelected(), testId: 'more-delete' },
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
    { sep: true },
    { label: 'Comment', icon: 'MessageSquarePlus', kbd: `${MOD}+${ALT}+N`, onClick: () => addComment(el) },
    { label: el?.link ? 'Edit link' : 'Link', icon: 'Link', kbd: `${MOD}+K`, onClick: () => useEditor.setState({ modal: 'link' }), testId: 'more-link' },
    { label: 'Alternative text', icon: 'ScanText', onClick: () => useEditor.setState({ modal: 'alt-text' }), testId: 'more-alt' },
  ];
  if (one)
    items.push({
      label: 'Show timing',
      icon: 'Clock',
      onClick: () => {
        const page = findEl(s.design!, el.id)?.page;
        s.updateEl(el.id, { timing: el.timing ?? { start: 0, end: page?.duration ?? 5 } });
        useEditor.setState({ showTimeline: true });
      },
    });
  if (el?.type === 'text' && one)
    items.push(
      { sep: true },
      { label: 'Magic Write', icon: 'Wand2', onClick: () => useEditor.setState({ right: 'magic-write' }) },
      { label: 'Translate', icon: 'Languages', onClick: () => useEditor.setState({ right: 'translate' }) },
    );
  if (el?.type === 'image' && one) {
    const im = el as ImageEl;
    items.push(
      { sep: true },
      { label: 'Replace', icon: 'Replace', onClick: () => replaceFromFile(im.id), testId: 'more-replace' },
      {
        label: 'Set image as background',
        icon: 'Wallpaper',
        testId: 'more-set-bg',
        onClick: () => {
          setPageBackgroundImage(im.src, im.credit);
          s.deleteSelected();
        },
      },
      { label: 'Apply colors to page', icon: 'Palette', onClick: () => applyImageColors(im.src) },
    );
    if (im.originalSrc)
      items.push({
        label: 'Restore original image',
        icon: 'Undo2',
        onClick: () => s.updateEl(im.id, (e) => void ((e as ImageEl).src = (e as ImageEl).originalSrc!, ((e as ImageEl).bgRemoved = false))),
      });
    items.push({
      label: 'Info',
      icon: 'Info',
      onClick: () =>
        useApp
          .getState()
          .toast(im.credit ? `${im.credit.title ?? 'Image'} by ${im.credit.creator ?? 'unknown'} · ${im.credit.license ?? ''} · ${im.credit.source ?? ''}` : `Image · ${im.naturalW}×${im.naturalH}px`),
    });
  }
  if ((el?.type === 'frame' || el?.type === 'grid') && one)
    items.push({ sep: true }, { label: 'Replace', icon: 'Replace', onClick: () => replaceFromFile(el.id) }, { label: 'Detach image', icon: 'ImageOff', onClick: () => detachMedia(el.id) });
  return items;
}

function MoreBtn({ els }: { els: El[] }) {
  return (
    <MenuButton className="tb-btn" title="More" testId="tb-more" items={() => moreItems(els)} placement="bottom-end">
      <Icon name="Ellipsis" size={18} />
    </MenuButton>
  );
}

function GroupBtn({ els }: { els: El[] }) {
  const grouped = els.length > 1 && els.every((e) => e.groupId && e.groupId === els[0].groupId);
  return (
    <>
      <TB
        label={grouped ? 'Ungroup' : 'Group'}
        icon={grouped ? 'Ungroup' : 'Group'}
        title={grouped ? `Ungroup (${MOD}+Shift+G)` : `Group (${MOD}+G)`}
        testId="tb-group"
        onClick={() => (grouped ? S().ungroup() : S().group())}
      />
      <Sep />
    </>
  );
}

/* =====================================================================
   Page (nothing selected)
   ===================================================================== */

function PageBar() {
  const page = useCurrentPage();
  const category = useEditor((s) => s.design?.category);
  const bgOn = useRightIs('color', 'page-bg');
  const animOn = useRightIs('animate');
  const posOn = useRightIs('position');
  const trOn = useRightIs('transition');
  if (!page) return null;
  const timed = category === 'video' || category === 'presentation' || category === 'social';
  return (
    <>
      <TB title="Background color" testId="tb-bg-color" active={bgOn} onClick={() => openColor({ kind: 'page-bg' })}>
        <FillSwatch fill={page.background} size={24} />
      </TB>
      {page.backgroundImage && (
        <>
          <TB
            label="Edit background"
            icon="SlidersHorizontal"
            title="Edit background image"
            testId="tb-edit-bg-image"
            onClick={() => useEditor.setState({ right: 'edit-image', colorTarget: { kind: 'page-bg-image' } })}
          />
          <TB icon="ImageOff" title="Remove background image" testId="tb-remove-bg-image" onClick={() => S().patchPage(page.id, { backgroundImage: undefined })} />
        </>
      )}
      <Sep />
      <TB label="Animate" icon={page.pageAnim ? 'Sparkles' : undefined} title="Animate page" testId="tb-animate" active={animOn} onClick={() => openPanel('animate')} />
      <TB label="Transition" title="Page transition" testId="tb-transition" active={trOn} onClick={() => openPanel('transition')} />
      {timed && (
        <PopoverButton
          title="Page duration"
          testId="tb-duration"
          width={240}
          content={() => (
            <div>
              <PopTitle>Page duration</PopTitle>
              <TSlider value={page.duration} min={0.5} max={60} step={0.1} onChange={(v) => S().patchPage(page.id, { duration: v })} testId="duration-slider" />
              <button className="btn sm block" onClick={() => S().update((d) => d.pages.forEach((p) => (p.duration = page.duration)))}>
                Apply to all pages
              </button>
            </div>
          )}
        >
          <Icon name="Clock" size={16} />
          <span className="tb-label">{page.duration.toFixed(1)}s</span>
        </PopoverButton>
      )}
      <Sep />
      <TB label="Position" title="Layers" testId="tb-position" active={posOn} onClick={() => openPanel('position')} />
      <TB icon={page.locked ? 'Lock' : 'LockOpen'} title={page.locked ? 'Unlock page' : 'Lock page'} testId="tb-lock-page" active={!!page.locked} onClick={() => S().patchPage(page.id, { locked: !page.locked })} />
    </>
  );
}

/* =====================================================================
   Locked / Multi
   ===================================================================== */

function LockedBar({ els }: { els: El[] }) {
  const posOn = useRightIs('position');
  return (
    <>
      <span className="tb-locked-msg">
        <Icon name="Lock" size={15} /> {els.some((e) => e.brandLocked) ? 'Locked by brand template' : 'Locked'}
      </span>
      <TB icon="LockOpen" label="Unlock" title={`Unlock (${ALT}+Shift+L)`} testId="tb-lock" disabled={els.some((e) => e.brandLocked)} onClick={() => S().toggleLock()} />
      <Sep />
      <TB label="Position" title="Position" testId="tb-position" active={posOn} onClick={() => openPanel('position')} />
    </>
  );
}

function MultiBar({ els }: { els: El[] }) {
  const s = S();

  return (
    <>
      <GroupBtn els={els} />

      <MenuButton
        className="tb-btn"
        title="Align elements"
        testId="tb-align-elements"
        items={[
          ...(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((op) => ({
            label: 'Align ' + op,
            icon: { left: 'AlignStartVertical', center: 'AlignCenterVertical', right: 'AlignEndVertical', top: 'AlignStartHorizontal', middle: 'AlignCenterHorizontal', bottom: 'AlignEndHorizontal' }[op],
            onClick: () => s.alignSelection(op),
          })),
          { sep: true },
          { label: 'Space evenly horizontally', icon: 'AlignHorizontalSpaceAround', onClick: () => s.distribute('h'), disabled: els.length < 3 },
          { label: 'Space evenly vertically', icon: 'AlignVerticalSpaceAround', onClick: () => s.distribute('v'), disabled: els.length < 3 },
          { label: 'Tidy up', icon: 'LayoutGrid', kbd: `${ALT}+⇧+T`, onClick: () => s.tidyUp() },
        ]}
      >
        <Icon name="AlignCenterVertical" size={18} />
        <span className="tb-label">Align</span>
      </MenuButton>
      <Tail els={els} copyStyle={false} />
    </>
  );
}

/* =====================================================================
   Text
   ===================================================================== */

const SIZE_PRESETS = [6, 8, 10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 88, 96, 104, 120, 144];

export function FontSizeBox({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(Math.round(value * 10) / 10));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setTxt(String(Math.round(value * 10) / 10)), [value]);
  const commit = (n: number) => {
    if (!Number.isFinite(n)) return;
    onChange(Math.max(1, Math.min(800, n)));
  };
  return (
    <>
      <div className="tb-size" ref={ref}>
        <button title={`Decrease font size (${MOD}+Shift+,)`} onClick={() => commit(Math.round(value) - 1)} data-testid="tb-font-size-dec">
          <Icon name="Minus" size={14} />
        </button>
        <input
          value={txt}
          data-testid="tb-font-size"
          aria-label="Font size"
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={() => commit(parseFloat(txt))}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              commit(parseFloat(txt));
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'ArrowUp') commit(Math.round(value) + 1);
            if (e.key === 'ArrowDown') commit(Math.round(value) - 1);
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <button title={`Increase font size (${MOD}+Shift+.)`} onClick={() => commit(Math.round(value) + 1)} data-testid="tb-font-size-inc">
          <Icon name="Plus" size={14} />
        </button>
      </div>
      {open && (
        <Menu
          anchor={ref.current}
          width={96}
          onClose={() => setOpen(false)}
          items={SIZE_PRESETS.map((n) => ({ label: String(n), checked: Math.round(value) === n, onClick: () => commit(n), testId: `font-size-${n}` }))}
        />
      )}
    </>
  );
}

function FontButton({ family }: { family: string }) {
  const on = useRightIs('font');
  return (
    <TB className="tb-font" title={`Font (${MOD}+Shift+F)`} testId="tb-font" active={on} onClick={() => openPanel('font')}>
      <span style={{ fontFamily: `'${family}', sans-serif` }}>{family}</span>
      <Icon name="ChevronDown" size={14} className="tb-caret" />
    </TB>
  );
}

function TextColorBtn({ color, gradient, testId = 'tb-color', kind = 'text' }: { color: string; gradient?: string; testId?: string; kind?: string }) {
  const on = useRightIs('color', kind);
  return (
    <TB title="Text color" testId={testId} active={on} onClick={() => openColor({ kind })}>
      <span className="tb-color-a">
        A<i style={{ background: gradient ?? color }} />
      </span>
    </TB>
  );
}

/** Strip inline formatting tags so a whole-element toggle wins. */
const stripTag = (html: string, tags: string[], css: RegExp) =>
  html.replace(new RegExp(`</?(${tags.join('|')})(\\s[^>]*)?>`, 'gi'), '').replace(css, '');

function toggleFormat(kind: 'bold' | 'italic' | 'underline' | 'strike', els: (TextEl | ShapeEl)[]) {
  const cmd = { bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }[kind];
  if (S().editingId && hasPartialSelection() && execOnSelection(cmd)) return;
  const first = els[0];
  const on =
    kind === 'bold' ? (first.fontWeight ?? 400) >= 600 : kind === 'italic' ? !!first.italic : kind === 'underline' ? !!first.underline : !!first.strike;
  upd((e) => {
    if (e.type !== 'text' && e.type !== 'shape') return;
    const t = e as Draft<TextEl>;
    if (kind === 'bold') {
      t.fontWeight = on ? 400 : 700;
      if (t.html) t.html = stripTag(t.html, ['b', 'strong'], /font-weight\s*:\s*[^;"]+;?/gi);
    } else if (kind === 'italic') {
      t.italic = !on;
      if (t.html) t.html = stripTag(t.html, ['i', 'em'], /font-style\s*:\s*[^;"]+;?/gi);
    } else if (kind === 'underline') {
      t.underline = !on;
      if (t.html) t.html = stripTag(t.html, ['u'], /text-decoration(-line)?\s*:\s*underline;?/gi);
    } else {
      t.strike = !on;
      if (t.html) t.html = stripTag(t.html, ['s', 'strike', 'del'], /text-decoration(-line)?\s*:\s*line-through;?/gi);
    }
  });
}

const ALIGN_ICON = { left: 'AlignLeft', center: 'AlignCenter', right: 'AlignRight', justify: 'AlignJustify' } as const;
const ALIGN_NEXT = { left: 'center', center: 'right', right: 'justify', justify: 'left' } as const;

function TextFormatButtons({ els, lists = true }: { els: (TextEl | ShapeEl)[]; lists?: boolean }) {
  const el = els[0];
  const align = (el.align ?? 'left') as keyof typeof ALIGN_ICON;
  const list = el.list;
  return (
    <>
      <TB icon="Bold" title={`Bold (${MOD}+B)`} testId="tb-bold" active={(el.fontWeight ?? 400) >= 600} onClick={() => toggleFormat('bold', els)} />
      <TB icon="Italic" title={`Italic (${MOD}+I)`} testId="tb-italic" active={!!el.italic} onClick={() => toggleFormat('italic', els)} />
      <TB icon="Underline" title={`Underline (${MOD}+U)`} testId="tb-underline" active={!!el.underline} onClick={() => toggleFormat('underline', els)} />
      <TB icon="Strikethrough" title="Strikethrough" testId="tb-strike" active={!!el.strike} onClick={() => toggleFormat('strike', els)} />
      <TB
        icon="CaseSensitive"
        title={`Uppercase (${MOD}+Shift+K)`}
        testId="tb-case"
        active={!!el.uppercase}
        onClick={() => upd((e) => void ((e as TextEl).uppercase = !el.uppercase))}
      />
      <TB
        icon={ALIGN_ICON[align]}
        title={`Alignment: ${align}`}
        testId="tb-align"
        onClick={() => upd((e) => void ((e as TextEl).align = ALIGN_NEXT[align]))}
      />
      {lists && (
        <TB
          icon={list === 'number' ? 'ListOrdered' : 'List'}
          title={list === 'bullet' ? `Numbered list (${MOD}+Shift+7)` : list === 'number' ? 'No list' : `Bulleted list (${MOD}+Shift+8)`}
          testId="tb-list"
          active={!!list}
          onClick={() =>
            upd((e) => {
              const t = e as Draft<TextEl>;
              t.list = list === undefined ? 'bullet' : list === 'bullet' ? 'number' : undefined;
              if (!t.list) delete t.list;
            })
          }
        />
      )}
    </>
  );
}

function SpacingBtn({ el }: { el: TextEl | ShapeEl }) {
  return (
    <PopoverButton
      title="Spacing"
      testId="tb-spacing"
      width={280}
      content={() => (
        <div>
          <TSlider label="Letter spacing" value={el.letterSpacing ?? 0} min={-200} max={800} onChange={(v) => upd((e) => void ((e as TextEl).letterSpacing = v), 'ls')} testId="letter-spacing" />
          <TSlider label="Line spacing" value={el.lineHeight ?? 1.4} min={0.5} max={2.5} step={0.01} onChange={(v) => upd((e) => void ((e as TextEl).lineHeight = v), 'lh')} testId="line-spacing" />
          {el.type === 'text' && (
            <>
              <div className="label" style={{ margin: '4px 0 6px' }}>Anchor text box</div>
              <div className="ct-row-btns">
                {(['top', 'middle', 'bottom'] as const).map((a) => (
                  <button
                    key={a}
                    className={'ct-opt' + ((el.anchor ?? 'top') === a ? ' active' : '')}
                    title={a[0].toUpperCase() + a.slice(1)}
                    data-testid={`anchor-${a}`}
                    onClick={() =>
                      upd((e) => {
                        const t = e as Draft<TextEl>;
                        t.anchor = a;
                        t.autoHeight = a === 'top';
                      })
                    }
                  >
                    <Icon name={a === 'top' ? 'AlignVerticalJustifyStart' : a === 'middle' ? 'AlignVerticalJustifyCenter' : 'AlignVerticalJustifyEnd'} size={18} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    >
      <Icon name="LetterText" size={18} />
    </PopoverButton>
  );
}

function setFontSize(n: number) {
  upd((e) => {
    if (e.type === 'text' || e.type === 'shape' || e.type === 'table' || e.type === 'sticky') (e as any).fontSize = n;
    if (e.type === 'chart') e.options.fontSize = n;
  }, 'font-size');
}

function TextBar({ els }: { els: TextEl[] }) {
  const el = els[0];
  const fxOn = useRightIs('text-effects');
  const mwOn = useRightIs('magic-write');
  return (
    <>
      <FontButton family={el.fontFamily} />
      <FontSizeBox value={el.fontSize} onChange={setFontSize} />
      <TextColorBtn color={el.color} gradient={el.gradient ? fillCssOf(el.gradient) : undefined} />
      <TextFormatButtons els={els} />
      <SpacingBtn el={el} />
      <Sep />
      <TB label="Effects" title="Effects" testId="tb-effects" active={fxOn} onClick={() => openPanel('text-effects')} />
      {els.length === 1 && <TB icon="Wand2" title="Magic Write" testId="tb-magic-write" active={mwOn} onClick={() => openPanel('magic-write')} />}
      <Tail els={els} />
    </>
  );
}

/* =====================================================================
   Shape
   ===================================================================== */

function BorderPopover({ stroke, testId = 'tb-border', onStyle, onWidth, colorKind = 'stroke', radius, onRadius }: {
  stroke?: Stroke;
  testId?: string;
  onStyle: (s: Stroke['style'] | 'none') => void;
  onWidth: (w: number) => void;
  colorKind?: string;
  radius?: number;
  onRadius?: (r: number) => void;
}) {
  const style = stroke && stroke.width > 0 ? stroke.style : 'none';
  return (
    <PopoverButton
      title="Border style"
      testId={testId}
      width={280}
      content={(close) => (
        <div>
          <PopTitle>Border style</PopTitle>
          <div className="ct-row-btns" style={{ marginBottom: 12 }}>
            {(['none', 'solid', 'dashed', 'dotted'] as const).map((st) => (
              <button key={st} className={'ct-opt' + (style === st ? ' active' : '')} title={st} data-testid={`border-${st}`} onClick={() => onStyle(st)} style={{ width: 52 }}>
                {st === 'none' ? (
                  <Icon name="Ban" size={18} />
                ) : (
                  <svg width="30" height="6">
                    <line x1="1" y1="3" x2="29" y2="3" stroke="currentColor" strokeWidth="2.5" strokeDasharray={st === 'dashed' ? '6 4' : st === 'dotted' ? '1 4' : undefined} strokeLinecap="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <TSlider label="Border weight" value={stroke?.width ?? 0} min={0} max={100} onChange={onWidth} testId="border-weight" />
          {onRadius && <TSlider label="Corner rounding" value={radius ?? 0} min={0} max={200} onChange={onRadius} testId="corner-rounding" />}
          <button
            className="btn sm block"
            onClick={() => {
              close();
              openColor({ kind: colorKind });
            }}
            data-testid="border-color"
          >
            <span className="tb-swatch round" style={{ width: 16, height: 16, background: stroke?.color ?? '#000' }} /> Border color
          </button>
        </div>
      )}
    >
      <Icon name="SquareDashed" size={18} />
    </PopoverButton>
  );
}

const strokeStyle = (key: 'stroke' | 'border') => (st: Stroke['style'] | 'none') =>
  upd((e) => {
    const cur = (e as any)[key] as Stroke | undefined;
    if (st === 'none') (e as any)[key] = undefined;
    else (e as any)[key] = { color: cur?.color ?? '#000000', width: cur?.width || 4, style: st };
  });
const strokeWidth = (key: 'stroke' | 'border') => (w: number) =>
  upd((e) => {
    const cur = (e as any)[key] as Stroke | undefined;
    (e as any)[key] = { color: cur?.color ?? '#000000', style: cur?.style ?? 'solid', width: w };
  }, key + '-w');

const ROUNDABLE = ['rect', 'rounded', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'speech'];

function ShapeBar({ els }: { els: ShapeEl[] }) {
  const el = els[0];
  const fillOn = useRightIs('color', 'fill');
  const hasText = !!el.html && el.html.replace(/<[^>]+>|&nbsp;|\s/g, '') !== '';
  const editing = useEditor((s) => s.editingId === el.id);
  return (
    <>
      <TB title="Color" testId="tb-fill" active={fillOn} onClick={() => openColor({ kind: 'fill' })}>
        <FillSwatch fill={el.fill} size={24} />
      </TB>
      <BorderPopover
        stroke={el.stroke}
        onStyle={strokeStyle('stroke')}
        onWidth={strokeWidth('stroke')}
        radius={ROUNDABLE.includes(el.shape) ? el.radius ?? 0 : undefined}
        onRadius={ROUNDABLE.includes(el.shape) ? (r) => upd((e) => void ((e as ShapeEl).radius = r), 'radius') : undefined}
      />
      {(hasText || editing) && (
        <>
          <Sep />
          <FontButton family={el.fontFamily ?? 'Inter'} />
          <FontSizeBox value={el.fontSize ?? 24} onChange={setFontSize} />
          <TextColorBtn color={el.color ?? '#fff'} />
          <TextFormatButtons els={els} lists={false} />
          <SpacingBtn el={el} />
        </>
      )}
      {!hasText && !editing && (
        <span className="tb-locked-msg" style={{ fontSize: 12 }} title="Double-click the shape to add text">
          <Icon name="Type" size={14} /> Double-click to add text
        </span>
      )}
      <TB icon="FlipHorizontal2" title="Flip horizontal" testId="tb-flip" onClick={() => S().flip('x')} />
      <Tail els={els} />
    </>
  );
}

/* =====================================================================
   SVG graphic
   ===================================================================== */

function FlipMenu() {
  return (
    <MenuButton
      className="tb-btn"
      title="Flip"
      testId="tb-flip"
      items={[
        { label: 'Flip horizontal', icon: 'FlipHorizontal2', onClick: () => S().flip('x'), testId: 'flip-h' },
        { label: 'Flip vertical', icon: 'FlipVertical2', onClick: () => S().flip('y'), testId: 'flip-v' },
      ]}
    >
      <span className="tb-label">Flip</span>
    </MenuButton>
  );
}

function SvgBar({ el }: { el: SvgEl }) {
  const colors = svgColors(el.svg).filter((c) => c.toLowerCase() !== 'currentcolor');
  const right = useEditor((s) => (s.right === 'color' && s.colorTarget?.kind === 'svg' ? s.colorTarget.key : null));
  return (
    <>
      {colors.slice(0, 10).map((c, i) => (
        <TB key={c} title="Color" testId={`tb-svg-color-${i}`} active={right === c} onClick={() => openColor({ kind: 'svg', key: c })}>
          <span className="tb-swatch" style={{ background: el.colorMap?.[c] ?? c }} />
        </TB>
      ))}
      {colors.length > 0 && <Sep />}
      <FlipMenu />
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Line
   ===================================================================== */

const CAPS: LineCap[] = ['none', 'arrow', 'triangle', 'circle', 'circle-outline', 'square', 'diamond', 'bar'];

export function CapIcon({ cap, end }: { cap: LineCap; end?: boolean }) {
  const y = 12;
  const x = 8;
  let m: ReactNode = null;
  switch (cap) {
    case 'arrow':
      m = <polyline points={`${x + 8},${y - 7} ${x},${y} ${x + 8},${y + 7}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
      break;
    case 'triangle':
      m = <polygon points={`${x + 10},${y - 7} ${x},${y} ${x + 10},${y + 7}`} fill="currentColor" />;
      break;
    case 'circle':
      m = <circle cx={x + 4} cy={y} r={5} fill="currentColor" />;
      break;
    case 'circle-outline':
      m = <circle cx={x + 4} cy={y} r={5} fill="var(--surface)" stroke="currentColor" strokeWidth="2" />;
      break;
    case 'square':
      m = <rect x={x - 1} y={y - 5} width={10} height={10} fill="currentColor" />;
      break;
    case 'diamond':
      m = <polygon points={`${x - 1},${y} ${x + 5},${y - 6} ${x + 11},${y} ${x + 5},${y + 6}`} fill="currentColor" />;
      break;
    case 'bar':
      m = <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke="currentColor" strokeWidth="2.5" />;
      break;
  }
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" style={{ transform: end ? 'scaleX(-1)' : undefined }}>
      <line x1={cap === 'none' ? 4 : x + 2} y1={y} x2={40} y2={y} stroke="currentColor" strokeWidth="2" />
      {m}
    </svg>
  );
}

function CapPicker({ value, end }: { value: LineCap; end?: boolean }) {
  return (
    <PopoverButton
      title={end ? 'Line end' : 'Line start'}
      testId={end ? 'tb-end-cap' : 'tb-start-cap'}
      width={232}
      content={(close) => (
        <div>
          <PopTitle>{end ? 'Line end' : 'Line start'}</PopTitle>
          <div className="ct-caps">
            {CAPS.map((c) => (
              <button
                key={c}
                className={'ct-opt' + (value === c ? ' active' : '')}
                title={c}
                data-testid={`cap-${c}`}
                onClick={() => {
                  upd((e) => void ((e as LineEl)[end ? 'endCap' : 'startCap'] = c));
                  close();
                }}
              >
                <CapIcon cap={c} end={end} />
              </button>
            ))}
          </div>
        </div>
      )}
    >
      <CapIcon cap={value} end={end} />
    </PopoverButton>
  );
}

function LineBar({ els }: { els: LineEl[] }) {
  const el = els[0];
  const on = useRightIs('color', 'line');
  return (
    <>
      <TB title="Line color" testId="tb-line-color" active={on} onClick={() => openColor({ kind: 'line' })}>
        <span className="tb-swatch round" style={{ background: el.color }} />
      </TB>
      <PopoverButton
        title="Line style"
        testId="tb-line-style"
        width={280}
        content={() => (
          <div>
            <PopTitle>Line style</PopTitle>
            <div className="ct-row-btns" style={{ marginBottom: 12 }}>
              {(['solid', 'dashed', 'dotted'] as const).map((st) => (
                <button key={st} className={'ct-opt' + (el.style === st ? ' active' : '')} data-testid={`line-${st}`} onClick={() => upd((e) => void ((e as LineEl).style = st))} style={{ width: 66 }}>
                  <svg width="44" height="6">
                    <line x1="2" y1="3" x2="42" y2="3" stroke="currentColor" strokeWidth="2.5" strokeDasharray={st === 'dashed' ? '7 4' : st === 'dotted' ? '1 4' : undefined} strokeLinecap="round" />
                  </svg>
                </button>
              ))}
            </div>
            <TSlider label="Line weight" value={el.width} min={1} max={60} onChange={(v) => upd((e) => void ((e as LineEl).width = v), 'line-w')} testId="line-weight" />
            <Toggle label="Rounded end points" on={!!el.rounded} onChange={(v) => upd((e) => void ((e as LineEl).rounded = v))} testId="line-rounded" />
          </div>
        )}
      >
        <svg width="22" height="18" viewBox="0 0 22 18">
          <line x1="2" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
          <line x1="2" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
          <line x1="2" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" />
        </svg>
      </PopoverButton>
      <CapPicker value={el.startCap} />
      <CapPicker value={el.endCap} end />
      <MenuButton
        className="tb-btn"
        title="Line type"
        testId="tb-line-type"
        items={(['straight', 'elbow', 'curve'] as const).map((t) => ({
          label: t === 'straight' ? 'Straight' : t === 'elbow' ? 'Elbowed' : 'Curved',
          icon: t === 'straight' ? 'Slash' : t === 'elbow' ? 'CornerDownRight' : 'Spline',
          checked: el.lineType === t,
          onClick: () => upd((e) => void ((e as LineEl).lineType = t)),
          testId: `line-type-${t}`,
        }))}
      >
        <Icon name={el.lineType === 'elbow' ? 'CornerDownRight' : el.lineType === 'curve' ? 'Spline' : 'Slash'} size={18} />
      </MenuButton>
      <Tail els={els} />
    </>
  );
}

/* =====================================================================
   Image
   ===================================================================== */

function ImageBar({ el }: { el: ImageEl }) {
  const editOn = useRightIs('edit-image');
  return (
    <>
      <TB label="Edit" icon="SlidersHorizontal" title="Edit image" testId="tb-edit-image" active={editOn} onClick={() => openPanel('edit-image')} />
      <TB
        label={el.bgRemoved ? 'Restore BG' : 'BG Remover'}
        icon="Eraser"
        title={el.bgRemoved ? 'Restore the original background' : 'Remove background'}
        testId="tb-bg-remove"
        active={!!el.bgRemoved}
        onClick={() => removeBackground(el.id)}
      />
      <Sep />
      <TB label="Crop" icon="Crop" title="Crop" testId="tb-crop" onClick={() => useEditor.setState({ cropId: el.id })} />
      <FlipMenu />
      <BorderPopover stroke={el.border} onStyle={strokeStyle('border')} onWidth={strokeWidth('border')} colorKind="border" />
      <PopoverButton
        title="Corner rounding"
        testId="tb-rounding"
        width={260}
        content={() => (
          <div>
            <PopTitle>Corner rounding</PopTitle>
            <TSlider value={el.radius ?? 0} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} onChange={(v) => upd((e) => void ((e as ImageEl).radius = v), 'radius')} testId="rounding-slider" />
          </div>
        )}
      >
        <Icon name="SquareRoundCorner" size={18} />
      </PopoverButton>
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Crop mode
   ===================================================================== */

function CropBar({ id }: { id: string }) {
  const el = useEditor((s) => (s.design ? findEl(s.design, id)?.el ?? null : null));
  if (!el) return null;
  const done = () => useEditor.setState({ cropId: null });
  const isMedia = el.type === 'image' || el.type === 'video';
  const zoom = isMedia ? currentZoom(el as ImageEl) : el.type === 'frame' ? el.media.scale : el.type === 'grid' ? el.cells[0]?.scale ?? 1 : 1;
  const setZoom = (z: number) =>
    S().updateEl(
      id,
      (e) => {
        if (e.type === 'image' || e.type === 'video') applyZoom(e, z);
        else if (e.type === 'frame') e.media.scale = z;
        else if (e.type === 'grid') e.cells.forEach((c) => (c.scale = z));
      },
      { coalesce: 'crop-zoom' },
    );
  const reset = () =>
    S().updateEl(id, (e) => {
      if (e.type === 'image' || e.type === 'video') applyAspect(e, null);
      else if (e.type === 'frame') Object.assign(e.media, { scale: 1, offsetX: 0, offsetY: 0 });
      else if (e.type === 'grid') e.cells.forEach((c) => Object.assign(c, { scale: 1, offsetX: 0, offsetY: 0 }));
    });
  return (
    <>
      <span className="tb-crop-badge">
        <Icon name="Crop" size={15} /> Crop
      </span>
      {isMedia && (
        <MenuButton
          className="tb-btn"
          title="Aspect ratio"
          testId="tb-crop-aspect"
          items={[
            { label: 'Freeform', icon: 'Scan', onClick: () => {} },
            ...ASPECTS.map((a) => ({ label: a.label, onClick: () => S().updateEl(id, (e) => applyAspect(e, a.value)), testId: `aspect-${a.label.split(' ')[0].replace(':', 'x')}` })),
          ]}
        >
          <Icon name="RectangleHorizontal" size={18} />
          <span className="tb-label">Ratio</span>
          <Icon name="ChevronDown" size={14} className="tb-caret" />
        </MenuButton>
      )}
      <Sep />
      <span className="tb-locked-msg" style={{ minWidth: 200 }}>
        <Icon name="ZoomOut" size={15} />
        <input
          type="range"
          min={100}
          max={400}
          value={Math.round(zoom * 100)}
          data-testid="tb-crop-zoom"
          onPointerDown={() => S().begin()}
          onPointerUp={() => S().commit()}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          style={{ width: 130 }}
        />
        <Icon name="ZoomIn" size={15} />
      </span>
      {isMedia && (
        <TB
          icon="RotateCw"
          title="Rotate 90°"
          testId="tb-crop-rotate"
          onClick={() => S().updateEl(id, (e) => void (e.rotation = ((e.rotation ?? 0) + 90) % 360))}
        />
      )}
      <Sep />
      <TB label="Reset" title="Reset crop" testId="tb-crop-reset" onClick={reset} />
      <button className="btn primary sm" style={{ marginLeft: 4 }} onClick={done} data-testid="tb-crop-done">
        Done
      </button>
    </>
  );
}

/* =====================================================================
   Video
   ===================================================================== */

function VideoBar({ el }: { el: VideoEl }) {
  const on = useRightIs('video');
  return (
    <>
      <TB label="Edit video" icon="Clapperboard" title="Edit video" testId="tb-edit-video" active={on} onClick={() => openPanel('video')} />
      <TB label="Crop" icon="Crop" title="Crop" testId="tb-crop" onClick={() => useEditor.setState({ cropId: el.id })} />
      <FlipMenu />
      <Sep />
      <PopoverButton
        title="Volume (M to mute)"
        testId="tb-volume"
        width={260}
        content={() => (
          <div>
            <PopTitle>Volume</PopTitle>
            <TSlider value={Math.round(el.volume * 100)} min={0} max={100} onChange={(v) => upd((e) => void ((e as VideoEl).volume = v / 100), 'vol')} testId="volume-slider" />
            <button className="btn sm block" onClick={() => upd((e) => void ((e as VideoEl).volume = el.volume ? 0 : 1))}>
              <Icon name={el.volume ? 'VolumeX' : 'Volume2'} size={16} /> {el.volume ? 'Mute' : 'Unmute'}
            </button>
          </div>
        )}
      >
        <Icon name={el.volume === 0 ? 'VolumeX' : el.volume < 0.5 ? 'Volume1' : 'Volume2'} size={18} />
      </PopoverButton>
      <PopoverButton
        title="Playback"
        testId="tb-playback"
        width={280}
        content={() => (
          <div>
            <PopTitle>Playback</PopTitle>
            <Toggle label="Autoplay" on={el.autoplay} onChange={(v) => upd((e) => void ((e as VideoEl).autoplay = v))} testId="video-autoplay" />
            <Toggle label="Loop video" on={el.loop} onChange={(v) => upd((e) => void ((e as VideoEl).loop = v))} testId="video-loop" />
            <div className="label" style={{ margin: '8px 0 6px' }}>Speed</div>
            <Segmented
              value={String(el.speed)}
              options={['0.25', '0.5', '1', '1.5', '2'].map((v) => ({ value: v, label: v + '×' }))}
              onChange={(v) => upd((e) => void ((e as VideoEl).speed = Number(v)))}
            />
          </div>
        )}
      >
        <Icon name="CirclePlay" size={18} />
        <span className="tb-label">Playback</span>
      </PopoverButton>
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Chart
   ===================================================================== */

export const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'bar', label: 'Bar', icon: 'ChartBarBig' },
  { id: 'column', label: 'Column', icon: 'ChartColumnBig' },
  { id: 'stacked-column', label: 'Stacked column', icon: 'ChartColumnStacked' },
  { id: 'line', label: 'Line', icon: 'ChartLine' },
  { id: 'area', label: 'Area', icon: 'ChartArea' },
  { id: 'pie', label: 'Pie', icon: 'ChartPie' },
  { id: 'donut', label: 'Donut', icon: 'Donut' },
  { id: 'scatter', label: 'Scatter', icon: 'ChartScatter' },
  { id: 'radar', label: 'Radar', icon: 'Radar' },
  { id: 'progress-bar', label: 'Progress bar', icon: 'RectangleEllipsis' },
  { id: 'progress-ring', label: 'Progress ring', icon: 'LoaderCircle' },
  { id: 'number', label: 'Number', icon: 'Hash' },
  { id: 'funnel', label: 'Funnel', icon: 'Filter' },
  { id: 'pictogram', label: 'Pictogram', icon: 'Users' },
];

function ChartBar({ el }: { el: ChartEl }) {
  const on = useRightIs('chart-data');
  const right = useEditor((s) => (s.right === 'color' && s.colorTarget?.kind === 'chart-series' ? s.colorTarget.key : null));
  const cur = CHART_TYPES.find((c) => c.id === el.chartType);
  return (
    <>
      <TB label="Edit" icon="Table" title="Edit chart data" testId="tb-chart-edit" active={on} onClick={() => openPanel('chart-data')} />
      <MenuButton
        className="tb-btn"
        title="Chart type"
        testId="tb-chart-type"
        items={CHART_TYPES.map((c) => ({ label: c.label, icon: c.icon, checked: c.id === el.chartType, onClick: () => upd((e) => void ((e as ChartEl).chartType = c.id)), testId: `chart-type-${c.id}` }))}
      >
        <Icon name={cur?.icon ?? 'ChartColumnBig'} size={18} />
        <Icon name="ChevronDown" size={14} className="tb-caret" />
      </MenuButton>
      <Sep />
      {el.series.slice(0, 6).map((s, i) => (
        <TB key={i} title={`${s.name} color`} testId={`tb-series-color-${i}`} active={right === String(i)} onClick={() => openColor({ kind: 'chart-series', key: String(i) })}>
          <span className="tb-swatch round" style={{ background: s.color }} />
        </TB>
      ))}
      <Sep />
      <FontButton family={el.options.fontFamily} />
      <FontSizeBox value={el.options.fontSize} onChange={setFontSize} />
      <TextColorBtn color={el.options.textColor} />
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Table
   ===================================================================== */

function TableBar({ el }: { el: TableEl }) {
  const on = useRightIs('table');
  const cell = useTbLocal((s) => s.tableCell);
  const key = cell ? `${cell.r},${cell.c}` : 'all';
  const cellOn = useRightIs('color', 'table-cell');
  const fill = cell ? el.cells[cell.r]?.[cell.c]?.fill : undefined;
  return (
    <>
      <TB label="Edit table" icon="Table2" title="Edit table" testId="tb-table-edit" active={on} onClick={() => openPanel('table')} />
      <TB title={cell ? 'Cell color' : 'Cell color (all cells)'} testId="tb-cell-color" active={cellOn} onClick={() => openColor({ kind: 'table-cell', key })}>
        <span className="tb-swatch checker" style={{ position: 'relative', overflow: 'hidden' }}>
          <span style={{ position: 'absolute', inset: 0, background: fill ?? 'transparent' }} />
        </span>
      </TB>
      <BorderPopover
        testId="tb-table-border"
        stroke={{ color: el.borderColor, width: el.borderStyle === 'none' ? 0 : el.borderWidth, style: el.borderStyle === 'none' ? 'solid' : el.borderStyle }}
        onStyle={(st) => upd((e) => void ((e as TableEl).borderStyle = st))}
        onWidth={(w) => upd((e) => void ((e as TableEl).borderWidth = w), 'tbw')}
        colorKind="border"
      />
      <PopoverButton
        title="Cell spacing"
        testId="tb-table-spacing"
        width={260}
        content={() => (
          <div>
            <PopTitle>Cell spacing</PopTitle>
            <TSlider value={el.cellPadding} min={0} max={60} onChange={(v) => upd((e) => void ((e as TableEl).cellPadding = v), 'pad')} testId="cell-padding" />
          </div>
        )}
      >
        <Icon name="Scan" size={18} />
      </PopoverButton>
      <Sep />
      <FontButton family={el.fontFamily} />
      <FontSizeBox value={el.fontSize} onChange={setFontSize} />
      <TextColorBtn color={el.color} />
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Frame / Grid
   ===================================================================== */

function detachMedia(id: string) {
  S().updateEl(id, (e) => {
    if (e.type === 'frame') e.media = { scale: 1, offsetX: 0, offsetY: 0, fill: e.media.fill ?? '#d9d9d9' };
    if (e.type === 'grid') e.cells = e.cells.map((c) => ({ scale: 1, offsetX: 0, offsetY: 0, fill: c.fill ?? '#d9d9d9' }));
  });
}

function FrameBar({ el }: { el: FrameEl | GridEl }) {
  const hasMedia = el.type === 'frame' ? !!el.media.src : el.cells.some((c) => c.src);
  const fillOn = useRightIs('color', 'fill');
  const fill = el.type === 'frame' ? el.media.fill : el.cells[0]?.fill;
  return (
    <>
      <TB title="Color (empty areas)" testId="tb-fill" active={fillOn} onClick={() => openColor({ kind: 'fill' })}>
        <span className="tb-swatch" style={{ background: fill ?? '#d9d9d9' }} />
      </TB>
      <TB label="Replace" icon="Replace" title="Replace media" testId="tb-replace" onClick={() => replaceFromFile(el.id)} />
      {hasMedia && (
        <>
          <TB label="Crop" icon="Crop" title="Crop / reposition (double-click)" testId="tb-crop" onClick={() => useEditor.setState({ cropId: el.id })} />
          <TB icon="ImageOff" title="Detach image" testId="tb-detach" onClick={() => detachMedia(el.id)} />
        </>
      )}
      {el.type === 'grid' && (
        <PopoverButton
          title="Spacing"
          testId="tb-grid-spacing"
          width={260}
          content={() => (
            <div>
              <PopTitle>Grid spacing</PopTitle>
              <TSlider label="Spacing" value={el.gap} min={0} max={100} onChange={(v) => upd((e) => void ((e as GridEl).gap = v), 'gap')} testId="grid-gap" />
              <TSlider label="Corner rounding" value={el.radius} min={0} max={100} onChange={(v) => upd((e) => void ((e as GridEl).radius = v), 'gradius')} testId="grid-radius" />
            </div>
          )}
        >
          <Icon name="LayoutGrid" size={18} />
          <span className="tb-label">Spacing</span>
        </PopoverButton>
      )}
      {el.type === 'frame' && (
        <BorderPopover stroke={el.border} onStyle={strokeStyle('border')} onWidth={strokeWidth('border')} colorKind="border" />
      )}
      <FlipMenu />
      <Tail els={[el]} />
    </>
  );
}

/* =====================================================================
   Sticky / Draw / Embed
   ===================================================================== */

const REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '🔥'];

function StickyBar({ el }: { el: StickyEl }) {
  return (
    <>
      {STICKY_COLORS.map((c) => (
        <TB key={c} title="Note color" testId={`tb-sticky-${c.slice(1)}`} active={el.color === c} onClick={() => upd((e) => void ((e as StickyEl).color = c))}>
          <span className="tb-swatch round" style={{ background: c, width: 20, height: 20 }} />
        </TB>
      ))}
      <Sep />
      <FontSizeBox value={el.fontSize} onChange={setFontSize} />
      <PopoverButton
        title="Reactions"
        testId="tb-reactions"
        width={240}
        content={() => (
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            {REACTIONS.map((r) => (
              <button
                key={r}
                className="btn sm"
                data-testid={`react-${r}`}
                onClick={() => upd((e) => void ((e as StickyEl).reactions = { ...((e as StickyEl).reactions ?? {}), [r]: (((e as StickyEl).reactions ?? {})[r] ?? 0) + 1 }))}
              >
                {r} {el.reactions?.[r] ?? ''}
              </button>
            ))}
          </div>
        )}
      >
        <Icon name="SmilePlus" size={18} />
      </PopoverButton>
      <Tail els={[el]} />
    </>
  );
}

function DrawBar({ el }: { el: DrawEl }) {
  const on = useRightIs('color', 'stroke');
  const w = el.paths[0]?.width ?? 4;
  return (
    <>
      <TB title="Color" testId="tb-draw-color" active={on} onClick={() => openColor({ kind: 'stroke' })}>
        <span className="tb-swatch round" style={{ background: el.paths[0]?.color ?? '#000' }} />
      </TB>
      <PopoverButton
        title="Stroke weight"
        testId="tb-draw-width"
        width={260}
        content={() => (
          <div>
            <PopTitle>Weight</PopTitle>
            <TSlider value={w} min={1} max={80} onChange={(v) => upd((e) => void (e as DrawEl).paths.forEach((p) => (p.width = v)), 'draw-w')} testId="draw-width" />
            <TSlider
              label="Transparency"
              value={Math.round((1 - (el.paths[0]?.opacity ?? 1)) * 100)}
              min={0}
              max={100}
              onChange={(v) => upd((e) => void (e as DrawEl).paths.forEach((p) => (p.opacity = 1 - v / 100)), 'draw-o')}
            />
          </div>
        )}
      >
        <Icon name="PenLine" size={18} />
      </PopoverButton>
      <FlipMenu />
      <Tail els={[el]} />
    </>
  );
}

function EmbedBar({ el }: { el: EmbedEl }) {
  return (
    <>
      <PopoverButton
        title="Edit embed"
        testId="tb-embed-edit"
        width={340}
        content={(close) => <EmbedEditor el={el} close={close} />}
      >
        <Icon name="Code" size={18} />
        <span className="tb-label">Edit</span>
      </PopoverButton>
      <Tail els={[el]} />
    </>
  );
}

function EmbedEditor({ el, close }: { el: EmbedEl; close: () => void }) {
  const [url, setUrl] = useState(el.url ?? '');
  const [html, setHtml] = useState(el.html ?? '');
  const [title, setTitle] = useState(el.title ?? '');
  return (
    <div>
      <PopTitle>Embed</PopTitle>
      <div className="field">
        <label>Title</label>
        <input className="input sm" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      </div>
      <div className="field">
        <label>URL</label>
        <input className="input sm" value={url} placeholder="https://www.youtube.com/embed/…" onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.stopPropagation()} data-testid="embed-url" />
      </div>
      <div className="field">
        <label>HTML (runs in a sandbox)</label>
        <textarea className="textarea" rows={5} value={html} onChange={(e) => setHtml(e.target.value)} onKeyDown={(e) => e.stopPropagation()} style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
      <button
        className="btn primary sm block"
        data-testid="embed-save"
        onClick={() => {
          upd((e) => {
            const m = e as Draft<EmbedEl>;
            m.url = url || undefined;
            m.html = html || undefined;
            m.title = title || undefined;
          });
          close();
        }}
      >
        Save
      </button>
    </div>
  );
}

