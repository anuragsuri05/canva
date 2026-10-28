// Shared building blocks for the asset panels.
import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import './panels.css';
import type { El, ShapeKind } from '../model/types';
import { newPage } from '../model/defaults';
import { PageView } from '../render/PageView';
import { shapePath } from '../render/shapes';
import { Icon, LoadMore, Spinner } from '../ui/ui';
import type { Paged } from '../assets/usePaged';
import { fmtDuration, type AudioItem, type PhotoItem } from '../assets/openverse';
import type { VideoItem } from '../assets/wikimedia';
import { iconLabel, prefetchIcon, type IconItem } from '../assets/iconify';
import { audioDrag, iconDrag, insertAudioItem, insertIcon, insertPhoto, insertVideoItem, photoDrag, videoDrag } from './insert';

/* ---------- Search ---------- */
export function PanelSearch({
  value,
  onChange,
  placeholder,
  testId,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="search" role="search">
      <Icon name="Search" size={16} style={{ color: 'var(--text-3)' }} />
      <input
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onChange('');
          }
        }}
      />
      {value && (
        <button className="icon-btn" style={{ width: 24, height: 24 }} aria-label="Clear search" onClick={() => (onChange(''), ref.current?.focus())}>
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}

export function SectionHead({ title, onSeeAll, testId }: { title: ReactNode; onSeeAll?: () => void; testId?: string }) {
  return (
    <div className="section-head">
      <h3>{title}</h3>
      {onSeeAll && (
        <button onClick={onSeeAll} data-testid={testId}>
          See all
        </button>
      )}
    </div>
  );
}

export function BackBar({ title, onBack }: { title: ReactNode; onBack: () => void }) {
  return (
    <div className="pn-back">
      <button className="icon-btn" onClick={onBack} aria-label="Back" data-testid="panel-back">
        <Icon name="ChevronLeft" size={18} />
      </button>
      <h3>{title}</h3>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="pn-error" role="alert">
      <div className="ic">
        <Icon name="WifiOff" size={20} />
      </div>
      <div>{message}</div>
      {onRetry && (
        <button className="btn sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ children, icon = 'SearchX' }: { children: ReactNode; icon?: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} style={{ color: 'var(--text-3)', marginBottom: 8 }} />
      <div>{children}</div>
    </div>
  );
}

/** Footer for a paged list: infinite-scroll sentinel, error with retry, or "end". */
export function PagedFooter<T>({ p, emptyText }: { p: Paged<T>; emptyText?: ReactNode }) {
  if (p.error) return <ErrorBox message={p.error} onRetry={p.retry} />;
  if (!p.loading && !p.items.length) return <EmptyBox>{emptyText ?? 'No results found. Try another search.'}</EmptyBox>;
  if (p.hasMore) return <LoadMore onVisible={p.loadMore} loading={p.loading} />;
  if (p.loading) return <Spinner />;
  return p.items.length > 12 ? <div className="pn-end">You've reached the end</div> : null;
}

/* ---------- Static element previews (rendered with the real renderer) ---------- */
export const ElPreview = memo(function ElPreview({ els, w, h, size, bg }: { els: El[]; w: number; h: number; size: number; bg?: string }) {
  const page = useMemo(() => newPage({ elements: els, background: { kind: 'solid', color: bg ?? 'transparent' } }), [els, bg]);
  const scale = size / Math.max(w, h);
  return (
    <div style={{ pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
      <PageView design={{ width: w, height: h }} page={page} scale={scale} ctx={{ mode: 'static', pageIndex: 0, pageCount: 1 }} />
    </div>
  );
});

export function ShapeSvg({ kind, size = 46, fill = '#c4c4c4', style }: { kind: ShapeKind | string; size?: number; fill?: string; style?: React.CSSProperties }) {
  const w = 100;
  const h = kind === 'cylinder' ? 110 : 100;
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${w + 4} ${h + 4}`} style={{ overflow: 'visible', ...style }} aria-hidden>
      <path d={shapePath(kind, w, h)} fill={fill} fillRule="evenodd" />
    </svg>
  );
}

/* ---------- Photos ---------- */
export function PhotoTile({ p, height, onPick }: { p: PhotoItem; height?: number; onPick?: (p: PhotoItem) => void }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <button
      type="button"
      className="pn-photo"
      data-testid="photo-tile"
      title={p.title}
      draggable
      onDragStart={(e) => photoDrag(e, p)}
      onClick={() => (onPick ?? insertPhoto)(p)}
      style={{ aspectRatio: height ? undefined : `${p.w} / ${p.h}`, height }}
    >
      <img src={p.thumb} alt={p.title} loading="lazy" onError={() => setOk(false)} draggable={false} />
      <span className="free">Free</span>
      <span className="credit">
        {p.title}
        {p.credit.creator ? ` · ${p.credit.creator}` : ''} · {p.credit.license}
      </span>
    </button>
  );
}

/** Two-column masonry that keeps items in place while more load (balanced by aspect ratio). */
export function PhotoMasonry({ items, onPick }: { items: PhotoItem[]; onPick?: (p: PhotoItem) => void }) {
  const cols = useMemo(() => {
    const out: [PhotoItem[], PhotoItem[]] = [[], []];
    const hgt = [0, 0];
    for (const p of items) {
      const r = Math.min(2.2, Math.max(0.45, p.h / Math.max(1, p.w)));
      const k = hgt[0] <= hgt[1] ? 0 : 1;
      out[k].push(p);
      hgt[k] += r;
    }
    return out;
  }, [items]);
  return (
    <div className="pn-masonry">
      {cols.map((c, i) => (
        <div className="col" key={i}>
          {c.map((p) => (
            <PhotoTile key={p.id} p={p} onPick={onPick} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Icons / graphics ---------- */
export function IconTile({ i, mono, small }: { i: IconItem; mono?: boolean; small?: boolean }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <button
      type="button"
      className={'pn-tile sq' + (mono ? ' icon' : '')}
      data-testid="icon-tile"
      title={iconLabel(i)}
      draggable
      onPointerEnter={() => prefetchIcon(i.id)}
      onFocus={() => prefetchIcon(i.id)}
      onDragStart={(e) => iconDrag(e, i)}
      onClick={() => insertIcon(i.id)}
      style={small ? { width: 70 } : undefined}
    >
      <img src={i.url} alt={iconLabel(i)} loading="lazy" onError={() => setOk(false)} draggable={false} />
    </button>
  );
}

export function IconGrid({ items, mono, cols = 4 }: { items: IconItem[]; mono?: boolean; cols?: number }) {
  return (
    <div className={'pn-grid' + (cols === 3 ? ' c3' : cols === 5 ? ' c5' : '')}>
      {items.map((i) => (
        <IconTile key={i.id} i={i} mono={mono} />
      ))}
    </div>
  );
}

/* ---------- Videos ---------- */
export function VideoTile({ v, height }: { v: VideoItem; height?: number }) {
  const [hover, setHover] = useState(false);
  const [previewOk, setPreviewOk] = useState(true);
  return (
    <button
      type="button"
      className="pn-photo"
      data-testid="video-tile"
      title={v.title}
      draggable
      onDragStart={(e) => videoDrag(e, v)}
      onClick={() => insertVideoItem(v)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{ aspectRatio: height ? undefined : `${v.w} / ${v.h}`, height, width: height ? (height * v.w) / v.h : undefined }}
    >
      <img src={v.poster} alt={v.title} loading="lazy" draggable={false} />
      {hover && previewOk && <video src={v.preview} muted autoPlay loop playsInline onError={() => setPreviewOk(false)} />}
      <span className="dur">
        <Icon name="Play" size={10} />
        {fmtDuration(v.duration)}
      </span>
      <span className="free">Free</span>
      <span className="credit">
        {v.title}
        {v.credit.license ? ` · ${v.credit.license}` : ''}
      </span>
    </button>
  );
}

export function VideoGrid({ items }: { items: VideoItem[] }) {
  const cols = useMemo(() => {
    const out: [VideoItem[], VideoItem[]] = [[], []];
    const hgt = [0, 0];
    for (const v of items) {
      const k = hgt[0] <= hgt[1] ? 0 : 1;
      out[k].push(v);
      hgt[k] += Math.min(2, v.h / Math.max(1, v.w));
    }
    return out;
  }, [items]);
  return (
    <div className="pn-masonry">
      {cols.map((c, i) => (
        <div className="col" key={i}>
          {c.map((v) => (
            <VideoTile key={v.id} v={v} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Audio preview player (one at a time, module-level) ---------- */
type PlayerState = { id: string | null; progress: number; loading: boolean };
let player: HTMLAudioElement | null = null;
let pState: PlayerState = { id: null, progress: 0, loading: false };
const pListeners = new Set<() => void>();
const setP = (s: Partial<PlayerState>) => {
  pState = { ...pState, ...s };
  pListeners.forEach((l) => l());
};

export function togglePreview(id: string, src: string) {
  if (!player) {
    player = new Audio();
    player.preload = 'none';
    player.addEventListener('timeupdate', () => player && setP({ progress: player.duration ? player.currentTime / player.duration : 0 }));
    player.addEventListener('playing', () => setP({ loading: false }));
    player.addEventListener('ended', () => setP({ id: null, progress: 0 }));
    player.addEventListener('error', () => pState.id && setP({ id: null, loading: false }));
  }
  if (pState.id === id) {
    player.pause();
    setP({ id: null, progress: 0, loading: false });
    return;
  }
  player.pause();
  player.src = src;
  setP({ id, progress: 0, loading: true });
  player.play().catch(() => setP({ id: null, loading: false }));
}
export function stopPreview() {
  player?.pause();
  if (pState.id) setP({ id: null, progress: 0, loading: false });
}
const subP = (f: () => void) => {
  pListeners.add(f);
  return () => pListeners.delete(f);
};
export const usePlayer = () => useSyncExternalStore(subP, () => pState);

const AUDIO_TINTS = ['#8b3dff', '#00c4cc', '#ff8a4c', '#22b8cf', '#2f9e6e', '#f59f00', '#5b566a'];

export function AudioRow({ a }: { a: AudioItem }) {
  const st = usePlayer();
  const playing = st.id === a.id;
  const tint = AUDIO_TINTS[(a.id.charCodeAt(0) + a.id.charCodeAt(1)) % AUDIO_TINTS.length];
  return (
    <div
      className="pn-row"
      role="button"
      tabIndex={0}
      data-testid="audio-row"
      draggable
      onDragStart={(e) => audioDrag(e, a)}
      onClick={() => insertAudioItem(a)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') insertAudioItem(a);
        if (e.key === ' ') {
          e.preventDefault();
          togglePreview(a.id, a.src);
        }
      }}
      title={`${a.title} — click to add to your design`}
    >
      <button
        className="pn-play"
        data-testid="audio-play"
        aria-label={playing ? 'Pause preview' : 'Play preview'}
        style={{ background: a.thumb ? `url("${a.thumb}") center/cover, ${tint}` : tint }}
        onClick={(e) => {
          e.stopPropagation();
          togglePreview(a.id, a.src);
        }}
      >
        {playing && st.loading ? <span className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} /> : <Icon name={playing ? 'Pause' : 'Play'} size={18} />}
      </button>
      <div className="meta">
        <div className="t">{a.title}</div>
        <div className="s">
          {a.creator}
          {a.genres.length ? ` · ${a.genres.slice(0, 2).join(', ')}` : ''}
        </div>
        {playing && (
          <div className="pn-prog">
            <div style={{ width: `${st.progress * 100}%` }} />
          </div>
        )}
      </div>
      <span className="d">{fmtDuration(a.duration)}</span>
    </div>
  );
}

export function AudioList({ items }: { items: AudioItem[] }) {
  useEffect(() => () => stopPreview(), []);
  return (
    <div className="pn-audio">
      {items.map((a) => (
        <AudioRow key={a.id} a={a} />
      ))}
    </div>
  );
}

/** Horizontally scrolling chip row. */
export function ChipRow<T extends string>({ options, value, onChange, testId }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testId?: string }) {
  return (
    <div className="pn-chips-scroll" data-testid={testId}>
      {options.map((o) => (
        <button key={o.value} className={'chip' + (o.value === value ? ' active' : '')} onClick={() => onChange(o.value === value && o.value !== '' ? ('' as T) : o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
