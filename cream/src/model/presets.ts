import type { DesignCategory, Unit } from './types';

export interface DesignPreset {
  id: string;
  name: string;
  category: DesignCategory;
  width: number; // px
  height: number; // px
  unit: Unit;
  display: string; // "1080 × 1080 px"
  group: string; // menu grouping
  icon: string; // lucide icon name
}

const px = (id: string, name: string, category: DesignCategory, w: number, h: number, group: string, icon: string): DesignPreset => ({
  id,
  name,
  category,
  width: w,
  height: h,
  unit: 'px',
  display: `${w} × ${h} px`,
  group,
  icon,
});

const inch = (id: string, name: string, category: DesignCategory, wi: number, hi: number, group: string, icon: string): DesignPreset => ({
  id,
  name,
  category,
  width: Math.round(wi * 96),
  height: Math.round(hi * 96),
  unit: 'in',
  display: `${wi} × ${hi} in`,
  group,
  icon,
});

const mm = (id: string, name: string, category: DesignCategory, wm: number, hm: number, group: string, icon: string): DesignPreset => ({
  id,
  name,
  category,
  width: Math.round((wm / 25.4) * 96),
  height: Math.round((hm / 25.4) * 96),
  unit: 'mm',
  display: `${wm} × ${hm} mm`,
  group,
  icon,
});

