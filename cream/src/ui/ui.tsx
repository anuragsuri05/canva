import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as Lucide from 'lucide-react';
import { X } from 'lucide-react';

/* ---------- Icon by name (lucide) ---------- */
export function Icon({ name, size = 18, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const C = ((Lucide as any)[name] ?? (Lucide as any).Square) as React.ComponentType<any>;
  return <C size={size} className={className} style={style} strokeWidth={1.8} />;
}

/* ---------- Outside click ---------- */
export function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active = true, ignore?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const h = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (ignore?.current?.contains(t)) return;
      onOut();
    };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onOut();
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', h, true);
      document.addEventListener('keydown', k);
    });
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', h, true);
      document.removeEventListener('keydown', k);
    };
  }, [active, onOut]);
}

/* ---------- Positioned floating layer ---------- */
export type Anchor = HTMLElement | DOMRect | { x: number; y: number } | null;

function anchorRect(a: Anchor): DOMRect {
  if (!a) return new DOMRect(0, 0, 0, 0);
  if (a instanceof HTMLElement) return a.getBoundingClientRect();
  if (a instanceof DOMRect) return a;
  return new DOMRect(a.x, a.y, 0, 0);
}

export function Floating({
  anchor,
  onClose,
  children,
  className = 'popover',
  placement = 'bottom-start',
  style,
  width,
  ignoreRef,
}: {
  anchor: Anchor;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  placement?: 'bottom-start' | 'bottom-end' | 'bottom' | 'right-start' | 'top-start' | 'left-start';
  style?: CSSProperties;
  width?: number;
  ignoreRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  useOutside(ref, onClose, true, ignoreRef);
  useLayoutEffect(() => {
    const r = anchorRect(anchor);
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = r.left;
    let top = r.bottom + 6;
    if (placement === 'bottom-end') left = r.right - w;
    if (placement === 'bottom') left = r.left + r.width / 2 - w / 2;
    if (placement === 'right-start') {
      left = r.right + 6;
      top = r.top;
    }
    if (placement === 'left-start') {
      left = r.left - w - 6;
      top = r.top;
    }
    if (placement === 'top-start') top = r.top - h - 6;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    if (top + h > window.innerHeight - 8) top = Math.max(8, (placement.startsWith('bottom') ? r.top - h - 6 : window.innerHeight - h - 8));
    setPos({ left, top });
  }, [anchor]);
  return createPortal(
    <div ref={ref} className={className} style={{ ...pos, width, ...style }} onPointerDown={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  );
}

/* ---------- Menu ---------- */
export interface MenuItem {
  label?: string;
  icon?: string;
  kbd?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  sep?: boolean;
  title?: string; // section heading
  submenu?: MenuItem[];
  checked?: boolean;
  testId?: string;
}

export function Menu({ anchor, items, onClose, placement, width }: { anchor: Anchor; items: MenuItem[]; onClose: () => void; placement?: any; width?: number }) {
  const [sub, setSub] = useState<{ i: number; el: HTMLElement } | null>(null);
  const subRef = useRef<HTMLDivElement>(null);
  return (
    <Floating anchor={anchor} onClose={onClose} className="menu" placement={placement} width={width} ignoreRef={subRef}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="menu-sep" />
        ) : it.title ? (
          <div key={i} className="menu-title">
            {it.title}
          </div>
        ) : (
          <button
            key={i}
            className={'menu-item' + (it.danger ? ' danger' : '') + (sub?.i === i ? ' focus' : '')}
            disabled={it.disabled}
            data-testid={it.testId}
            onMouseEnter={(e) => setSub(it.submenu ? { i, el: e.currentTarget } : null)}
            onClick={(e) => {
              if (it.submenu) {
                setSub({ i, el: e.currentTarget });
                return;
              }
              it.onClick?.();
              onClose();
            }}
          >
            {it.icon ? <Icon name={it.icon} size={16} /> : it.checked !== undefined ? <span style={{ width: 16 }}>{it.checked ? '✓' : ''}</span> : null}
            <span className="grow">{it.label}</span>
            {it.kbd && <span className="kbd">{it.kbd}</span>}
            {it.submenu && <Icon name="ChevronRight" size={14} />}
          </button>
        ),
      )}
      {sub && items[sub.i]?.submenu && (
        <div ref={subRef}>
          <Menu anchor={sub.el} items={items[sub.i].submenu!} onClose={onClose} placement="right-start" />
        </div>
      )}
    </Floating>
  );
}

/** Button that toggles a menu. */
export function MenuButton({ items, children, className = 'btn', title, placement, testId }: { items: MenuItem[] | (() => MenuItem[]); children: ReactNode; className?: string; title?: string; placement?: any; testId?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ref} className={className} title={title} data-testid={testId} onClick={() => setOpen((o) => !o)}>
        {children}
      </button>
      {open && <Menu anchor={ref.current} items={typeof items === 'function' ? items() : items} onClose={() => setOpen(false)} placement={placement} />}
    </>
  );
}

/** Button that toggles an arbitrary popover. */
export function PopoverButton({
  content,
  children,
  className = 'tb-btn',
  title,
  width = 280,
  placement,
  testId,
}: {
  content: (close: () => void) => ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
  width?: number;
  placement?: any;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ref} className={className + (open ? ' active' : '')} title={title} data-testid={testId} onClick={() => setOpen((o) => !o)}>
        {children}
      </button>
      {open && (
        <Floating anchor={ref.current} onClose={() => setOpen(false)} width={width} placement={placement} ignoreRef={ref}>
          {content(() => setOpen(false))}
        </Floating>
      )}
    </>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  title,
  onClose,
  children,
  footer,
  size,
  testId,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'wide' | 'full';
  testId?: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal ' + (size ?? '')} role="dialog" data-testid={testId}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Slider with number box ---------- */
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onCommit,
  suffix,
  testId,
}: {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  suffix?: string;
  testId?: string;
}) {
  const [txt, setTxt] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setTxt(String(Math.round(value * 100) / 100)), [value]);
  return (
    <div className="slider-row">
      {label && (
        <div className="slider-label">
          <span>{label}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
      />
      <input
        className="input"
        value={txt + (suffix && document.activeElement !== null ? '' : '')}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const n = Number(txt);
          if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
          onCommit?.();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </div>
  );
}

export function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label?: string; testId?: string }) {
  return (
    <label className="row" style={{ justifyContent: 'space-between', cursor: 'pointer', margin: '6px 0' }}>
      {label && <span>{label}</span>}
      <button type="button" className={'toggle' + (on ? ' on' : '')} onClick={() => onChange(!on)} data-testid={testId} aria-pressed={on} />
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

/** Infinite-scroll sentinel: calls onVisible when scrolled into view. */
export function LoadMore({ onVisible, loading }: { onVisible: () => void; loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && onVisible(), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible]);
  return <div ref={ref}>{loading ? <Spinner /> : <div style={{ height: 1 }} />}</div>;
}

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export const fmtDate = (t: number) => {
  const d = Date.now() - t;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d / 60000)} min ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} hours ago`;
  if (d < 86400000 * 7) return `${Math.floor(d / 86400000)} days ago`;
  return new Date(t).toLocaleDateString();
};

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? '⌘' : 'Ctrl';
export const ALT = isMac ? '⌥' : 'Alt';
