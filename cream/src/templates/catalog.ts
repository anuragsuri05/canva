// Template "kinds": which preset, which layout recipes, how many variants per topic.
import type { Rng } from './rng';

export interface Kind {
  id: string;
  label: string;
  preset: string;
  group: string; // TEMPLATE_CATEGORIES id
  recipes: string[];
  per: number; // templates per topic
  seq?: (v: number, rng: Rng) => string[]; // multi-page sequence
  animated?: number; // probability the template carries animations
  topics?: string[]; // restrict to these topics
  tags?: string; // extra search keywords
}

export const SOCIAL = ['hero-photo', 'split-photo', 'bold-type', 'framed-photo', 'quote-card', 'sale-promo', 'list-tips', 'stat-highlight', 'event-announce', 'collage', 'minimal-center', 'gradient-glass', 'polaroid', 'product-feature', 'testimonial', 'band-overlay', 'magazine-cover', 'circle-photo'];
const POSTER = ['hero-photo', 'split-photo', 'bold-type', 'framed-photo', 'sale-promo', 'event-announce', 'minimal-center', 'gradient-glass', 'band-overlay', 'magazine-cover', 'product-feature', 'collage'];
const WIDE = ['hero-photo', 'split-photo', 'bold-type', 'framed-photo', 'event-announce', 'gradient-glass', 'band-overlay', 'minimal-center', 'sale-promo'];
const THUMB = ['hero-photo', 'split-photo', 'bold-type', 'band-overlay', 'sale-promo', 'stat-highlight', 'framed-photo'];

const DECK_MIDDLE = ['slide-agenda', 'slide-content', 'slide-image-text', 'slide-stats', 'slide-three-cards', 'slide-quote', 'slide-timeline', 'slide-team', 'slide-chart', 'slide-gallery'];

function deckSeq(v: number, rng: Rng) {
  const n = 6 + (v % 5); // 6..10 slides
  const mid = rng.shuffle(DECK_MIDDLE.slice(1));
  const pages = ['slide-title', 'slide-agenda', 'slide-section'];
  for (let i = 0; pages.length < n - 1; i++) {
    pages.push(mid[i % mid.length]);
    if (pages.length === 6 && n > 8) pages.push('slide-section');
  }
  pages.push('slide-closing');
  return pages;
}

const deckShort = (v: number, rng: Rng) => deckSeq(v % 2, rng).filter((x) => x !== 'slide-closing').slice(0, 5).concat('slide-closing');

function videoSeq(v: number, rng: Rng) {
  const intro = rng.pick(['bold-type', 'hero-photo', 'gradient-glass', 'magazine-cover']);
  const mids = rng.shuffle(['split-photo', 'list-tips', 'stat-highlight', 'framed-photo', 'collage', 'quote-card', 'product-feature', 'testimonial']);
  return [intro, ...mids.slice(0, 2 + (v % 2)), 'cta-end'];
}

const two = (a: string, b: string) => () => [a, b];

