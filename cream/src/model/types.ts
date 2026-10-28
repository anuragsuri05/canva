// Core document model for Cream. Every module (renderer, editor, export, AI, templates)
// reads and writes these shapes, so changes here ripple everywhere.

export type ID = string;

export type Unit = 'px' | 'in' | 'mm' | 'cm';

export type DesignCategory =
  | 'presentation'
  | 'social'
  | 'video'
  | 'print'
  | 'doc'
  | 'whiteboard'
  | 'website'
  | 'email'
  | 'custom';

export interface GradientStop {
  color: string;
  pos: number; // 0..1
}

export type Fill =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; type: 'linear' | 'radial'; angle: number; stops: GradientStop[] }
  | { kind: 'image'; src: string; fit?: 'cover' | 'contain' | 'tile'; opacity?: number };

export interface Stroke {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export type AnimTarget = 'enter' | 'exit' | 'both';

export interface Anim {
  name: string; // e.g. 'rise', 'fade', 'typewriter' — see render/animation.ts
  duration: number; // seconds (intro)
  on: AnimTarget;
  direction?: 'up' | 'down' | 'left' | 'right';
  by?: 'element' | 'line' | 'word' | 'letter';
  emphasis?: string; // looping emphasis effect (pulse, wiggle, ...)
  path?: { x: number; y: number }[]; // custom motion path (relative px)
  pathStyle?: 'original' | 'smooth' | 'steady';
  orientToPath?: boolean;
}

export interface Transition {
  type: 'none' | 'dissolve' | 'slide' | 'circle-wipe' | 'line-wipe' | 'color-wipe' | 'flow' | 'stack' | 'match-move' | 'zoom';
  duration: number; // seconds, 0.1..2.5
  direction?: 'up' | 'down' | 'left' | 'right';
}

export type LockMode = 'full' | 'position';

export interface ElBase {
  id: ID;
  type: ElementType;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  opacity: number; // 0..1
  locked?: LockMode;
  flipX?: boolean;
  flipY?: boolean;
  link?: string;
  alt?: string;
  decorative?: boolean;
  groupId?: ID;
  anim?: Anim;
  hidden?: boolean;
  timing?: { start: number; end: number }; // seconds within page ("Show timing")
  brandLocked?: boolean; // locked by a brand template
}

export type TextEffectKind =
  | 'none'
  | 'shadow'
  | 'lift'
  | 'hollow'
  | 'splice'
  | 'echo'
  | 'glitch'
  | 'neon'
  | 'background'
  | 'outline';

export interface TextEffect {
  kind: TextEffectKind;
  offset?: number; // 0..100
  direction?: number; // degrees
  blur?: number; // 0..100
  transparency?: number; // 0..100
  color?: string;
  thickness?: number; // 0..100
  intensity?: number; // 0..100
  roundness?: number; // 0..100
  spread?: number; // 0..100
  scheme?: 'blue-red' | 'cyan-magenta';
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  gradient?: Fill; // gradient text fill overrides color
  align: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number; // multiplier
  letterSpacing: number; // in 1/1000 em (Canva style)
  uppercase: boolean;
  list?: 'bullet' | 'number';
  anchor?: 'top' | 'middle' | 'bottom';
}

export interface TextEl extends ElBase, TextStyle {
  type: 'text';
  html: string; // sanitized inline rich text (b/i/u/s/span style/br/div/li)
  effect?: TextEffect;
  curve?: number; // -100..100, 0 = straight
  autoHeight?: boolean; // default true: height follows content
  role?: 'heading' | 'subheading' | 'body';
  dynamic?: 'page-number' | 'date' | 'page-count';
}

export interface ImageFilters {
  brightness: number; // -100..100
  contrast: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  clarity: number;
  sharpness: number;
  vignette: number; // 0..100
  blur: number; // 0..100
  fade: number;
}

export interface ImageShadow {
  kind: 'none' | 'glow' | 'drop' | 'angled' | 'page-lift' | 'curved' | 'backdrop';
  offset: number;
  direction: number;
  blur: number;
  size: number;
  color: string;
  transparency: number;
}

export interface Credit {
  title?: string;
  creator?: string;
  creatorUrl?: string;
  license?: string;
  licenseUrl?: string;
  source?: string; // 'openverse' | 'wikimedia' | 'iconify' | 'pollinations' | 'upload' ...
  landingUrl?: string;
}

export interface ImageEl extends ElBase {
  type: 'image';
  src: string; // http(s) url, data: url, or 'asset:<id>' (IndexedDB blob)
  naturalW: number;
  naturalH: number;
  crop?: { x: number; y: number; w: number; h: number }; // fractions of natural image (0..1)
  filters?: Partial<ImageFilters>;
  preset?: string; // filter preset name
  presetIntensity?: number; // 0..100
  duotone?: { highlight: string; shadow: string; intensity: number };
  effectBlur?: number;
  border?: Stroke;
  radius?: number; // corner rounding px
  shadow?: ImageShadow;
  credit?: Credit;
  bgRemoved?: boolean;
  originalSrc?: string; // before background removal / magic edits
}

export type ShapeKind =
  | 'rect'
  | 'rounded'
  | 'circle'
  | 'triangle'
  | 'right-triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star5'
  | 'star4'
  | 'star6'
  | 'starburst'
  | 'heart'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-double'
  | 'chevron'
  | 'parallelogram'
  | 'trapezoid'
  | 'cross'
  | 'speech'
  | 'speech-round'
  | 'cloud'
  | 'blob1'
  | 'blob2'
  | 'blob3'
  | 'ring'
  | 'half-circle'
  | 'quarter-circle'
  | 'arch'
  | 'cylinder'
  | 'cube';

export interface ShapeEl extends ElBase, Partial<TextStyle> {
  type: 'shape';
  shape: ShapeKind;
  fill: Fill;
  stroke?: Stroke;
  radius?: number;
  html?: string; // optional text inside the shape
}

export type LineCap = 'none' | 'arrow' | 'triangle' | 'circle' | 'square' | 'bar' | 'diamond' | 'circle-outline';

export interface LineEl extends ElBase {
  type: 'line';
  // Endpoints are absolute page coordinates; x/y/w/h are kept as the bounding box.
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  rounded?: boolean;
  startCap: LineCap;
  endCap: LineCap;
  lineType: 'straight' | 'elbow' | 'curve';
  startConnect?: ID; // connected element id (whiteboard connectors)
  endConnect?: ID;
}

export interface SvgEl extends ElBase {
  type: 'svg';
  svg: string; // full <svg> markup
  colorMap?: Record<string, string>; // original color -> replacement
  credit?: Credit;
  keepRatio?: boolean;
}

export interface VideoEl extends ElBase {
  type: 'video';
  src: string;
  poster?: string;
  duration: number; // seconds of source
  trimStart: number;
  trimEnd: number; // seconds (exclusive)
  volume: number; // 0..1
  loop: boolean;
  autoplay: boolean;
  speed: number; // 0.25..2
  radius?: number;
  crop?: { x: number; y: number; w: number; h: number };
  filters?: Partial<ImageFilters>;
  credit?: Credit;
  naturalW: number;
  naturalH: number;
}

export type ChartType =
  | 'bar'
  | 'column'
  | 'stacked-column'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'progress-bar'
  | 'progress-ring'
  | 'number'
  | 'funnel'
  | 'pictogram';

export interface ChartSeries {
  name: string;
  values: number[];
  color: string;
}

export interface ChartEl extends ElBase {
  type: 'chart';
  chartType: ChartType;
  labels: string[];
  series: ChartSeries[];
  options: {
    legend: boolean;
    labels: boolean; // axis labels
    grid: boolean;
    values: boolean;
    smooth: boolean;
    points: boolean;
    lineWeight: number;
    spacing: number; // 0..100 bar gap
    rounding: number;
    fontFamily: string;
    fontSize: number;
    textColor: string;
    gridColor: string;
    max?: number;
    suffix?: string;
  };
}

export interface TableCell {
  html: string;
  fill?: string;
  colspan?: number;
  rowspan?: number;
  hidden?: boolean; // covered by a merge
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface TableEl extends ElBase {
  type: 'table';
  colWidths: number[]; // fractions summing to 1
  rowHeights: number[]; // min heights px
  cells: TableCell[][];
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
  cellPadding: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  headerFill?: string;
}

export type FrameShape =
  | 'rect'
  | 'rounded'
  | 'circle'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'heart'
  | 'diamond'
  | 'arch'
  | 'blob'
  | 'polaroid'
  | 'phone'
  | 'laptop'
  | 'browser'
  | 'film'
  | 'letter';

export interface MediaFit {
  src?: string;
  kind?: 'image' | 'video';
  naturalW?: number;
  naturalH?: number;
  scale: number; // >= 1 (cover by default)
  offsetX: number; // -0.5..0.5 fraction of overflow
  offsetY: number;
  fill?: string;
  credit?: Credit;
}

export interface FrameEl extends ElBase {
  type: 'frame';
  frameShape: FrameShape;
  letter?: string;
  media: MediaFit;
  border?: Stroke;
}

export interface GridEl extends ElBase {
  type: 'grid';
  layout: string; // e.g. '2x2', '1-2', '3x1', custom template id
  gap: number;
  radius: number;
  cells: MediaFit[];
}

export interface StickyEl extends ElBase {
  type: 'sticky';
  html: string;
  color: string;
  author?: string;
  fontSize: number;
  reactions?: Record<string, number>;
}

export interface DrawPath {
  d: string; // SVG path in element-local coordinates (relative to original box)
  color: string;
  width: number;
  opacity: number;
  tool: 'pen' | 'marker' | 'highlighter' | 'glow';
}

export interface DrawEl extends ElBase {
  type: 'draw';
  paths: DrawPath[];
  vbW: number; // original viewBox width/height (paths scale with element)
  vbH: number;
}

export interface EmbedEl extends ElBase {
  type: 'embed';
  url?: string; // e.g. YouTube / maps embed url
  html?: string; // Cream Code widget (rendered in sandboxed iframe srcdoc)
  title?: string;
  poster?: string; // static image for export
}

export type ElementType =
  | 'text'
  | 'image'
  | 'shape'
  | 'line'
  | 'svg'
  | 'video'
  | 'chart'
  | 'table'
  | 'frame'
  | 'grid'
  | 'sticky'
  | 'draw'
  | 'embed';

export type El =
  | TextEl
  | ImageEl
  | ShapeEl
  | LineEl
  | SvgEl
  | VideoEl
  | ChartEl
  | TableEl
  | FrameEl
  | GridEl
  | StickyEl
  | DrawEl
  | EmbedEl;

export interface Page {
  id: ID;
  title?: string;
  background: Fill;
  backgroundImage?: { src: string; filters?: Partial<ImageFilters>; credit?: Credit }; // "Set image as background"
  elements: El[];
  notes: string;
  hidden?: boolean;
  locked?: boolean;
  duration: number; // seconds (video/autoplay)
  transition?: Transition;
  pageAnim?: Anim; // page-level animation (applies to all elements)
  height?: number; // per-page height override (docs / websites)
}

export interface AudioTrack {
  id: ID;
  src: string;
  title: string;
  start: number; // seconds into design timeline
  trimStart: number;
  duration: number; // played length seconds
  sourceDuration: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  credit?: Credit;
  beatSync?: boolean;
}

export interface CommentReply {
  id: ID;
  author: string;
  text: string;
  createdAt: number;
}

export interface Comment {
  id: ID;
  pageId: ID;
  elId?: ID;
  x?: number;
  y?: number;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  assignee?: string;
  replies: CommentReply[];
  reactions?: Record<string, number>;
}

export interface Design {
  id: ID;
  title: string;
  category: DesignCategory;
  preset: string; // preset id from model/presets.ts
  width: number; // px
  height: number; // px
  unit: Unit;
  pages: Page[];
  audio: AudioTrack[];
  comments: Comment[];
  createdAt: number;
  updatedAt: number;
  openedAt: number;
  starred: boolean;
  folderId: ID | null;
  trashedAt: number | null;
  brandKitId?: ID;
  offline?: boolean;
  isBrandTemplate?: boolean;
  approval?: { status: 'none' | 'pending' | 'approved' | 'changes'; reviewer?: string; notes?: string; due?: string };
  share?: { access: 'private' | 'team' | 'link'; role: 'view' | 'comment' | 'edit'; people: { name: string; role: 'view' | 'comment' | 'edit' }[] };
  website?: { published: boolean; slug: string; nav: boolean; seoTitle?: string; seoDescription?: string; password?: string; favicon?: string };
  settings?: { rulers?: boolean; margins?: boolean; bleed?: boolean; guides?: { axis: 'x' | 'y'; pos: number }[]; snap?: boolean };
}

export interface DesignVersion {
  id: ID;
  designId: ID;
  createdAt: number;
  label?: string;
  snapshot: Design;
}

export interface Folder {
  id: ID;
  name: string;
  parentId: ID | null;
  createdAt: number;
  starred: boolean;
  trashedAt: number | null;
  color?: string;
}

export type AssetKind = 'image' | 'video' | 'audio' | 'font';

export interface Asset {
  id: ID;
  kind: AssetKind;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
  width?: number;
  height?: number;
  duration?: number;
  trashedAt: number | null;
  folderId?: ID | null;
  fontFamily?: string; // for uploaded fonts
}

export interface BrandFontRole {
  family: string;
  size: number;
  weight: number;
}

export interface BrandKit {
  id: ID;
  name: string;
  logos: string[]; // srcs (asset:<id> or url)
  palettes: { id: ID; name: string; colors: string[] }[];
  fonts: { heading: BrandFontRole; subheading: BrandFontRole; body: BrandFontRole; extra: BrandFontRole[] };
  voice: string;
  photos: string[];
  graphics: string[];
  icons: string[];
  guidelines: string;
  createdAt: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  userName: string;
  userEmail: string;
  highContrast: boolean;
  reduceMotion: boolean;
  language: string;
  plan: 'free' | 'pro' | 'business'; // cosmetic: everything is unlocked locally
  pinnedNav: string[];
  editorTabs: string[];
  downloadDefaults?: Record<string, unknown>;
  ai?: AISettings;
}

export interface AISettings {
  provider: 'anthropic' | 'openai' | 'gemini' | 'none';
  keys: Partial<Record<'anthropic' | 'openai' | 'gemini' | 'pollinations', string>>;
  models: Partial<Record<'anthropic' | 'openai' | 'gemini', string>>;
  remember: boolean;
  memory?: string; // "About me" / living memory
}

export interface Notification {
  id: ID;
  text: string;
  createdAt: number;
  read: boolean;
  designId?: ID;
}
