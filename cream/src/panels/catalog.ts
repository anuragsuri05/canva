// Static catalogues for the Elements panel: lines, gradients, charts, frames, grids, tables, mockups.
import type { ChartType, Fill, FrameShape, LineEl } from '../model/types';
import { GRID_LAYOUTS } from '../model/defaults';

export interface LinePreset {
  id: string;
  label: string;
  opts: Partial<LineEl>;
  bend?: boolean; // endpoints offset vertically (connectors)
  thick?: number;
}

export const LINE_PRESETS: LinePreset[] = [
  { id: 'line', label: 'Line', opts: {} },
  { id: 'dashed', label: 'Dashed line', opts: { style: 'dashed' } },
  { id: 'dotted', label: 'Dotted line', opts: { style: 'dotted', rounded: true } },
  { id: 'arrow', label: 'Arrow', opts: { endCap: 'arrow' } },
  { id: 'double-arrow', label: 'Double arrow', opts: { startCap: 'arrow', endCap: 'arrow' } },
  { id: 'triangle-arrow', label: 'Solid arrow', opts: { endCap: 'triangle' } },
  { id: 'dashed-arrow', label: 'Dashed arrow', opts: { style: 'dashed', endCap: 'triangle' } },
  { id: 'circle-ends', label: 'Line with dots', opts: { startCap: 'circle', endCap: 'circle' } },
  { id: 'circle-outline', label: 'Pin line', opts: { startCap: 'circle-outline', endCap: 'arrow' } },
  { id: 'diamond', label: 'Diamond end', opts: { startCap: 'diamond', endCap: 'diamond' } },
  { id: 'bar', label: 'Dimension line', opts: { startCap: 'bar', endCap: 'bar' } },
  { id: 'thick', label: 'Thick line', opts: { rounded: true }, thick: 3 },
  { id: 'elbow', label: 'Elbow connector', opts: { lineType: 'elbow', endCap: 'triangle' }, bend: true },
  { id: 'curve', label: 'Curved connector', opts: { lineType: 'curve', endCap: 'triangle' }, bend: true },
  { id: 'elbow-plain', label: 'Elbow line', opts: { lineType: 'elbow' }, bend: true },
  { id: 'curve-plain', label: 'Curved line', opts: { lineType: 'curve' }, bend: true },
];

const lin = (angle: number, ...colors: string[]): Fill => ({
  kind: 'gradient',
  type: 'linear',
  angle,
  stops: colors.map((color, i) => ({ color, pos: i / Math.max(1, colors.length - 1) })),
});
const rad = (...colors: string[]): Fill => ({
  kind: 'gradient',
  type: 'radial',
  angle: 0,
  stops: colors.map((color, i) => ({ color, pos: i / Math.max(1, colors.length - 1) })),
});

export const GRADIENTS: { name: string; fill: Fill }[] = [
  { name: 'Sunset', fill: lin(135, '#ffb37a', '#e2557a', '#8b3dff') },
  { name: 'Peach', fill: lin(90, '#ffecd2', '#fcb69f') },
  { name: 'Ocean', fill: lin(135, '#2e3192', '#1bffff') },
  { name: 'Mint', fill: lin(135, '#d4fc79', '#96e6a1') },
  { name: 'Lavender', fill: lin(180, '#e0c3fc', '#8ec5fc') },
  { name: 'Fire', fill: lin(45, '#f83600', '#f9d423') },
  { name: 'Night', fill: lin(160, '#0f2027', '#203a43', '#2c5364') },
  { name: 'Candy', fill: lin(120, '#ff9a9e', '#fecfef') },
  { name: 'Aqua', fill: lin(90, '#13547a', '#80d0c7') },
  { name: 'Grape', fill: lin(135, '#667eea', '#764ba2') },
  { name: 'Lemon', fill: lin(90, '#fddb92', '#d1fdff') },
  { name: 'Forest', fill: lin(135, '#134e5e', '#71b280') },
  { name: 'Rose', fill: lin(45, '#ee9ca7', '#ffdde1') },
  { name: 'Steel', fill: lin(180, '#bdc3c7', '#2c3e50') },
  { name: 'Neon', fill: lin(90, '#00f260', '#0575e6') },
  { name: 'Mango', fill: lin(135, '#ffe259', '#ffa751') },
  { name: 'Glow', fill: rad('#fff6b7', '#f6416c') },
  { name: 'Halo', fill: rad('#ffffff', '#a1c4fd') },
  { name: 'Orb', fill: rad('#c471f5', '#fa71cd', '#2b2140') },
  { name: 'Dusk', fill: lin(200, '#fa709a', '#fee140') },
  { name: 'Sky', fill: lin(180, '#a1c4fd', '#c2e9fb') },
  { name: 'Berry', fill: lin(135, '#8e2de2', '#4a00e0') },
  { name: 'Coral', fill: lin(90, '#ff7e5f', '#feb47b') },
  { name: 'Ink', fill: lin(135, '#232526', '#414345') },
];

