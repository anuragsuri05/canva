import type { ChartEl } from '../model/types';

/** Pure-SVG chart renderer (works in canvas, present and export). */
export function ChartView({ el }: { el: ChartEl }) {
  const { w, h, options: o, chartType } = el;
  const font = { fontFamily: o.fontFamily, fontSize: o.fontSize, fill: o.textColor };
  const legendH = o.legend ? o.fontSize * 2 : 0;
  const pad = { l: o.labels ? o.fontSize * 3 : 8, r: 12, t: 12 + legendH, b: o.labels ? o.fontSize * 2.2 : 8 };
  const iw = Math.max(1, w - pad.l - pad.r);
  const ih = Math.max(1, h - pad.t - pad.b);
  const all = el.series.flatMap((s) => s.values);
  const stacked = chartType === 'stacked-column';
  const stackMax = stacked ? Math.max(...el.labels.map((_, i) => el.series.reduce((a, s) => a + (s.values[i] ?? 0), 0))) : 0;
  const max = o.max ?? Math.max(1, stacked ? stackMax : Math.max(...all, 0)) * 1.1;
  const fmt = (v: number) => `${Math.round(v * 100) / 100}${o.suffix ?? ''}`;

  const legend = o.legend ? (
    <g>
      {(chartType === 'pie' || chartType === 'donut' || chartType === 'funnel' ? el.labels.map((l, i) => ({ name: l, color: pieColor(el, i) })) : el.series).map((s, i) => (
        <g key={i} transform={`translate(${8 + i * Math.min(160, w / Math.max(1, el.series.length + 1))},${o.fontSize * 0.4})`}>
          <rect width={o.fontSize * 0.8} height={o.fontSize * 0.8} rx={2} fill={s.color} />
          <text x={o.fontSize * 1.1} y={o.fontSize * 0.75} {...font}>
            {s.name}
          </text>
        </g>
      ))}
    </g>
  ) : null;

  const gridLines =
    o.grid && !['pie', 'donut', 'progress-bar', 'progress-ring', 'number', 'radar', 'funnel', 'pictogram'].includes(chartType)
      ? [0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + ih - t * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + iw} y1={y} y2={y} stroke={o.gridColor} strokeWidth={1} />
              {o.labels && chartType !== 'bar' && (
                <text x={pad.l - 6} y={y + o.fontSize * 0.35} textAnchor="end" {...font} fontSize={o.fontSize * 0.85}>
                  {fmt(Math.round(max * t))}
                </text>
              )}
            </g>
          );
        })
      : null;

  let body: React.ReactNode = null;
  const n = el.labels.length;

  if (chartType === 'column' || chartType === 'stacked-column') {
    const slot = iw / Math.max(1, n);
    const gap = slot * (o.spacing / 100);
    const sc = stacked ? 1 : el.series.length;
    const bw = Math.max(1, (slot - gap) / sc);
    body = el.labels.map((lab, i) => {
      let acc = 0;
      return (
        <g key={i}>
          {el.series.map((s, j) => {
            const v = s.values[i] ?? 0;
            const bh = (v / max) * ih;
            const x = pad.l + i * slot + gap / 2 + (stacked ? 0 : j * bw);
            const y = pad.t + ih - bh - (stacked ? acc : 0);
            if (stacked) acc += bh;
            return (
              <g key={j}>
                <rect x={x} y={y} width={bw} height={Math.max(0, bh)} rx={Math.min(o.rounding, bw / 2)} fill={s.color} />
                {o.values && (
                  <text x={x + bw / 2} y={y - 4} textAnchor="middle" {...font} fontSize={o.fontSize * 0.8}>
                    {fmt(v)}
                  </text>
                )}
              </g>
            );
          })}
          {o.labels && (
            <text x={pad.l + i * slot + slot / 2} y={h - pad.b + o.fontSize * 1.3} textAnchor="middle" {...font}>
              {lab}
            </text>
          )}
        </g>
      );
    });
  } else if (chartType === 'bar') {
    const slot = ih / Math.max(1, n);
    const gap = slot * (o.spacing / 100);
    const bh = Math.max(1, (slot - gap) / el.series.length);
    const lw = o.labels ? Math.min(w * 0.3, o.fontSize * 6) : 0;
    const bwMax = w - lw - pad.r - 8;
    body = el.labels.map((lab, i) => (
      <g key={i}>
        {o.labels && (
          <text x={lw} y={pad.t + i * slot + slot / 2 + o.fontSize * 0.35} textAnchor="end" {...font}>
            {lab}
          </text>
        )}
        {el.series.map((s, j) => {
          const v = s.values[i] ?? 0;
          const bw = (v / max) * bwMax;
          const y = pad.t + i * slot + gap / 2 + j * bh;
          return (
            <g key={j}>
              <rect x={lw + 8} y={y} width={Math.max(0, bw)} height={bh} rx={Math.min(o.rounding, bh / 2)} fill={s.color} />
              {o.values && (
                <text x={lw + 12 + bw} y={y + bh / 2 + o.fontSize * 0.35} {...font} fontSize={o.fontSize * 0.8}>
                  {fmt(v)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    ));
  } else if (chartType === 'line' || chartType === 'area' || chartType === 'scatter') {
    const step = iw / Math.max(1, n - 1);
    const pt = (i: number, v: number) => [pad.l + i * step, pad.t + ih - (v / max) * ih] as const;
    body = (
      <>
        {el.series.map((s, j) => {
          const pts = s.values.slice(0, n).map((v, i) => pt(i, v));
          const d = o.smooth ? smoothPath(pts) : 'M' + pts.map((p) => p.join(',')).join(' L');
          return (
            <g key={j}>
              {chartType === 'area' && pts.length > 1 && (
                <path d={`${d} L${pts[pts.length - 1][0]},${pad.t + ih} L${pts[0][0]},${pad.t + ih} Z`} fill={s.color} opacity={0.3} />
              )}
              {chartType !== 'scatter' && <path d={d} fill="none" stroke={s.color} strokeWidth={o.lineWeight} strokeLinejoin="round" strokeLinecap="round" />}
              {(o.points || chartType === 'scatter') &&
                pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={chartType === 'scatter' ? o.lineWeight * 2.2 : o.lineWeight * 1.4} fill={s.color} />)}
              {o.values &&
                pts.map((p, i) => (
                  <text key={'v' + i} x={p[0]} y={p[1] - 8} textAnchor="middle" {...font} fontSize={o.fontSize * 0.8}>
                    {fmt(s.values[i])}
                  </text>
                ))}
            </g>
          );
        })}
        {o.labels &&
          el.labels.map((lab, i) => (
            <text key={i} x={pad.l + i * step} y={h - pad.b + o.fontSize * 1.3} textAnchor="middle" {...font}>
              {lab}
            </text>
          ))}
      </>
    );
  } else if (chartType === 'pie' || chartType === 'donut') {
    const vals = el.series[0]?.values ?? [];
    const total = vals.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const cx = w / 2;
    const cy = pad.t + (h - pad.t) / 2;
    const r = Math.max(4, Math.min(w, h - pad.t) / 2 - 8);
    const inner = chartType === 'donut' ? r * 0.58 : 0;
    let a0 = -Math.PI / 2;
    body = vals.map((v, i) => {
      const a1 = a0 + (Math.max(0, v) / total) * Math.PI * 2;
      const d = arcPath(cx, cy, r, inner, a0, a1);
      const mid = (a0 + a1) / 2;
      const lr = (r + inner) / 2 || r * 0.62;
      const el2 = (
        <g key={i}>
          <path d={d} fill={pieColor(el, i)} />
          {o.values && (
            <text x={cx + Math.cos(mid) * lr} y={cy + Math.sin(mid) * lr + o.fontSize * 0.35} textAnchor="middle" {...font} fill="#fff">
              {Math.round((v / total) * 100)}%
            </text>
          )}
        </g>
      );
      a0 = a1;
      return el2;
    });
  } else if (chartType === 'progress-bar') {
    const v = el.series[0]?.values[0] ?? 0;
    const m = o.max ?? 100;
    const bh = Math.min(h * 0.5, 40);
    body = (
      <>
        <rect x={0} y={h / 2 - bh / 2} width={w} height={bh} rx={bh / 2} fill={o.gridColor} />
        <rect x={0} y={h / 2 - bh / 2} width={(w * Math.min(v, m)) / m} height={bh} rx={bh / 2} fill={el.series[0]?.color} />
        {o.values && (
          <text x={w - 4} y={h / 2 - bh / 2 - 6} textAnchor="end" {...font}>
            {fmt(v)}
          </text>
        )}
      </>
    );
  } else if (chartType === 'progress-ring') {
    const v = el.series[0]?.values[0] ?? 0;
    const m = o.max ?? 100;
    const r = Math.min(w, h) / 2 - o.lineWeight * 3;
    const sw = Math.max(4, Math.min(w, h) * 0.1);
    const c = 2 * Math.PI * r;
    body = (
      <>
        <circle cx={w / 2} cy={h / 2} r={r} fill="none" stroke={o.gridColor} strokeWidth={sw} />
        <circle
          cx={w / 2}
          cy={h / 2}
          r={r}
          fill="none"
          stroke={el.series[0]?.color}
          strokeWidth={sw}
          strokeDasharray={`${(c * Math.min(v, m)) / m} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${w / 2} ${h / 2})`}
        />
        <text x={w / 2} y={h / 2 + o.fontSize * 0.7} textAnchor="middle" {...font} fontSize={o.fontSize * 2} fontWeight={700}>
          {fmt(v)}
        </text>
      </>
    );
  } else if (chartType === 'number') {
    const v = el.series[0]?.values[0] ?? 0;
    body = (
      <text x={w / 2} y={h / 2 + Math.min(h * 0.5, w / 4) * 0.35} textAnchor="middle" fontFamily={o.fontFamily} fontWeight={800} fontSize={Math.min(h * 0.5, w / 4)} fill={el.series[0]?.color}>
        {v.toLocaleString()}
        {o.suffix}
      </text>
    );
  } else if (chartType === 'funnel') {
    const vals = el.series[0]?.values ?? [];
    const m = Math.max(1, ...vals);
    const sh = (h - pad.t) / Math.max(1, vals.length);
    body = vals.map((v, i) => {
      const bw = (v / m) * w;
      return (
        <g key={i}>
          <rect x={(w - bw) / 2} y={pad.t + i * sh + 2} width={bw} height={sh - 4} rx={o.rounding} fill={pieColor(el, i)} />
          {o.labels && (
            <text x={w / 2} y={pad.t + i * sh + sh / 2 + o.fontSize * 0.35} textAnchor="middle" {...font} fill="#fff">
              {el.labels[i]} {o.values ? fmt(v) : ''}
            </text>
          )}
        </g>
      );
    });
  } else if (chartType === 'radar') {
    const cx = w / 2;
    const cy = pad.t + (h - pad.t) / 2;
    const r = Math.min(w, h - pad.t) / 2 - o.fontSize * 2;
    const ang = (i: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
    body = (
      <>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <polygon key={t} points={el.labels.map((_, i) => `${cx + Math.cos(ang(i)) * r * t},${cy + Math.sin(ang(i)) * r * t}`).join(' ')} fill="none" stroke={o.gridColor} />
        ))}
        {el.series.map((s, j) => (
          <polygon
            key={j}
            points={el.labels.map((_, i) => `${cx + Math.cos(ang(i)) * r * ((s.values[i] ?? 0) / max)},${cy + Math.sin(ang(i)) * r * ((s.values[i] ?? 0) / max)}`).join(' ')}
            fill={s.color}
            fillOpacity={0.3}
            stroke={s.color}
            strokeWidth={o.lineWeight}
          />
        ))}
        {o.labels &&
          el.labels.map((l, i) => (
            <text key={i} x={cx + Math.cos(ang(i)) * (r + o.fontSize)} y={cy + Math.sin(ang(i)) * (r + o.fontSize)} textAnchor="middle" {...font}>
              {l}
            </text>
          ))}
      </>
    );
  } else if (chartType === 'pictogram') {
    const v = Math.round(el.series[0]?.values[0] ?? 0);
    const total = Math.round(o.max ?? 10);
    const cols = Math.min(total, 10);
    const rows = Math.ceil(total / cols);
    const cs = Math.min(w / cols, (h - pad.t) / rows);
    body = Array.from({ length: total }, (_, i) => (
      <circle key={i} cx={(i % cols) * cs + cs / 2} cy={pad.t + Math.floor(i / cols) * cs + cs / 2} r={cs * 0.38} fill={i < v ? el.series[0]?.color : o.gridColor} />
    ));
  }

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      {gridLines}
      {body}
      {legend}
    </svg>
  );
}

export function pieColor(el: ChartEl, i: number) {
  const base = el.series[0]?.color ?? '#7d5cff';
  const palette = [base, ...el.series.slice(1).map((s) => s.color), '#22b8cf', '#ff8a4c', '#f06595', '#51cf66', '#fcc419', '#495057', '#845ef7'];
  return palette[i % palette.length];
}

function arcPath(cx: number, cy: number, r: number, inner: number, a0: number, a1: number) {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (rr: number, a: number) => `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
  if (inner <= 0) return `M${cx},${cy} L${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} Z`;
  return `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(inner, a1)} A${inner},${inner} 0 ${large} 0 ${p(inner, a0)} Z`;
}

function smoothPath(pts: readonly (readonly [number, number])[]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
