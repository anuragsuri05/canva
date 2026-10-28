import type { ShapeKind, FrameShape } from '../model/types';

const poly = (pts: [number, number][]) => 'M' + pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L') + ' Z';

function regular(n: number, w: number, h: number, rot = -90) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    pts.push([w / 2 + (w / 2) * Math.cos(a), h / 2 + (h / 2) * Math.sin(a)]);
  }
  return poly(pts);
}

function star(n: number, w: number, h: number, inner = 0.45) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    pts.push([w / 2 + (w / 2) * r * Math.cos(a), h / 2 + (h / 2) * r * Math.sin(a)]);
  }
  return poly(pts);
}

function roundedRect(w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${r},0 H${w - r} A${r},${r} 0 0 1 ${w},${r} V${h - r} A${r},${r} 0 0 1 ${w - r},${h} H${r} A${r},${r} 0 0 1 0,${h - r} V${r} A${r},${r} 0 0 1 ${r},0 Z`;
}

/** SVG path for a shape filling a w×h box. */
export function shapePath(kind: ShapeKind | FrameShape | string, w: number, h: number, radius = 0): string {
  switch (kind) {
    case 'rect':
      return radius ? roundedRect(w, h, radius) : `M0,0 H${w} V${h} H0 Z`;
    case 'rounded':
      return roundedRect(w, h, radius || Math.min(w, h) * 0.15);
    case 'circle':
      return `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2},${h} A${w / 2},${h / 2} 0 1 1 ${w / 2},0 Z`;
    case 'triangle':
      return poly([[w / 2, 0], [w, h], [0, h]]);
    case 'right-triangle':
      return poly([[0, 0], [w, h], [0, h]]);
    case 'diamond':
      return poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case 'pentagon':
      return regular(5, w, h);
    case 'hexagon':
      return regular(6, w, h, 0);
    case 'octagon':
      return regular(8, w, h, 22.5);
    case 'star5':
    case 'star':
      return star(5, w, h, 0.42);
    case 'star4':
      return star(4, w, h, 0.38);
    case 'star6':
      return star(6, w, h, 0.55);
    case 'starburst':
      return star(16, w, h, 0.78);
    case 'heart':
      return `M${w / 2},${h * 0.92} C${w * 0.1},${h * 0.62} ${-w * 0.05},${h * 0.3} ${w * 0.18},${h * 0.1} C${w * 0.33},${-h * 0.02} ${w * 0.47},${h * 0.08} ${w / 2},${h * 0.22} C${w * 0.53},${h * 0.08} ${w * 0.67},${-h * 0.02} ${w * 0.82},${h * 0.1} C${w * 1.05},${h * 0.3} ${w * 0.9},${h * 0.62} ${w / 2},${h * 0.92} Z`;
    case 'arrow-right':
      return poly([[0, h * 0.3], [w * 0.6, h * 0.3], [w * 0.6, 0], [w, h / 2], [w * 0.6, h], [w * 0.6, h * 0.7], [0, h * 0.7]]);
    case 'arrow-left':
      return poly([[w, h * 0.3], [w * 0.4, h * 0.3], [w * 0.4, 0], [0, h / 2], [w * 0.4, h], [w * 0.4, h * 0.7], [w, h * 0.7]]);
    case 'arrow-up':
      return poly([[w * 0.3, h], [w * 0.3, h * 0.4], [0, h * 0.4], [w / 2, 0], [w, h * 0.4], [w * 0.7, h * 0.4], [w * 0.7, h]]);
    case 'arrow-down':
      return poly([[w * 0.3, 0], [w * 0.3, h * 0.6], [0, h * 0.6], [w / 2, h], [w, h * 0.6], [w * 0.7, h * 0.6], [w * 0.7, 0]]);
    case 'arrow-double':
      return poly([[0, h / 2], [w * 0.25, 0], [w * 0.25, h * 0.3], [w * 0.75, h * 0.3], [w * 0.75, 0], [w, h / 2], [w * 0.75, h], [w * 0.75, h * 0.7], [w * 0.25, h * 0.7], [w * 0.25, h]]);
    case 'chevron':
      return poly([[0, 0], [w * 0.7, 0], [w, h / 2], [w * 0.7, h], [0, h], [w * 0.3, h / 2]]);
    case 'parallelogram':
      return poly([[w * 0.25, 0], [w, 0], [w * 0.75, h], [0, h]]);
    case 'trapezoid':
      return poly([[w * 0.2, 0], [w * 0.8, 0], [w, h], [0, h]]);
    case 'cross':
      return poly([[w * 0.35, 0], [w * 0.65, 0], [w * 0.65, h * 0.35], [w, h * 0.35], [w, h * 0.65], [w * 0.65, h * 0.65], [w * 0.65, h], [w * 0.35, h], [w * 0.35, h * 0.65], [0, h * 0.65], [0, h * 0.35], [w * 0.35, h * 0.35]]);
    case 'speech':
      return `M0,0 H${w} V${h * 0.75} H${w * 0.35} L${w * 0.15},${h} L${w * 0.2},${h * 0.75} H0 Z`;
    case 'speech-round':
      return `M${w / 2},0 C${w * 0.95},0 ${w},${h * 0.2} ${w},${h * 0.38} C${w},${h * 0.58} ${w * 0.8},${h * 0.76} ${w / 2},${h * 0.76} C${w * 0.4},${h * 0.76} ${w * 0.32},${h * 0.75} ${w * 0.25},${h * 0.72} L${w * 0.08},${h} L${w * 0.13},${h * 0.65} C${w * 0.04},${h * 0.58} 0,${h * 0.48} 0,${h * 0.38} C0,${h * 0.2} ${w * 0.05},0 ${w / 2},0 Z`;
    case 'cloud':
      return `M${w * 0.25},${h * 0.85} C${w * 0.05},${h * 0.85} 0,${h * 0.6} ${w * 0.15},${h * 0.5} C${w * 0.05},${h * 0.3} ${w * 0.25},${h * 0.15} ${w * 0.4},${h * 0.25} C${w * 0.45},${h * 0.05} ${w * 0.75},${h * 0.05} ${w * 0.75},${h * 0.3} C${w * 0.95},${h * 0.25} ${w},${h * 0.55} ${w * 0.85},${h * 0.65} C${w * 0.95},${h * 0.85} ${w * 0.75},${h * 0.9} ${w * 0.7},${h * 0.85} Z`;
    case 'blob':
    case 'blob1':
      return `M${w * 0.5},${h * 0.02} C${w * 0.8},${h * 0.0} ${w * 1.0},${h * 0.25} ${w * 0.97},${h * 0.52} C${w * 0.95},${h * 0.8} ${w * 0.72},${h * 1.0} ${w * 0.45},${h * 0.97} C${w * 0.18},${h * 0.95} ${w * 0.0},${h * 0.72} ${w * 0.03},${h * 0.45} C${w * 0.06},${h * 0.2} ${w * 0.25},${h * 0.04} ${w * 0.5},${h * 0.02} Z`;
    case 'blob2':
      return `M${w * 0.55},${h * 0.0} C${w * 0.9},${h * 0.05} ${w * 1.0},${h * 0.4} ${w * 0.9},${h * 0.65} C${w * 0.8},${h * 0.95} ${w * 0.45},${h * 1.0} ${w * 0.22},${h * 0.85} C${w * 0.0},${h * 0.7} ${w * 0.05},${h * 0.35} ${w * 0.2},${h * 0.15} C${w * 0.3},${h * 0.03} ${w * 0.42},${h * -0.01} ${w * 0.55},${h * 0.0} Z`;
    case 'blob3':
      return `M${w * 0.4},${h * 0.03} C${w * 0.65},${h * -0.03} ${w * 0.75},${h * 0.2} ${w * 0.9},${h * 0.3} C${w * 1.05},${h * 0.45} ${w * 0.95},${h * 0.8} ${w * 0.7},${h * 0.92} C${w * 0.45},${h * 1.03} ${w * 0.15},${h * 0.95} ${w * 0.05},${h * 0.7} C${w * -0.05},${h * 0.45} ${w * 0.12},${h * 0.1} ${w * 0.4},${h * 0.03} Z`;
    case 'ring': {
      const t = Math.min(w, h) * 0.18;
      return `${shapePath('circle', w, h)} M${w / 2},${t} A${w / 2 - t},${h / 2 - t} 0 1 0 ${w / 2},${h - t} A${w / 2 - t},${h / 2 - t} 0 1 0 ${w / 2},${t} Z`;
    }
    case 'half-circle':
      return `M0,${h} A${w / 2},${h} 0 0 1 ${w},${h} Z`;
    case 'quarter-circle':
      return `M0,${h} V0 A${w},${h} 0 0 1 ${w},${h} Z`;
    case 'arch':
      return `M0,${h} V${w / 2} A${w / 2},${w / 2} 0 0 1 ${w},${w / 2} V${h} Z`;
    case 'cylinder':
      return `M0,${h * 0.12} A${w / 2},${h * 0.12} 0 0 1 ${w},${h * 0.12} V${h * 0.88} A${w / 2},${h * 0.12} 0 0 1 0,${h * 0.88} Z`;
    case 'cube':
      return poly([[w * 0.25, 0], [w, 0], [w, h * 0.75], [w * 0.75, h], [0, h], [0, h * 0.25]]);
    default:
      return `M0,0 H${w} V${h} H0 Z`;
  }
}

export const SHAPE_LIST: { kind: ShapeKind; label: string }[] = [
  { kind: 'rect', label: 'Square' },
  { kind: 'rounded', label: 'Rounded square' },
  { kind: 'circle', label: 'Circle' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'right-triangle', label: 'Right triangle' },
  { kind: 'diamond', label: 'Diamond' },
  { kind: 'pentagon', label: 'Pentagon' },
  { kind: 'hexagon', label: 'Hexagon' },
  { kind: 'octagon', label: 'Octagon' },
  { kind: 'star5', label: 'Star' },
  { kind: 'star4', label: '4-point star' },
  { kind: 'star6', label: '6-point star' },
  { kind: 'starburst', label: 'Starburst' },
  { kind: 'heart', label: 'Heart' },
  { kind: 'arrow-right', label: 'Arrow right' },
  { kind: 'arrow-left', label: 'Arrow left' },
  { kind: 'arrow-up', label: 'Arrow up' },
  { kind: 'arrow-down', label: 'Arrow down' },
  { kind: 'arrow-double', label: 'Double arrow' },
  { kind: 'chevron', label: 'Chevron' },
  { kind: 'parallelogram', label: 'Parallelogram' },
  { kind: 'trapezoid', label: 'Trapezoid' },
  { kind: 'cross', label: 'Cross' },
  { kind: 'speech', label: 'Speech bubble' },
  { kind: 'speech-round', label: 'Round speech bubble' },
  { kind: 'cloud', label: 'Cloud' },
  { kind: 'blob1', label: 'Blob 1' },
  { kind: 'blob2', label: 'Blob 2' },
  { kind: 'blob3', label: 'Blob 3' },
  { kind: 'ring', label: 'Ring' },
  { kind: 'half-circle', label: 'Half circle' },
  { kind: 'quarter-circle', label: 'Quarter circle' },
  { kind: 'arch', label: 'Arch' },
  { kind: 'cylinder', label: 'Cylinder' },
  { kind: 'cube', label: 'Cube' },
];
