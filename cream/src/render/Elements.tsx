import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import type {
  DrawEl,
  El,
  EmbedEl,
  FrameEl,
  GridEl,
  ImageEl,
  LineCap,
  LineEl,
  MediaFit,
  ShapeEl,
  StickyEl,
  SvgEl,
  TableEl,
  TextEl,
  VideoEl,
} from '../model/types';
import { useSrc } from '../store/blobs';
import { cssFilter, imageShadowCss, mergeFilters, overlayStyles } from './filters';
import { fillCss, textBackgroundStyle, textEffectStyle } from './textEffects';
import { shapePath } from './shapes';
import { ChartView } from './ChartView';
import { GRID_LAYOUTS } from '../model/defaults';
import { ensureFont } from '../assets/fonts';

export type RenderMode = 'edit' | 'static' | 'present' | 'export';

export interface RenderCtx {
  mode: RenderMode;
  pageIndex: number;
  pageCount: number;
  editingId?: string | null;
  cropId?: string | null;
  playing?: boolean;
  time?: number; // seconds into page
  onTextInput?: (id: string, html: string, h: number) => void;
  onCellInput?: (id: string, r: number, c: number, html: string) => void;
}

export const RenderContext = createContext<RenderCtx>({ mode: 'static', pageIndex: 0, pageCount: 1 });
export const useRender = () => useContext(RenderContext);

/* ---------- Text ---------- */

export function textBaseStyle(el: Pick<TextEl, 'fontFamily' | 'fontSize' | 'fontWeight' | 'italic' | 'underline' | 'strike' | 'color' | 'align' | 'lineHeight' | 'letterSpacing' | 'uppercase'>): CSSProperties {
  const deco = [el.underline ? 'underline' : '', el.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  return {
    fontFamily: `'${el.fontFamily}', system-ui, sans-serif`,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    fontStyle: el.italic ? 'italic' : 'normal',
    textDecoration: deco || 'none',
    color: el.color,
    textAlign: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: `${(el.letterSpacing ?? 0) / 1000}em`,
    textTransform: el.uppercase ? 'uppercase' : 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
  };
}

function listify(html: string, list?: 'bullet' | 'number') {
  if (!list) return html;
  const lines = html
    .replace(/<div>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .filter((l, i, arr) => l.length || i < arr.length - 1);
  const tag = list === 'number' ? 'ol' : 'ul';
  return `<${tag} style="margin:0;padding-left:1.25em">${lines.map((l) => `<li>${l || '&nbsp;'}</li>`).join('')}</${tag}>`;
}

function dynamicHtml(el: TextEl, ctx: RenderCtx) {
  if (el.dynamic === 'page-number') return String(ctx.pageIndex + 1);
  if (el.dynamic === 'page-count') return String(ctx.pageCount);
  if (el.dynamic === 'date') return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return el.html;
}

function TextView({ el }: { el: TextEl }) {
  const ctx = useRender();
  const editing = ctx.mode === 'edit' && ctx.editingId === el.id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ensureFont(el.fontFamily, el.fontWeight, el.italic);
  }, [el.fontFamily, el.fontWeight, el.italic]);

  // Uncontrolled while editing so the caret is never reset by re-renders.
  useLayoutEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.innerHTML = el.html;
    ref.current.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(ref.current);
    sel?.removeAllRanges();
    sel?.addRange(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Auto height: keep the box tall enough for its content (edit mode only).
  useLayoutEffect(() => {
    if (ctx.mode !== 'edit' || !ref.current || el.autoHeight === false || (el.curve ?? 0) !== 0) return;
    const h = Math.ceil(ref.current.scrollHeight);
    if (h > 0 && Math.abs(h - el.h) > 1) ctx.onTextInput?.(el.id, el.html, h);
  });

  const style: CSSProperties = {
    ...textBaseStyle(el),
    ...textEffectStyle(el),
    width: '100%',
    outline: 'none',
    cursor: editing ? 'text' : 'inherit',
    userSelect: editing ? 'text' : 'none',
  };
  const bg = textBackgroundStyle(el);

  if ((el.curve ?? 0) !== 0 && !editing) return <CurvedText el={el} />;

  const anchor = el.autoHeight === false ? el.anchor ?? 'top' : 'top';
  if (anchor === 'top') style.minHeight = '100%';
  const wrap: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: anchor === 'middle' ? 'center' : anchor === 'bottom' ? 'flex-end' : 'flex-start',
  };

  if (editing) {
    return (
      <div style={wrap} key="edit">
        <div
          key="edit-inner"
          ref={ref}
          className="cream-text-edit"
          contentEditable
          suppressContentEditableWarning
          spellCheck
          style={{ ...style, minHeight: el.fontSize * el.lineHeight }}
          onInput={(e) => ctx.onTextInput?.(el.id, (e.target as HTMLDivElement).innerHTML, Math.ceil((e.target as HTMLDivElement).scrollHeight))}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLElement).blur();
            e.stopPropagation();
          }}
        />
      </div>
    );
  }
  const html = listify(dynamicHtml(el, ctx), el.list);
  return (
    <div style={wrap} key="view">
      <div key="view-inner" ref={ref} style={style}>
        {bg ? <span style={bg} dangerouslySetInnerHTML={{ __html: html }} /> : <div dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </div>
  );
}