export const CHARTS: { type: ChartType; label: string; keywords?: string }[] = [
  { type: 'bar', label: 'Bar chart', keywords: 'horizontal' },
  { type: 'column', label: 'Column chart', keywords: 'vertical bar' },
  { type: 'stacked-column', label: 'Stacked column', keywords: 'bar stack' },
  { type: 'line', label: 'Line chart', keywords: 'trend' },
  { type: 'area', label: 'Area chart', keywords: 'trend fill' },
  { type: 'pie', label: 'Pie chart', keywords: 'share percentage' },
  { type: 'donut', label: 'Donut chart', keywords: 'doughnut ring pie' },
  { type: 'scatter', label: 'Scatter plot', keywords: 'bubble dots' },
  { type: 'radar', label: 'Radar chart', keywords: 'spider' },
  { type: 'funnel', label: 'Funnel', keywords: 'pipeline' },
  { type: 'pictogram', label: 'Pictogram', keywords: 'icon infographic' },
  { type: 'progress-bar', label: 'Progress bar', keywords: 'percentage' },
  { type: 'progress-ring', label: 'Progress ring', keywords: 'dial percentage circle' },
  { type: 'number', label: 'Number', keywords: 'stat kpi big' },
];

export const FRAMES: { shape: FrameShape; label: string }[] = [
  { shape: 'rect', label: 'Square frame' },
  { shape: 'rounded', label: 'Rounded frame' },
  { shape: 'circle', label: 'Circle frame' },
  { shape: 'triangle', label: 'Triangle frame' },
  { shape: 'hexagon', label: 'Hexagon frame' },
  { shape: 'star', label: 'Star frame' },
  { shape: 'heart', label: 'Heart frame' },
  { shape: 'diamond', label: 'Diamond frame' },
  { shape: 'arch', label: 'Arch frame' },
  { shape: 'blob', label: 'Blob frame' },
  { shape: 'polaroid', label: 'Polaroid frame' },
  { shape: 'film', label: 'Film frame' },
  { shape: 'phone', label: 'Phone frame' },
  { shape: 'laptop', label: 'Laptop frame' },
  { shape: 'browser', label: 'Browser frame' },
];

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const MOCKUPS: { shape: FrameShape; label: string }[] = [
  { shape: 'phone', label: 'Smartphone' },
  { shape: 'laptop', label: 'Laptop' },
  { shape: 'browser', label: 'Browser window' },
  { shape: 'polaroid', label: 'Polaroid print' },
  { shape: 'film', label: 'Film strip' },
];

export const GRIDS = Object.keys(GRID_LAYOUTS);
export const gridLabel = (k: string) => {
  const l = GRID_LAYOUTS[k];
  return `${l.areas.length} cell grid (${k})`;
};

export const TABLE_PRESETS: [number, number][] = [
  [2, 2], [2, 3], [3, 2], [3, 3], [3, 4], [4, 3], [4, 4], [4, 5], [5, 4], [5, 5], [6, 3], [2, 5],
];

export const matches = (q: string, ...hay: (string | undefined)[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const text = hay.join(' ').toLowerCase();
  return s.split(/\s+/).every((w) => text.includes(w));
};
