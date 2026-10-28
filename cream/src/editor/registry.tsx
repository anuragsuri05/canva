import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Modal, RightPanel, SidePanel } from '../store/editor';

type L = LazyExoticComponent<ComponentType<any>>;

export interface SideTab {
  id: Exclude<SidePanel, null>;
  label: string;
  icon: string;
  component: L;
}

export const SIDE_TABS: SideTab[] = [
  { id: 'design', label: 'Design', icon: 'LayoutTemplate', component: lazy(() => import('../templates/DesignPanel')) },
  { id: 'elements', label: 'Elements', icon: 'Shapes', component: lazy(() => import('../panels/ElementsPanel')) },
  { id: 'text', label: 'Text', icon: 'Type', component: lazy(() => import('../panels/TextPanel')) },
  { id: 'brand', label: 'Brand', icon: 'Crown', component: lazy(() => import('../brand/BrandPanel')) },
  { id: 'uploads', label: 'Uploads', icon: 'CloudUpload', component: lazy(() => import('../panels/UploadsPanel')) },
  { id: 'draw', label: 'Draw', icon: 'PenTool', component: lazy(() => import('../panels/DrawPanel')) },
  { id: 'projects', label: 'Projects', icon: 'FolderOpen', component: lazy(() => import('../panels/ProjectsPanel')) },
  { id: 'apps', label: 'Apps', icon: 'LayoutGrid', component: lazy(() => import('../panels/AppsPanel')) },
  { id: 'ai', label: 'Cream AI', icon: 'Sparkles', component: lazy(() => import('../ai/AIPanel')) },
  // Optional tabs (added from Apps, shown in rail when opened)
  { id: 'photos', label: 'Photos', icon: 'Image', component: lazy(() => import('../panels/PhotosPanel')) },
  { id: 'videos', label: 'Videos', icon: 'Film', component: lazy(() => import('../panels/VideosPanel')) },
  { id: 'audio', label: 'Audio', icon: 'Music', component: lazy(() => import('../panels/AudioPanel')) },
  { id: 'charts', label: 'Charts', icon: 'BarChart3', component: lazy(() => import('../panels/ChartsPanel')) },
  { id: 'magic-media', label: 'Magic Media', icon: 'Wand2', component: lazy(() => import('../ai/MagicMediaPanel')) },
  { id: 'backgrounds', label: 'Backgrounds', icon: 'Wallpaper', component: lazy(() => import('../panels/BackgroundsPanel')) },
  { id: 'styles', label: 'Styles', icon: 'Palette', component: lazy(() => import('../templates/StylesPanel')) },
  { id: 'logos', label: 'Logos', icon: 'Hexagon', component: lazy(() => import('../brand/LogosPanel')) },
  { id: 'stickies', label: 'Sticky notes', icon: 'StickyNote', component: lazy(() => import('../panels/StickiesPanel')) },
];

export const RIGHT_PANELS: Record<Exclude<RightPanel, null>, { title: string; component: L }> = {
  position: { title: 'Position', component: lazy(() => import('../toolbar/PositionPanel')) },
  animate: { title: 'Animate', component: lazy(() => import('../toolbar/AnimatePanel')) },
  transition: { title: 'Transition', component: lazy(() => import('../toolbar/TransitionPanel')) },
  'text-effects': { title: 'Effects', component: lazy(() => import('../toolbar/TextEffectsPanel')) },
  'edit-image': { title: 'Edit', component: lazy(() => import('../toolbar/ImageEditPanel')) },
  color: { title: 'Color', component: lazy(() => import('../toolbar/ColorPanel')) },
  font: { title: 'Font', component: lazy(() => import('../toolbar/FontPanel')) },
  'chart-data': { title: 'Chart', component: lazy(() => import('../toolbar/ChartDataPanel')) },
  table: { title: 'Table', component: lazy(() => import('../toolbar/TablePanel')) },
  video: { title: 'Video', component: lazy(() => import('../toolbar/VideoPanel')) },
  audio: { title: 'Audio', component: lazy(() => import('../toolbar/AudioTrackPanel')) },
  comments: { title: 'Comments', component: lazy(() => import('../collab/CommentsPanel')) },
  versions: { title: 'Version history', component: lazy(() => import('../collab/VersionsPanel')) },
  accessibility: { title: 'Design accessibility', component: lazy(() => import('../collab/AccessibilityPanel')) },
  'find-replace': { title: 'Find and replace', component: lazy(() => import('../collab/FindReplacePanel')) },
  notes: { title: 'Notes', component: lazy(() => import('../collab/NotesPanel')) },
  timer: { title: 'Timer', component: lazy(() => import('../collab/TimerPanel')) },
  insights: { title: 'Insights', component: lazy(() => import('../collab/InsightsPanel')) },
  'magic-write': { title: 'Magic Write', component: lazy(() => import('../ai/MagicWritePanel')) },
  translate: { title: 'Translate', component: lazy(() => import('../ai/TranslatePanel')) },
};

export const MODALS: Partial<Record<Exclude<Modal, null>, L>> = {
  share: lazy(() => import('../export/ShareModal')),
  download: lazy(() => import('../export/DownloadModal')),
  resize: lazy(() => import('../export/ResizeModal')),
  print: lazy(() => import('../export/PrintModal')),
  'present-record': lazy(() => import('../present/RecordModal')),
  'publish-website': lazy(() => import('../export/PublishModal')),
  schedule: lazy(() => import('../export/ScheduleModal')),
  embed: lazy(() => import('../export/EmbedModal')),
  'brand-template': lazy(() => import('../export/BrandTemplateModal')),
  'request-approval': lazy(() => import('../export/ApprovalModal')),
  link: lazy(() => import('../toolbar/LinkModal')),
  'alt-text': lazy(() => import('../toolbar/AltTextModal')),
  qr: lazy(() => import('../panels/QrModal')),
  shortcuts: lazy(() => import('./ShortcutsModal')),
  'add-guides': lazy(() => import('./GuidesModal')),
};