export const KINDS: Kind[] = [
  // Presentations
  { id: 'presentation', label: 'Presentation', preset: 'presentation', group: 'presentation', recipes: ['deck'], per: 20, seq: deckSeq, tags: 'slides deck pitch' },
  { id: 'presentation-43', label: 'Presentation (4:3)', preset: 'presentation-43', group: 'presentation', recipes: ['deck'], per: 4, seq: deckShort, tags: 'slides deck' },
  { id: 'presentation-mobile', label: 'Mobile-first Presentation', preset: 'presentation-mobile', group: 'presentation', recipes: ['deck'], per: 4, seq: deckShort, tags: 'slides vertical' },
  // Social
  { id: 'ig-post', label: 'Instagram Post', preset: 'instagram-post', group: 'social', recipes: SOCIAL, per: 20, animated: 0.2 },
  { id: 'ig-square', label: 'Instagram Post (Square)', preset: 'instagram-square', group: 'social', recipes: SOCIAL, per: 14, animated: 0.2 },
  { id: 'ig-story', label: 'Instagram Story', preset: 'instagram-story', group: 'social', recipes: SOCIAL, per: 14, animated: 0.35, tags: 'story vertical' },
  { id: 'fb-post', label: 'Facebook Post', preset: 'facebook-post', group: 'social', recipes: WIDE, per: 10 },
  { id: 'fb-cover', label: 'Facebook Cover', preset: 'facebook-cover', group: 'social', recipes: WIDE, per: 5, tags: 'banner header' },
  { id: 'fb-event', label: 'Facebook Event Cover', preset: 'facebook-event', group: 'social', recipes: ['event-announce', 'hero-photo', 'bold-type', 'split-photo', 'band-overlay'], per: 5 },
  { id: 'li-post', label: 'LinkedIn Post', preset: 'linkedin-post', group: 'social', recipes: SOCIAL, per: 8 },
  { id: 'li-banner', label: 'LinkedIn Banner', preset: 'linkedin-banner', group: 'social', recipes: WIDE, per: 5, tags: 'header cover' },
  { id: 'x-post', label: 'X Post', preset: 'x-post', group: 'social', recipes: WIDE, per: 6, tags: 'twitter' },
  { id: 'x-header', label: 'X Header', preset: 'x-header', group: 'social', recipes: WIDE, per: 4, tags: 'twitter banner' },
  { id: 'pin', label: 'Pinterest Pin', preset: 'pinterest-pin', group: 'social', recipes: SOCIAL, per: 8 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', preset: 'youtube-thumbnail', group: 'social', recipes: THUMB, per: 8 },
  { id: 'yt-banner', label: 'YouTube Banner', preset: 'youtube-banner', group: 'social', recipes: WIDE, per: 4, tags: 'channel art' },
  // Video
  { id: 'reel', label: 'Instagram Reel', preset: 'instagram-reel', group: 'video', recipes: ['video'], per: 6, seq: videoSeq, animated: 1 },
  { id: 'tiktok', label: 'TikTok Video', preset: 'tiktok-video', group: 'video', recipes: ['video'], per: 6, seq: videoSeq, animated: 1 },
  { id: 'yt-video', label: 'YouTube Video', preset: 'youtube-video', group: 'video', recipes: ['video'], per: 6, seq: videoSeq, animated: 1, tags: 'intro' },
  { id: 'video', label: 'Video', preset: 'video', group: 'video', recipes: ['video'], per: 6, seq: videoSeq, animated: 1 },
  { id: 'mobile-video', label: 'Mobile Video', preset: 'mobile-video', group: 'video', recipes: ['video'], per: 4, seq: videoSeq, animated: 1 },
  { id: 'square-video', label: 'Square Video', preset: 'square-video', group: 'video', recipes: ['video'], per: 4, seq: videoSeq, animated: 1 },
  // Docs, whiteboards, websites, email
  { id: 'doc', label: 'Doc', preset: 'doc', group: 'doc', recipes: ['doc'], per: 6, seq: (v) => (v % 2 ? ['doc-cover', 'doc-page', 'doc-report'] : ['doc-page', 'doc-report']), tags: 'report proposal document' },
  { id: 'whiteboard', label: 'Whiteboard', preset: 'whiteboard', group: 'whiteboard', recipes: ['wb-brainstorm', 'wb-mindmap', 'wb-kanban', 'wb-flowchart', 'wb-retro', 'wb-swot', 'wb-journey'], per: 7, tags: 'brainstorm planning diagram' },
  { id: 'website', label: 'Website', preset: 'website', group: 'website', recipes: ['site'], per: 6, seq: (v) => ['web-hero', 'web-features', v % 2 ? 'web-gallery' : 'web-testimonials', 'web-contact'], tags: 'landing page portfolio' },
  { id: 'email', label: 'Email', preset: 'email', group: 'email', recipes: ['email-newsletter', 'email-promo'], per: 6, tags: 'newsletter' },
  { id: 'email-header', label: 'Email Header', preset: 'email-header', group: 'email', recipes: ['bold-type', 'split-photo', 'band-overlay', 'hero-photo'], per: 3 },
  // Marketing
  { id: 'logo', label: 'Logo', preset: 'logo', group: 'logo', recipes: ['logo-emblem', 'logo-monogram', 'logo-wordmark', 'logo-badge'], per: 8, tags: 'brand identity' },
  { id: 'infographic', label: 'Infographic', preset: 'infographic', group: 'marketing', recipes: ['info-steps', 'info-stats'], per: 6 },
  { id: 'desktop-wallpaper', label: 'Desktop Wallpaper', preset: 'desktop-wallpaper', group: 'marketing', recipes: ['bold-type', 'minimal-center', 'gradient-glass', 'quote-card'], per: 2 },
  { id: 'phone-wallpaper', label: 'Phone Wallpaper', preset: 'phone-wallpaper', group: 'marketing', recipes: ['bold-type', 'minimal-center', 'gradient-glass', 'quote-card'], per: 3 },
  { id: 'zoom-background', label: 'Zoom Virtual Background', preset: 'zoom-background', group: 'marketing', recipes: ['zoom-bg'], per: 3 },
  // Print
  { id: 'poster', label: 'Poster', preset: 'poster', group: 'print', recipes: POSTER, per: 10 },
  { id: 'poster-a3', label: 'Poster (A3)', preset: 'poster-a3', group: 'print', recipes: POSTER, per: 4 },
  { id: 'flyer', label: 'Flyer', preset: 'flyer', group: 'print', recipes: [...POSTER, 'flyer-services'], per: 12 },
  { id: 'flyer-letter', label: 'Flyer (Letter)', preset: 'flyer-letter', group: 'print', recipes: [...POSTER, 'flyer-services'], per: 5 },
  { id: 'business-card', label: 'Business Card', preset: 'business-card', group: 'business-cards', recipes: ['bc'], per: 8, seq: (v) => [['bc-split', 'bc-center', 'bc-photo', 'bc-band'][v % 4], 'bc-back'] },
  { id: 'invitation', label: 'Invitation', preset: 'invitation', group: 'events', recipes: ['invite-classic', 'invite-photo', 'minimal-center', 'framed-photo', 'event-announce'], per: 6 },
  { id: 'card', label: 'Card', preset: 'card', group: 'events', recipes: ['card'], per: 5, seq: (v) => [['invite-classic', 'framed-photo', 'bold-type', 'minimal-center'][v % 4], 'card-inside'], tags: 'greeting thank you' },
  { id: 'brochure', label: 'Brochure', preset: 'brochure', group: 'print', recipes: ['brochure'], per: 5, seq: two('brochure-outside', 'brochure-inside'), tags: 'trifold' },
  { id: 'postcard', label: 'Postcard', preset: 'postcard', group: 'print', recipes: WIDE, per: 4 },
  { id: 'a4', label: 'A4 Document', preset: 'a4', group: 'doc', recipes: ['letterhead', 'doc-report'], per: 3, tags: 'letterhead' },
  { id: 'letter', label: 'Letter', preset: 'letter', group: 'doc', recipes: ['letterhead', 'doc-page'], per: 3, tags: 'letterhead' },
  { id: 'certificate', label: 'Certificate', preset: 'certificate', group: 'education', recipes: ['certificate-classic', 'certificate-modern'], per: 4, tags: 'award achievement' },
  { id: 'resume', label: 'Resume', preset: 'resume', group: 'business', recipes: ['resume-sidebar', 'resume-classic'], per: 4, tags: 'cv' },
  { id: 'menu', label: 'Menu', preset: 'menu', group: 'print', recipes: ['menu-list', 'menu-photo'], per: 8, topics: ['food', 'coffee', 'wedding', 'birthday', 'wellness', 'nonprofit', 'music', 'travel'] },
  { id: 'label', label: 'Label', preset: 'label', group: 'print', recipes: ['badge-circle', 'badge-rect'], per: 3, tags: 'product packaging' },
  { id: 'sticker', label: 'Sticker', preset: 'sticker', group: 'print', recipes: ['badge-circle'], per: 3 },
  { id: 'tshirt', label: 'T-Shirt', preset: 'tshirt', group: 'print', recipes: ['tshirt-graphic'], per: 3, tags: 'apparel merch' },
  { id: 'mug', label: 'Mug', preset: 'mug', group: 'print', recipes: ['mug-wrap', 'bold-type'], per: 2, tags: 'merch' },
  { id: 'calendar', label: 'Calendar', preset: 'calendar', group: 'print', recipes: ['calendar-month'], per: 3, tags: 'planner' },
  { id: 'banner', label: 'Banner', preset: 'banner', group: 'print', recipes: WIDE, per: 3, tags: 'signage' },
];

export const kindById = (id: string) => KINDS.find((k) => k.id === id);

export interface TemplateCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'presentation', label: 'Presentations', icon: 'Presentation', color: '#ff8a4c' },
  { id: 'social', label: 'Social media', icon: 'Heart', color: '#f06595' },
  { id: 'video', label: 'Videos', icon: 'Clapperboard', color: '#e2557a' },
  { id: 'print', label: 'Print products', icon: 'Printer', color: '#22b8cf' },
  { id: 'business-cards', label: 'Business cards', icon: 'CreditCard', color: '#4c6ef5' },
  { id: 'events', label: 'Invitations & cards', icon: 'Mail', color: '#be4bdb' },
  { id: 'marketing', label: 'Marketing', icon: 'Megaphone', color: '#fab005' },
  { id: 'doc', label: 'Docs', icon: 'FileText', color: '#2f9e6e' },
  { id: 'whiteboard', label: 'Whiteboards', icon: 'SquareDashed', color: '#12b886' },
  { id: 'website', label: 'Websites', icon: 'Globe', color: '#4c6ef5' },
  { id: 'email', label: 'Email', icon: 'Mail', color: '#f59f00' },
  { id: 'logo', label: 'Logos', icon: 'Hexagon', color: '#845ef7' },
  { id: 'education', label: 'Education', icon: 'GraduationCap', color: '#20c997' },
  { id: 'business', label: 'Business', icon: 'Briefcase', color: '#495057' },
];