function CurvedText({ el }: { el: TextEl }) {
  const ctx = useRender();
  const text = useMemo(() => {
    const d = document.createElement('div');
    d.innerHTML = dynamicHtml(el, ctx).replace(/<br\s*\/?>/gi, ' ').replace(/<\/div>/gi, ' ');
    return d.textContent ?? '';
  }, [el.html, el.dynamic]);
  const curve = el.curve ?? 0;
  const w = el.w;
  const r = (w / 2) * (100 / Math.max(5, Math.abs(curve))) * 0.9;
  const sweep = curve > 0 ? 1 : 0;
  const cy = curve > 0 ? r + el.fontSize : el.h - r - el.fontSize * 0.3;
  const half = Math.min(r * 0.999, w / 2);
  const dy = Math.sqrt(Math.max(0, r * r - half * half));
  const y0 = curve > 0 ? cy - dy : cy + dy;
  const d = `M${w / 2 - half},${y0} A${r},${r} 0 0 ${sweep} ${w / 2 + half},${y0}`;
  const id = 'curve-' + el.id;
  const eff = textEffectStyle(el);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${el.h}`} style={{ overflow: 'visible' }}>
      <path id={id} d={d} fill="none" />
      <text
        fontFamily={`'${el.fontFamily}', sans-serif`}
        fontSize={el.fontSize}
        fontWeight={el.fontWeight}
        fontStyle={el.italic ? 'italic' : 'normal'}
        fill={el.color}
        letterSpacing={`${(el.letterSpacing ?? 0) / 1000}em`}
        style={{ textTransform: el.uppercase ? 'uppercase' : 'none', textShadow: eff.textShadow as string }}
        textAnchor="middle"
      >
        <textPath href={`#${id}`} startOffset="50%">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/* ---------- Shape ---------- */

function FillDefs({ id, fill }: { id: string; fill: ShapeEl['fill'] }) {
  if (fill.kind === 'gradient') {
    const stops = fill.stops.map((s, i) => <stop key={i} offset={s.pos} stopColor={s.color} />);
    if (fill.type === 'radial') return <radialGradient id={id}>{stops}</radialGradient>;
    const a = ((fill.angle - 90) * Math.PI) / 180;
    return (
      <linearGradient id={id} x1={0.5 - Math.cos(a) / 2} y1={0.5 - Math.sin(a) / 2} x2={0.5 + Math.cos(a) / 2} y2={0.5 + Math.sin(a) / 2}>
        {stops}
      </linearGradient>
    );
  }
  return null;
}

function ShapeView({ el }: { el: ShapeEl }) {
  const ctx = useRender();
  const d = shapePath(el.shape, el.w, el.h, el.radius);
  const fid = 'sf-' + el.id;
  const imgSrc = useSrc(el.fill.kind === 'image' ? el.fill.src : undefined);
  const fill = el.fill.kind === 'solid' ? el.fill.color : el.fill.kind === 'gradient' ? `url(#${fid})` : `url(#${fid}-img)`;
  const dash = el.stroke?.style === 'dashed' ? `${el.stroke.width * 3} ${el.stroke.width * 2}` : el.stroke?.style === 'dotted' ? `0 ${el.stroke.width * 2}` : undefined;
  const hasText = !!el.html || ctx.editingId === el.id;
  return (
    <>
      <svg width="100%" height="100%" viewBox={`0 0 ${el.w} ${el.h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <FillDefs id={fid} fill={el.fill} />
          {el.fill.kind === 'image' && (
            <pattern id={fid + '-img'} patternUnits="userSpaceOnUse" width={el.w} height={el.h}>
              <image href={imgSrc} width={el.w} height={el.h} preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
          <clipPath id={fid + '-clip'}>
            <path d={d} />
          </clipPath>
        </defs>
        <path d={d} fill={fill} fillRule="evenodd" />
        {el.stroke && el.stroke.width > 0 && (
          <path d={d} fill="none" stroke={el.stroke.color} strokeWidth={el.stroke.width * 2} strokeDasharray={dash} strokeLinecap="round" clipPath={`url(#${fid}-clip)`} />
        )}
      </svg>
      {hasText && (
        <div style={{ position: 'absolute', inset: '8%', display: 'flex', alignItems: 'center' }}>
          <TextView
            el={{
              ...(el as any),
              type: 'text',
              html: el.html ?? '',
              fontFamily: el.fontFamily ?? 'Inter',
              fontSize: el.fontSize ?? 24,
              fontWeight: el.fontWeight ?? 400,
              color: el.color ?? '#fff',
              align: el.align ?? 'center',
              lineHeight: el.lineHeight ?? 1.3,
              letterSpacing: el.letterSpacing ?? 0,
              italic: !!el.italic,
              underline: !!el.underline,
              strike: !!el.strike,
              uppercase: !!el.uppercase,
              autoHeight: false,
              anchor: 'middle',
              h: el.h * 0.84,
              w: el.w * 0.84,
            }}
          />
        </div>
      )}
    </>
  );
}

/* ---------- Line ---------- */

function capMarker(id: string, cap: LineCap, color: string, start: boolean) {
  if (cap === 'none') return null;
  const orient = start ? 'auto-start-reverse' : 'auto';
  const common = { id, markerUnits: 'strokeWidth' as const, orient, refX: 5, refY: 5, markerWidth: 4, markerHeight: 4, viewBox: '0 0 10 10' };
  switch (cap) {
    case 'arrow':
      return (
        <marker {...common} refX={7}>
          <path d="M1,1 L8,5 L1,9" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      );
    case 'triangle':
      return (
        <marker {...common} refX={6}>
          <path d="M0,0 L10,5 L0,10 Z" fill={color} />
        </marker>
      );
    case 'circle':
      return (
        <marker {...common}>
          <circle cx={5} cy={5} r={4} fill={color} />
        </marker>
      );
    case 'circle-outline':
      return (
        <marker {...common}>
          <circle cx={5} cy={5} r={3.5} fill="#fff" stroke={color} strokeWidth={1.4} />
        </marker>
      );
    case 'square':
      return (
        <marker {...common}>
          <rect x={1} y={1} width={8} height={8} fill={color} />
        </marker>
      );
    case 'bar':
      return (
        <marker {...common}>
          <rect x={4} y={0} width={2} height={10} fill={color} />
        </marker>
      );
    case 'diamond':
      return (
        <marker {...common}>
          <path d="M5,0 L10,5 L5,10 L0,5 Z" fill={color} />
        </marker>
      );
  }
}

export function linePathD(el: LineEl, ox: number, oy: number) {
  const x1 = el.x1 - ox;
  const y1 = el.y1 - oy;
  const x2 = el.x2 - ox;
  const y2 = el.y2 - oy;
  if (el.lineType === 'elbow') {
    const mx = (x1 + x2) / 2;
    return `M${x1},${y1} H${mx} V${y2} H${x2}`;
  }
  if (el.lineType === 'curve') {
    const dx = (x2 - x1) * 0.5;
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  }
  return `M${x1},${y1} L${x2},${y2}`;
}

/** Lines render in page coordinates (their box is computed from endpoints). */
export function LineView({ el }: { el: LineEl }) {
  const pad = el.width * 4 + 10;
  const ox = Math.min(el.x1, el.x2) - pad;
  const oy = Math.min(el.y1, el.y2) - pad;
  const w = Math.abs(el.x2 - el.x1) + pad * 2;
  const h = Math.abs(el.y2 - el.y1) + pad * 2;
  const dash = el.style === 'dashed' ? `${el.width * 3} ${el.width * 2}` : el.style === 'dotted' ? `0.1 ${el.width * 2}` : undefined;
  const sid = 'ls-' + el.id;
  const eid = 'le-' + el.id;
  return (
    <svg
      style={{ position: 'absolute', left: ox, top: oy, width: w, height: h, overflow: 'visible', opacity: el.opacity, pointerEvents: 'none' }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <defs>
        {capMarker(sid, el.startCap, el.color, true)}
        {capMarker(eid, el.endCap, el.color, false)}
      </defs>
      <path
        d={linePathD(el, ox, oy)}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
        strokeDasharray={dash}
        strokeLinecap={el.rounded || el.style === 'dotted' ? 'round' : 'butt'}
        strokeLinejoin="round"
        markerStart={el.startCap !== 'none' ? `url(#${sid})` : undefined}
        markerEnd={el.endCap !== 'none' ? `url(#${eid})` : undefined}
      />
      <path data-el-id={el.id} d={linePathD(el, ox, oy)} fill="none" stroke="transparent" strokeWidth={Math.max(16, el.width + 12)} style={{ pointerEvents: 'stroke' }} />
    </svg>
  );
}

/* ---------- Image ---------- */

function ImageView({ el }: { el: ImageEl }) {
  const src = useSrc(el.src);
  const f = mergeFilters(el.filters, el.preset, el.presetIntensity ?? 50);
  const crop = el.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const iw = el.w / crop.w;
  const ih = el.h / crop.h;
  const duoId = 'duo-' + el.id;
  const filter = [cssFilter(f), el.duotone ? `url(#${duoId})` : '', el.effectBlur ? `blur(${el.effectBlur / 6}px)` : ''].filter(Boolean).join(' ');
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: el.radius ?? 0,
        overflow: 'hidden',
        filter: imageShadowCss(el.shadow),
        border: el.border && el.border.width ? `${el.border.width}px ${el.border.style} ${el.border.color}` : undefined,
        boxSizing: 'border-box',
      }}
    >
      {el.duotone && <DuotoneFilter id={duoId} hi={el.duotone.highlight} lo={el.duotone.shadow} />}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: el.radius ?? 0 }}>
        {src && (
          <img
            src={src}
            alt={el.alt ?? ''}
            draggable={false}
            crossOrigin={src.startsWith('http') ? 'anonymous' : undefined}
            style={{ position: 'absolute', left: -crop.x * iw, top: -crop.y * ih, width: iw, height: ih, maxWidth: 'none', filter: filter || undefined, userSelect: 'none', pointerEvents: 'none' }}
          />
        )}
        {!src && <div style={{ position: 'absolute', inset: 0, background: '#e9e6f2' }} />}
        {overlayStyles(f).map((s, i) => (
          <div key={i} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...s }} />
        ))}
      </div>
    </div>
  );
}