export const PRESETS: DesignPreset[] = [
  // Presentations
  px('presentation', 'Presentation (16:9)', 'presentation', 1920, 1080, 'Presentations', 'Presentation'),
  px('presentation-43', 'Presentation (4:3)', 'presentation', 1024, 768, 'Presentations', 'Presentation'),
  px('presentation-mobile', 'Mobile-first presentation', 'presentation', 1080, 1920, 'Presentations', 'Smartphone'),
  // Social
  px('instagram-post', 'Instagram Post (4:5)', 'social', 1080, 1350, 'Social media', 'Instagram'),
  px('instagram-square', 'Instagram Post (Square)', 'social', 1080, 1080, 'Social media', 'Instagram'),
  px('instagram-story', 'Instagram Story', 'social', 1080, 1920, 'Social media', 'Instagram'),
  px('instagram-reel', 'Instagram Reel', 'video', 1080, 1920, 'Social media', 'Clapperboard'),
  px('facebook-post', 'Facebook Post', 'social', 1200, 630, 'Social media', 'Facebook'),
  px('facebook-cover', 'Facebook Cover', 'social', 1640, 924, 'Social media', 'Facebook'),
  px('facebook-event', 'Facebook Event Cover', 'social', 1920, 1005, 'Social media', 'Facebook'),
  px('linkedin-post', 'LinkedIn Post', 'social', 1200, 1200, 'Social media', 'Linkedin'),
  px('linkedin-banner', 'LinkedIn Banner', 'social', 1584, 396, 'Social media', 'Linkedin'),
  px('x-post', 'X Post', 'social', 1600, 900, 'Social media', 'Twitter'),
  px('x-header', 'X Header', 'social', 1500, 500, 'Social media', 'Twitter'),
  px('pinterest-pin', 'Pinterest Pin', 'social', 1000, 1500, 'Social media', 'Pin'),
  px('tiktok-video', 'TikTok Video', 'video', 1080, 1920, 'Social media', 'Music2'),
  px('youtube-thumbnail', 'YouTube Thumbnail', 'social', 1280, 720, 'Social media', 'Youtube'),
  px('youtube-banner', 'YouTube Banner', 'social', 2560, 1440, 'Social media', 'Youtube'),
  px('youtube-video', 'YouTube Video', 'video', 1920, 1080, 'Video', 'Youtube'),
  // Video
  px('video', 'Video (16:9)', 'video', 1920, 1080, 'Video', 'Video'),
  px('mobile-video', 'Mobile Video (9:16)', 'video', 1080, 1920, 'Video', 'Smartphone'),
  px('square-video', 'Square Video', 'video', 1080, 1080, 'Video', 'Square'),
  // Docs / whiteboards / websites / email
  px('doc', 'Doc', 'doc', 816, 1056, 'Docs & more', 'FileText'),
  px('whiteboard', 'Whiteboard', 'whiteboard', 4000, 2500, 'Docs & more', 'Presentation'),
  px('website', 'Website', 'website', 1366, 768, 'Docs & more', 'Globe'),
  px('email', 'Email', 'email', 600, 1600, 'Docs & more', 'Mail'),
  px('logo', 'Logo', 'print', 500, 500, 'Marketing', 'Hexagon'),
  // Print
  inch('poster', 'Poster (18 × 24 in)', 'print', 18, 24, 'Print', 'Image'),
  mm('poster-a3', 'Poster (A3)', 'print', 297, 420, 'Print', 'Image'),
  mm('flyer', 'Flyer (A4)', 'print', 210, 297, 'Print', 'FileImage'),
  inch('flyer-letter', 'Flyer (Letter)', 'print', 8.5, 11, 'Print', 'FileImage'),
  inch('business-card', 'Business Card', 'print', 3.5, 2, 'Print', 'CreditCard'),
  inch('invitation', 'Invitation (5 × 7 in)', 'print', 5, 7, 'Print', 'Mail'),
  inch('card', 'Card (Folded 5 × 7 in)', 'print', 5, 7, 'Print', 'Gift'),
  mm('brochure', 'Brochure (Tri-fold A4)', 'print', 297, 210, 'Print', 'BookOpen'),
  inch('postcard', 'Postcard (6 × 4 in)', 'print', 6, 4, 'Print', 'Mail'),
  mm('a4', 'A4 Document', 'print', 210, 297, 'Print', 'FileText'),
  inch('letter', 'US Letter Document', 'print', 8.5, 11, 'Print', 'FileText'),
  inch('certificate', 'Certificate (11 × 8.5 in)', 'print', 11, 8.5, 'Print', 'Award'),
  inch('resume', 'Resume', 'print', 8.5, 11, 'Print', 'User'),
  inch('menu', 'Menu (8.5 × 11 in)', 'print', 8.5, 11, 'Print', 'UtensilsCrossed'),
  inch('label', 'Label (4 × 4 in)', 'print', 4, 4, 'Print', 'Tag'),
  inch('sticker', 'Sticker (3 × 3 in)', 'print', 3, 3, 'Print', 'Sticker'),
  inch('tshirt', 'T-Shirt (12 × 16 in)', 'print', 12, 16, 'Print', 'Shirt'),
  inch('mug', 'Mug (8.5 × 3.5 in)', 'print', 8.5, 3.5, 'Print', 'Coffee'),
  inch('calendar', 'Calendar (11 × 8.5 in)', 'print', 11, 8.5, 'Print', 'Calendar'),
  inch('banner', 'Banner (6 × 2 ft)', 'print', 72, 24, 'Print', 'Flag'),
  px('infographic', 'Infographic', 'social', 800, 2000, 'Marketing', 'BarChart3'),
  px('desktop-wallpaper', 'Desktop Wallpaper', 'custom', 1920, 1080, 'Marketing', 'Monitor'),
  px('phone-wallpaper', 'Phone Wallpaper', 'custom', 1080, 1920, 'Marketing', 'Smartphone'),
  px('email-header', 'Email Header', 'email', 600, 200, 'Marketing', 'Mail'),
  px('zoom-background', 'Zoom Virtual Background', 'custom', 1920, 1080, 'Marketing', 'Video'),
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id);

export const UNIT_TO_PX: Record<Unit, number> = { px: 1, in: 96, mm: 96 / 25.4, cm: 96 / 2.54 };

export const toPx = (v: number, unit: Unit) => v * UNIT_TO_PX[unit];
export const fromPx = (v: number, unit: Unit) => {
  const r = v / UNIT_TO_PX[unit];
  return unit === 'px' ? Math.round(r) : Math.round(r * 100) / 100;
};

export const CUSTOM_MIN_PX = 40;
export const CUSTOM_MAX_PX = 8000;

export const CATEGORY_LABEL: Record<DesignCategory, string> = {
  presentation: 'Presentation',
  social: 'Social media',
  video: 'Video',
  print: 'Print',
  doc: 'Doc',
  whiteboard: 'Whiteboard',
  website: 'Website',
  email: 'Email',
  custom: 'Custom size',
};
