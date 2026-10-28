import { useState } from 'react';
import type { SidePanel } from '../store/editor';
import { Icon } from '../ui/ui';
import { createFromPreset, openDesign } from './actions';

interface App {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  cat: 'Featured' | 'Media' | 'AI' | 'Productivity' | 'Design';
  side?: SidePanel;
  modal?: 'qr';
  source?: string;
}

const APPS: App[] = [
  { id: 'photos', name: 'Photos', desc: 'Search ~800M openly licensed photos from Openverse.', icon: 'Image', color: '#4c6ef5', cat: 'Media', side: 'photos', source: 'Openverse' },
  { id: 'videos', name: 'Videos', desc: 'Free stock video clips from Wikimedia Commons.', icon: 'Film', color: '#ff3b4b', cat: 'Media', side: 'videos', source: 'Wikimedia' },
  { id: 'audio', name: 'Audio', desc: 'Music and sound effects with Creative Commons licences.', icon: 'Music', color: '#ff8a4c', cat: 'Media', side: 'audio', source: 'Openverse' },
  { id: 'elements', name: 'Graphics & Icons', desc: '400k+ open-source icons, stickers and emoji from Iconify.', icon: 'Shapes', color: '#12b886', cat: 'Featured', side: 'elements', source: 'Iconify' },
  { id: 'magic-media', name: 'Magic Media', desc: 'Generate images from a text prompt with AI.', icon: 'Wand2', color: '#8b3dff', cat: 'AI', side: 'magic-media', source: 'Pollinations' },
  { id: 'ai', name: 'Cream AI', desc: 'Chat to design, write, brainstorm and edit.', icon: 'Sparkles', color: '#be4bdb', cat: 'AI', side: 'ai' },
  { id: 'charts', name: 'Charts', desc: 'Bar, line, pie, donut, area and more — editable data.', icon: 'BarChart3', color: '#22b8cf', cat: 'Productivity', side: 'charts' },
  { id: 'qr', name: 'QR Code', desc: 'Turn any link into a scannable QR code.', icon: 'QrCode', color: '#1d1a26', cat: 'Featured', modal: 'qr' },
  { id: 'draw', name: 'Draw', desc: 'Pens, markers, highlighters and eraser.', icon: 'PenTool', color: '#f06595', cat: 'Design', side: 'draw' },
  { id: 'backgrounds', name: 'Backgrounds', desc: 'Textures, gradients and photo backgrounds.', icon: 'Wallpaper', color: '#fab005', cat: 'Design', side: 'backgrounds' },
  { id: 'styles', name: 'Styles', desc: 'One-click colour palettes and font pairings.', icon: 'Palette', color: '#845ef7', cat: 'Design', side: 'styles' },
  { id: 'stickies', name: 'Sticky notes', desc: 'Brainstorm on whiteboards with sticky notes.', icon: 'StickyNote', color: '#f59f00', cat: 'Productivity', side: 'stickies' },
  { id: 'logos', name: 'Logos', desc: 'Your brand logos, ready to drop into any design.', icon: 'Hexagon', color: '#2f9e6e', cat: 'Design', side: 'logos' },
  { id: 'bg-remover', name: 'Background Remover', desc: 'Remove photo backgrounds on-device — select an image and choose Edit.', icon: 'Eraser', color: '#495057', cat: 'AI' },
  { id: 'translate', name: 'Translate', desc: 'Translate the text in your design into 100+ languages.', icon: 'Languages', color: '#4dabf7', cat: 'AI' },
  { id: 'ocr', name: 'Grab Text', desc: 'Extract editable text from images (Tesseract OCR, on-device).', icon: 'ScanText', color: '#20c997', cat: 'Productivity' },
  { id: 'fonts', name: 'Fonts', desc: '2,100+ open-licence fonts from Fontsource.', icon: 'Type', color: '#343a40', cat: 'Design', side: 'text', source: 'Fontsource' },
  { id: 'uploads', name: 'Uploads', desc: 'Your images, videos, audio and fonts stored in this browser.', icon: 'CloudUpload', color: '#748ffc', cat: 'Media', side: 'uploads' },
];

const CATS = ['All', 'Featured', 'AI', 'Media', 'Design', 'Productivity'] as const;

export default function AppsPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [q, setQ] = useState('');
  const list = APPS.filter((a) => (cat === 'All' || a.cat === cat) && (a.name + a.desc).toLowerCase().includes(q.toLowerCase()));
  const open = (a: App) => {
    const d = createFromPreset('instagram-square', { open: false });
    openDesign(d.id, { side: a.side, modal: a.modal });
  };
  return (
    <div className="home-content" data-testid="apps-page">
      <div className="apps-hero">
        <div>
          <h1>Apps</h1>
          <p>Built-in apps that bring media, AI and productivity tools into your designs — no sign-ups, no API keys.</p>
        </div>
        <div className="search" style={{ width: 320, background: 'var(--surface)' }}>
          <Icon name="Search" size={16} />
          <input placeholder="Search apps" value={q} onChange={(e) => setQ(e.target.value)} data-testid="apps-search" />
        </div>
      </div>
      <div className="chips" style={{ margin: '18px 0' }}>
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="app-grid">
        {list.map((a) => (
          <div className="app-card" key={a.id} data-testid={'app-' + a.id}>
            <span className="app-ico" style={{ background: a.color }}>
              <Icon name={a.icon} size={22} />
            </span>
            <div className="grow">
              <div className="row" style={{ gap: 6 }}>
                <b>{a.name}</b>
                {a.source && <span className="faint">· {a.source}</span>}
              </div>
              <div className="muted app-desc">{a.desc}</div>
            </div>
            <button className="btn sm" onClick={() => open(a)}>
              Open
            </button>
          </div>
        ))}
        {!list.length && <div className="empty">No apps match “{q}”.</div>}
      </div>
    </div>
  );
}