function DuotoneFilter({ id, hi, lo }: { id: string; hi: string; lo: string }) {
  const c = (hex: string) => {
    const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const [h, l] = [c(hi), c(lo)];
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${l[0]} ${h[0]}`} />
          <feFuncG type="table" tableValues={`${l[1]} ${h[1]}`} />
          <feFuncB type="table" tableValues={`${l[2]} ${h[2]}`} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

/* ---------- SVG graphic ---------- */

export function recolorSvg(svg: string, map?: Record<string, string>) {
  if (!map) return svg;
  let out = svg;
  for (const [from, to] of Object.entries(map)) {
    if (!from || !to) continue;
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(esc, 'gi'), to);
  }
  return out;
}

/** Extract the distinct colours in an SVG (for the recolour swatches). */
export function svgColors(svg: string): string[] {
  const set = new Set<string>();
  const re = /(fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|currentColor|[a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const c = m[2];
    if (!['none', 'transparent', 'url', 'inherit'].includes(c.toLowerCase())) set.add(c);
  }
  return [...set].slice(0, 12);
}

function SvgView({ el }: { el: SvgEl }) {
  const html = useMemo(() => {
    let s = recolorSvg(el.svg, el.colorMap);
    s = s.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
      let a = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      if (!/preserveAspectRatio/.test(a)) a += el.keepRatio === false ? ' preserveAspectRatio="none"' : '';
      return `<svg${a} width="100%" height="100%">`;
    });
    return s;
  }, [el.svg, el.colorMap, el.keepRatio]);
  return <div style={{ position: 'absolute', inset: 0, color: el.colorMap?.currentColor ?? '#1f1f1f' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- Video ---------- */

function VideoView({ el }: { el: VideoEl }) {
  const ctx = useRender();
  const src = useSrc(el.src);
  const ref = useRef<HTMLVideoElement>(null);
  const crop = el.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const play = ctx.mode === 'present' || (ctx.mode === 'edit' && ctx.playing);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = el.speed || 1;
    v.volume = Math.max(0, Math.min(1, el.volume));
    v.muted = ctx.mode !== 'present' && !ctx.playing;
    if (play) {
      if (v.currentTime < el.trimStart || v.currentTime > el.trimEnd) v.currentTime = el.trimStart;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = el.trimStart + 0.05;
    }
  }, [play, el.trimStart, el.trimEnd, el.speed, el.volume, src]);
  const f = mergeFilters(el.filters);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: el.radius ?? 0, background: '#000' }}>
      {src && (
        <video
          ref={ref}
          src={src}
          poster={el.poster}
          crossOrigin="anonymous"
          playsInline
          muted
          loop={el.loop}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.currentTime >= el.trimEnd) {
              if (el.loop) v.currentTime = el.trimStart;
              else v.pause();
            }
          }}
          style={{
            position: 'absolute',
            left: (-crop.x * el.w) / crop.w,
            top: (-crop.y * el.h) / crop.h,
            width: el.w / crop.w,
            height: el.h / crop.h,
            objectFit: 'cover',
            filter: cssFilter(f) || undefined,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

/* ---------- Media fitting (frames / grids) ---------- */

export function MediaFill({ media, w, h }: { media: MediaFit; w: number; h: number }) {
  const src = useSrc(media.src);
  if (!media.src) return <div style={{ position: 'absolute', inset: 0, background: media.fill ?? '#d9d9d9' }} />;
  const nw = media.naturalW || 1;
  const nh = media.naturalH || 1;
  const cover = Math.max(w / nw, h / nh) * (media.scale || 1);
  const dw = nw * cover;
  const dh = nh * cover;
  const left = (w - dw) / 2 + media.offsetX * (dw - w);
  const top = (h - dh) / 2 + media.offsetY * (dh - h);
  const st: CSSProperties = { position: 'absolute', left, top, width: dw, height: dh, maxWidth: 'none', pointerEvents: 'none', objectFit: 'cover' };
  return media.kind === 'video' ? (
    <video src={src} style={st} muted loop autoPlay playsInline crossOrigin="anonymous" />
  ) : (
    <img src={src} style={st} draggable={false} crossOrigin={src.startsWith('http') ? 'anonymous' : undefined} alt="" />
  );
}

/* ---------- Frame ---------- */

function FrameView({ el }: { el: FrameEl }) {
  const { w, h } = el;
  const cid = 'fc-' + el.id;
  const device = ['polaroid', 'phone', 'laptop', 'browser', 'film'].includes(el.frameShape);
  if (device) {
    const inset = deviceInset(el.frameShape, w, h);
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <DeviceChrome kind={el.frameShape} w={w} h={h} />
        <div style={{ position: 'absolute', left: inset.x, top: inset.y, width: inset.w, height: inset.h, overflow: 'hidden', borderRadius: inset.r }}>
          <MediaFill media={el.media} w={inset.w} h={inset.h} />
        </div>
      </div>
    );
  }
  if (el.frameShape === 'letter') {
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id={cid}>
            <text x={w / 2} y={h * 0.86} textAnchor="middle" fontFamily="Archivo Black, Arial Black, sans-serif" fontWeight={900} fontSize={h * 1.05}>
              {el.letter ?? 'A'}
            </text>
          </clipPath>
        </defs>
        <foreignObject x={0} y={0} width={w} height={h} clipPath={`url(#${cid})`}>
          <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
            <MediaFill media={el.media} w={w} h={h} />
          </div>
        </foreignObject>
      </svg>
    );
  }
  const d = shapePath(el.frameShape === 'blob' ? 'blob1' : el.frameShape, w, h, el.frameShape === 'rounded' ? Math.min(w, h) * 0.12 : 0);
  return (
    <div style={{ position: 'absolute', inset: 0, clipPath: `path('${d}')` }}>
      <MediaFill media={el.media} w={w} h={h} />
      {el.border && el.border.width > 0 && (
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
          <path d={d} fill="none" stroke={el.border.color} strokeWidth={el.border.width * 2} />
        </svg>
      )}
    </div>
  );
}

function deviceInset(kind: string, w: number, h: number) {
  switch (kind) {
    case 'polaroid':
      return { x: w * 0.06, y: w * 0.06, w: w * 0.88, h: h - w * 0.06 - h * 0.2, r: 0 };
    case 'phone':
      return { x: w * 0.06, y: h * 0.03, w: w * 0.88, h: h * 0.94, r: w * 0.08 };
    case 'laptop':
      return { x: w * 0.12, y: h * 0.06, w: w * 0.76, h: h * 0.74, r: 2 };
    case 'browser':
      return { x: 0, y: Math.min(36, h * 0.1), w, h: h - Math.min(36, h * 0.1), r: 0 };
    case 'film':
      return { x: w * 0.04, y: h * 0.14, w: w * 0.92, h: h * 0.72, r: 0 };
    default:
      return { x: 0, y: 0, w, h, r: 0 };
  }
}

function DeviceChrome({ kind, w, h }: { kind: string; w: number; h: number }) {
  if (kind === 'polaroid') return <div style={{ position: 'absolute', inset: 0, background: '#fff', boxShadow: '0 4px 18px rgba(0,0,0,.18)' }} />;
  if (kind === 'phone')
    return <div style={{ position: 'absolute', inset: 0, background: '#111', borderRadius: w * 0.14, boxShadow: '0 6px 24px rgba(0,0,0,.25)' }} />;
  if (kind === 'laptop')
    return (
      <>
        <div style={{ position: 'absolute', left: w * 0.08, top: 0, width: w * 0.84, height: h * 0.84, background: '#1d1d1f', borderRadius: w * 0.02 }} />
        <div style={{ position: 'absolute', left: 0, top: h * 0.84, width: w, height: h * 0.16, background: 'linear-gradient(#d6d6d8,#a9a9ad)', borderRadius: `0 0 ${w * 0.04}px ${w * 0.04}px` }} />
      </>
    );
  if (kind === 'browser') {
    const bar = Math.min(36, h * 0.1);
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, background: '#fff', borderRadius: 8, boxShadow: '0 4px 18px rgba(0,0,0,.15)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: bar, background: '#ececf0', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: bar * 0.18, paddingLeft: bar * 0.4 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </>
    );
  }
  if (kind === 'film')
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#111',
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${w * 0.03}px, #f4f4f4 ${w * 0.03}px ${w * 0.055}px, transparent ${w * 0.055}px ${w * 0.08}px)`,
          backgroundSize: `100% ${h * 0.08}px`,
          backgroundRepeat: 'repeat-x',
          backgroundPosition: `0 ${h * 0.03}px, 0 ${h * 0.89}px`,
        }}
      />
    );
  return null;
}

/* ---------- Grid ---------- */

function GridView({ el }: { el: GridEl }) {
  const l = GRID_LAYOUTS[el.layout] ?? GRID_LAYOUTS['2x2'];
  const cw = (el.w - el.gap * (l.cols - 1)) / l.cols;
  const ch = (el.h - el.gap * (l.rows - 1)) / l.rows;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {l.areas.map(([c, r, cs, rs], i) => {
        const w = cw * cs + el.gap * (cs - 1);
        const h = ch * rs + el.gap * (rs - 1);
        return (
          <div
            key={i}
            data-grid-cell={i}
            style={{ position: 'absolute', left: c * (cw + el.gap), top: r * (ch + el.gap), width: w, height: h, overflow: 'hidden', borderRadius: el.radius }}
          >
            <MediaFill media={el.cells[i] ?? { scale: 1, offsetX: 0, offsetY: 0 }} w={w} h={h} />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Table ---------- */

function TableView({ el }: { el: TableEl }) {
  const ctx = useRender();
  const editing = ctx.mode === 'edit' && ctx.editingId === el.id;
  const border = el.borderStyle === 'none' ? 'none' : `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}`;
  useEffect(() => {
    ensureFont(el.fontFamily, 400);
  }, [el.fontFamily]);
  return (
    <table
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        fontFamily: `'${el.fontFamily}', sans-serif`,
        fontSize: el.fontSize,
        color: el.color,
      }}
    >
      <colgroup>
        {el.colWidths.map((cw, i) => (
          <col key={i} style={{ width: `${cw * 100}%` }} />
        ))}
      </colgroup>
      <tbody>
        {el.cells.map((row, r) => (
          <tr key={r} style={{ height: el.rowHeights[r] }}>
            {row.map((cell, c) =>
              cell.hidden ? null : (
                <td
                  key={c}
                  colSpan={cell.colspan}
                  rowSpan={cell.rowspan}
                  data-cell={`${r}:${c}`}
                  style={{
                    border,
                    padding: el.cellPadding,
                    background: cell.fill ?? (r === 0 ? el.headerFill : undefined),
                    textAlign: cell.align ?? 'left',
                    fontWeight: cell.bold ? 700 : undefined,
                    verticalAlign: 'middle',
                    overflowWrap: 'break-word',
                  }}
                >
                  {editing ? (
                    <EditableCell html={cell.html} onChange={(html) => ctx.onCellInput?.(el.id, r, c, html)} />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: cell.html || '&nbsp;' }} />
                  )}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EditableCell({ html, onChange }: { html: string; onChange: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      style={{ outline: 'none', minHeight: '1em', cursor: 'text' }}
      onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    />
  );
}

/* ---------- Sticky ---------- */

function StickyView({ el }: { el: StickyEl }) {
  const ctx = useRender();
  const textEl: TextEl = {
    ...(el as any),
    type: 'text',
    fontFamily: 'Inter',
    fontWeight: 500,
    fontSize: el.fontSize,
    color: '#2b2b2b',
    align: 'left',
    lineHeight: 1.35,
    letterSpacing: 0,
    italic: false,
    underline: false,
    strike: false,
    uppercase: false,
    autoHeight: false,
    anchor: 'top',
    w: el.w - 32,
    h: el.h - 48,
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: el.color, boxShadow: '0 3px 10px rgba(0,0,0,.12)', borderRadius: 4, padding: 16, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: 16, top: 16, right: 16, bottom: 32 }}>
        <TextView el={textEl} />
      </div>
      {el.author && <div style={{ position: 'absolute', left: 16, bottom: 10, fontSize: Math.max(10, el.fontSize * 0.5), color: 'rgba(0,0,0,.5)', fontFamily: 'Inter' }}>{el.author}</div>}
      {el.reactions && Object.keys(el.reactions).length > 0 && (
        <div style={{ position: 'absolute', right: 10, bottom: 8, fontSize: Math.max(10, el.fontSize * 0.55) }}>
          {Object.entries(el.reactions).map(([k, v]) => `${k}${v > 1 ? v : ''}`).join(' ')}
        </div>
      )}
      {ctx.mode === 'edit' && null}
    </div>
  );
}

/* ---------- Draw ---------- */

function DrawView({ el }: { el: DrawEl }) {
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${el.vbW} ${el.vbH}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <filter id={'glow-' + el.id}>
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {el.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.tool === 'glow' ? '#fff' : p.color}
          strokeWidth={p.width}
          strokeOpacity={p.opacity}
          strokeLinecap={p.tool === 'highlighter' ? 'butt' : 'round'}
          strokeLinejoin="round"
          style={p.tool === 'glow' ? { filter: `drop-shadow(0 0 ${p.width}px ${p.color}) drop-shadow(0 0 ${p.width * 2}px ${p.color})` } : undefined}
        />
      ))}
    </svg>
  );
}

/* ---------- Embed / Code ---------- */

function EmbedView({ el }: { el: EmbedEl }) {
  const ctx = useRender();
  const poster = useSrc(el.poster);
  if (ctx.mode === 'export' || ctx.mode === 'static') {
    return poster ? (
      <img src={poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
    ) : (
      <div style={{ position: 'absolute', inset: 0, background: '#1e1b2e', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Inter', fontSize: Math.max(12, el.h / 12) }}>
        {el.html ? '</> ' : '▶ '}
        {el.title ?? 'Embed'}
      </div>
    );
  }
  return (
    <>
      <iframe
        title={el.title ?? 'embed'}
        src={el.html ? undefined : el.url}
        srcDoc={el.html}
        sandbox={el.html ? 'allow-scripts allow-forms allow-popups' : 'allow-scripts allow-forms allow-popups allow-same-origin allow-presentation'}
        allow="autoplay; encrypted-media; fullscreen"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff' }}
      />
      {ctx.mode === 'edit' && <div style={{ position: 'absolute', inset: 0 }} />}
    </>
  );
}

/* ---------- Dispatcher ---------- */

export function ElementBody({ el }: { el: El }) {
  switch (el.type) {
    case 'text':
      return <TextView el={el} />;
    case 'shape':
      return <ShapeView el={el} />;
    case 'image':
      return <ImageView el={el} />;
    case 'svg':
      return <SvgView el={el} />;
    case 'video':
      return <VideoView el={el} />;
    case 'chart':
      return <ChartView el={el} />;
    case 'table':
      return <TableView el={el} />;
    case 'frame':
      return <FrameView el={el} />;
    case 'grid':
      return <GridView el={el} />;
    case 'sticky':
      return <StickyView el={el} />;
    case 'draw':
      return <DrawView el={el} />;
    case 'embed':
      return <EmbedView el={el} />;
    default:
      return null;
  }
}

/** Positioned wrapper for any (non-line) element. */
export function ElementView({ el, animation }: { el: El; animation?: CSSProperties }) {
  if (el.type === 'line') {
    return animation?.animation ? (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...animation }}>
        <LineView el={el} />
      </div>
    ) : (
      <LineView el={el} />
    );
  }
  const ctx = useRender();
  const clickable = !!el.link && ctx.mode === 'present';
  const onLink = clickable
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        if (el.link!.startsWith('#page=')) window.dispatchEvent(new CustomEvent('cream:goto-page', { detail: el.link!.slice(6) }));
        else window.open(el.link, '_blank', 'noopener');
      }
    : undefined;
  const flip = el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1},${el.flipY ? -1 : 1})` : undefined;
  // Text is never mirrored (Canva flips the box, not glyphs) — except images/graphics.
  const flipInner = el.type === 'text' ? undefined : flip;
  return (
    <div
      data-el-id={el.id}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        opacity: el.opacity,
        cursor: clickable ? 'pointer' : undefined,
      }}
      onClick={onLink}
      title={clickable ? el.link : undefined}
    >
      <div style={{ position: 'absolute', inset: 0, ...(animation ?? {}) }}>
        <div style={{ position: 'absolute', inset: 0, transform: flipInner }}>
          <ElementBody el={el} />
        </div>
      </div>
    </div>
  );
}

export { fillCss };
