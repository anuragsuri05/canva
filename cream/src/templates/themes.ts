// Visual themes (palette + font pairing + decoration style) used by the template generator,
// plus the PALETTES and FONT_SETS offered in the Styles tab.

export type Deco = 'none' | 'blobs' | 'circles' | 'lines' | 'dots' | 'frame' | 'geo' | 'grain' | 'arches' | 'confetti' | 'waves' | 'brackets' | 'stars' | 'grid';

export interface FontRole {
  family: string;
  weight: number;
  uppercase?: boolean;
  ls?: number; // letter spacing (1/1000 em)
  italic?: boolean;
}

export interface Theme {
  id: string;
  name: string; // human name used in titles ("Beige Minimalist")
  styles: string[]; // filter tags
  bg: string;
  surface: string; // cards / panels on bg
  primary: string; // main brand colour (blocks, buttons)
  secondary: string;
  accent: string;
  text: string; // body text on bg
  muted: string; // secondary text on bg
  heading: FontRole;
  body: FontRole;
  script?: FontRole; // optional decorative accent font
  deco: Deco;
  radius: number; // 0..1 corner style
  dark: boolean;
  topics?: string[]; // topics this theme suits best (empty = any)
}

const T = (
  id: string,
  name: string,
  styles: string[],
  c: [bg: string, surface: string, primary: string, secondary: string, accent: string, text: string, muted: string],
  heading: FontRole,
  body: FontRole,
  deco: Deco,
  radius: number,
  extra: Partial<Theme> = {},
): Theme => ({
  id,
  name,
  styles,
  bg: c[0],
  surface: c[1],
  primary: c[2],
  secondary: c[3],
  accent: c[4],
  text: c[5],
  muted: c[6],
  heading,
  body,
  deco,
  radius,
  dark: false,
  ...extra,
});

const f = (family: string, weight = 700, extra: Partial<FontRole> = {}): FontRole => ({ family, weight, ...extra });

export const THEMES: Theme[] = [
  T('beige-minimal', 'Beige Minimalist', ['minimal', 'elegant'], ['#f4efe8', '#fbf8f4', '#2f2a25', '#b89f86', '#d9c7b3', '#2f2a25', '#7d7166'], f('Cormorant Garamond', 600), f('Montserrat', 400), 'lines', 0, { topics: ['wedding', 'fashion', 'wellness', 'coffee', 'realestate'] }),
  T('modern-navy', 'Navy Modern', ['modern', 'corporate'], ['#ffffff', '#f2f5fa', '#13294b', '#2f6fed', '#ffb547', '#13294b', '#5b6b82'], f('Montserrat', 800), f('Inter', 400), 'geo', 0.2, { topics: ['business', 'tech', 'education', 'realestate', 'nonprofit'] }),
  T('bold-orange', 'Orange Bold', ['bold', 'modern'], ['#fff6ec', '#ffffff', '#ff5a1f', '#1d1d1f', '#ffc83d', '#1d1d1f', '#5e5a55'], f('Archivo Black', 400, { uppercase: true }), f('DM Sans', 400), 'circles', 0.5, { topics: ['marketing', 'fitness', 'food', 'music'] }),
  T('pastel-playful', 'Pastel Playful', ['playful', 'pastel', 'cute'], ['#fff4f6', '#ffffff', '#ff7aa2', '#7cc6fe', '#ffd166', '#3d2c4e', '#7a6a88'], f('Fredoka', 700), f('Quicksand', 500), 'confetti', 1, { topics: ['birthday', 'education', 'pets', 'food'] }),
  T('dark-neon', 'Dark Neon', ['dark', 'neon', 'bold'], ['#0d0b1e', '#1a1733', '#a855f7', '#22d3ee', '#f472b6', '#ffffff', '#b7b2d6'], f('Syne', 800, { uppercase: true }), f('Space Grotesk', 400), 'grid', 0.3, { dark: true, topics: ['music', 'tech', 'marketing', 'birthday'] }),
  T('green-organic', 'Green Organic', ['organic', 'natural', 'minimal'], ['#eef1e6', '#f8f9f3', '#3f5a3a', '#a3b18a', '#e0b973', '#2b3a27', '#62705c'], f('Lora', 600), f('Nunito', 400), 'blobs', 0.8, { topics: ['wellness', 'food', 'nonprofit', 'coffee', 'travel'] }),
  T('black-white', 'Black and White', ['minimal', 'bold', 'modern'], ['#ffffff', '#f2f2f2', '#111111', '#555555', '#e5e5e5', '#111111', '#666666'], f('Bebas Neue', 400, { ls: 20 }), f('Inter', 400), 'lines', 0, { topics: ['fashion', 'business', 'music', 'tech', 'fitness'] }),
  T('luxury-gold', 'Luxury Gold', ['elegant', 'luxury', 'dark'], ['#121212', '#1d1c1a', '#c9a45c', '#8a7344', '#e8d3a3', '#f5efe3', '#b5ab98'], f('Cinzel', 600, { ls: 60 }), f('Lato', 300), 'frame', 0, { dark: true, topics: ['wedding', 'realestate', 'fashion', 'business', 'music'] }),
  T('retro-sunset', 'Retro Sunset', ['retro', 'vintage', 'bold'], ['#fbe8c8', '#fff5e2', '#e4572e', '#2e4a62', '#f3a712', '#2b2118', '#6e5a48'], f('Alfa Slab One', 400), f('Work Sans', 400), 'waves', 0.4, { topics: ['food', 'music', 'travel', 'coffee', 'birthday'] }),
  T('blue-corporate', 'Blue Corporate', ['corporate', 'professional', 'modern'], ['#f5f8ff', '#ffffff', '#1f4fd8', '#0b1f4d', '#22c1a1', '#0b1f4d', '#55627e'], f('Plus Jakarta Sans', 800), f('Plus Jakarta Sans', 400), 'dots', 0.35, { topics: ['business', 'tech', 'education', 'realestate'] }),
  T('terracotta-boho', 'Terracotta Boho', ['boho', 'organic', 'elegant'], ['#f6ede3', '#fbf6f0', '#b8573b', '#d99a6c', '#7d8b6a', '#3b2a22', '#866b5d'], f('Playfair Display', 600, { italic: false }), f('Josefin Sans', 400), 'arches', 0.9, { topics: ['wedding', 'wellness', 'fashion', 'coffee', 'travel'], script: f('Dancing Script', 600) }),
  T('mint-fresh', 'Mint Fresh', ['fresh', 'modern', 'pastel'], ['#effaf6', '#ffffff', '#12b886', '#0b7285', '#ffd43b', '#103b35', '#4c6b64'], f('Poppins', 700), f('Poppins', 400), 'blobs', 0.6, { topics: ['wellness', 'food', 'education', 'nonprofit', 'pets'] }),
  T('red-sale', 'Red Promo', ['bold', 'sale', 'modern'], ['#fff1ef', '#ffffff', '#e03131', '#1a1a1a', '#ffd43b', '#1a1a1a', '#5c4b4b'], f('Anton', 400, { uppercase: true }), f('Roboto', 400), 'stars', 0.2, { topics: ['marketing', 'fashion', 'food', 'fitness'] }),
  T('lavender-dream', 'Lavender Dream', ['pastel', 'elegant', 'feminine'], ['#f4f0fb', '#ffffff', '#7b5ea7', '#c3b1e1', '#f2c6de', '#2f2443', '#6f6385'], f('Playfair Display', 700), f('Raleway', 400), 'circles', 0.8, { topics: ['wedding', 'wellness', 'birthday', 'fashion'], script: f('Great Vibes', 400) }),
  T('forest-dark', 'Forest Dark', ['dark', 'natural', 'elegant'], ['#14251d', '#1d3329', '#d8c38e', '#6b8f71', '#e8e2cf', '#f1ede1', '#a9b5a6'], f('DM Serif Display', 400), f('Karla', 400), 'lines', 0.2, { dark: true, topics: ['travel', 'nonprofit', 'coffee', 'realestate', 'wellness'] }),
  T('yellow-pop', 'Yellow Pop', ['bold', 'playful', 'modern'], ['#ffd43b', '#fff3bf', '#111111', '#ffffff', '#ff6b6b', '#111111', '#3b3b3b'], f('Rubik', 800), f('Rubik', 400), 'dots', 0.5, { topics: ['marketing', 'education', 'food', 'pets', 'birthday'] }),
  T('ocean-calm', 'Ocean Calm', ['calm', 'minimal', 'fresh'], ['#eaf4f8', '#ffffff', '#1c6e8c', '#74b3ce', '#f2c14e', '#0f3443', '#4e6e7a'], f('Raleway', 700), f('Open Sans', 400), 'waves', 0.4, { topics: ['travel', 'wellness', 'nonprofit', 'realestate'] }),
  T('charcoal-lime', 'Charcoal Lime', ['dark', 'modern', 'tech'], ['#1b1d21', '#25282e', '#c6f432', '#5ee6eb', '#8b5cf6', '#f4f6f8', '#9aa1ab'], f('Space Grotesk', 700), f('Inter', 400), 'grid', 0.25, { dark: true, topics: ['tech', 'fitness', 'marketing', 'music'] }),
  T('cream-serif', 'Cream Editorial', ['editorial', 'elegant', 'minimal'], ['#fbf7ef', '#ffffff', '#1e1b18', '#c2410c', '#e7dccb', '#1e1b18', '#6b635a'], f('Libre Baskerville', 700), f('Source Serif 4', 400), 'lines', 0, { topics: ['education', 'business', 'fashion', 'coffee', 'nonprofit'] }),
  T('candy-gradient', 'Candy Gradient', ['gradient', 'playful', 'modern'], ['#fff0f6', '#ffffff', '#f72585', '#7209b7', '#4cc9f0', '#240046', '#6a4c7d'], f('Outfit', 800), f('Outfit', 400), 'blobs', 0.7, { topics: ['marketing', 'birthday', 'music', 'fashion', 'tech'] }),
  T('kraft-vintage', 'Vintage Kraft', ['vintage', 'retro', 'handmade'], ['#e9dcc4', '#f3ead9', '#5b3a29', '#a0522d', '#2f4f4f', '#3a2a1e', '#7a6450'], f('Abril Fatface', 400), f('Crimson Text', 400), 'frame', 0, { topics: ['coffee', 'food', 'music', 'travel', 'wedding'], script: f('Sacramento', 400) }),
  T('sky-gradient', 'Sky Gradient', ['gradient', 'modern', 'fresh'], ['#eef4ff', '#ffffff', '#4361ee', '#4cc9f0', '#f72585', '#14213d', '#4a5578'], f('Sora', 700), f('Manrope', 400), 'circles', 0.6, { topics: ['tech', 'business', 'education', 'travel'] }),
  T('peach-soft', 'Peach Soft', ['pastel', 'soft', 'feminine'], ['#fff1ea', '#ffffff', '#f28c6b', '#f6c1a7', '#8fb9a8', '#4a2f27', '#8c6c62'], f('Yeseva One', 400), f('Mulish', 400), 'arches', 0.9, { topics: ['wellness', 'wedding', 'fashion', 'birthday', 'food'], script: f('Satisfy', 400) }),
  T('electric-blue', 'Electric Blue', ['bold', 'modern', 'sport'], ['#0a1bff', '#2235ff', '#ffffff', '#00e5ff', '#ffe600', '#ffffff', '#c7ccff'], f('Barlow Condensed', 800, { uppercase: true }), f('Barlow', 400), 'stars', 0.15, { dark: true, topics: ['fitness', 'marketing', 'tech', 'music'] }),
  T('sage-wedding', 'Sage Elegant', ['elegant', 'wedding', 'minimal'], ['#f3f4ef', '#ffffff', '#6f7f63', '#c9d2bd', '#d8b69a', '#33392f', '#6f7568'], f('Cormorant Garamond', 500, { italic: true }), f('Montserrat', 300, { uppercase: true, ls: 200 }), 'arches', 1, { topics: ['wedding', 'wellness', 'realestate'], script: f('Great Vibes', 400) }),
  T('chalk-dark', 'Chalkboard', ['dark', 'handwritten', 'playful'], ['#2b2f2a', '#353a34', '#f2f2e9', '#f4d35e', '#ee964b', '#f2f2e9', '#b9bdb3'], f('Amatic SC', 700), f('Caveat', 500), 'dots', 0.3, { dark: true, topics: ['education', 'food', 'coffee'] }),
  T('coral-modern', 'Coral Modern', ['modern', 'bold', 'fresh'], ['#ffffff', '#fff1ee', '#ff6f59', '#254441', '#43aa8b', '#254441', '#5f706d'], f('Urbanist', 800), f('Urbanist', 400), 'geo', 0.5, { topics: ['marketing', 'food', 'travel', 'fitness', 'realestate'] }),
  T('royal-purple', 'Royal Purple', ['elegant', 'bold', 'dark'], ['#24123f', '#331a57', '#f5c542', '#9b5de5', '#f15bb5', '#ffffff', '#c9b8e6'], f('Prata', 400), f('Nunito Sans', 400), 'stars', 0.3, { dark: true, topics: ['birthday', 'music', 'wedding', 'marketing'] }),
  T('newspaper', 'Newsprint', ['editorial', 'vintage', 'minimal'], ['#f2efe6', '#ffffff', '#1a1a1a', '#b91c1c', '#d6d0c0', '#1a1a1a', '#59544b'], f('Playfair Display', 900), f('Libre Baskerville', 400), 'lines', 0, { topics: ['business', 'education', 'nonprofit', 'music'] }),
  T('tropical', 'Tropical Vibes', ['playful', 'colorful', 'bold'], ['#fff8e7', '#ffffff', '#00a389', '#ff7a00', '#ffcb05', '#073b3a', '#5a6e64'], f('Righteous', 400), f('Nunito', 500), 'blobs', 0.8, { topics: ['travel', 'food', 'birthday', 'fitness'] }),
  T('mono-gray', 'Gray Professional', ['professional', 'minimal', 'corporate'], ['#f7f7f8', '#ffffff', '#2d3142', '#4f5d75', '#ef8354', '#2d3142', '#6c7183'], f('IBM Plex Sans', 700), f('IBM Plex Sans', 400), 'brackets', 0.15, { topics: ['business', 'tech', 'education', 'realestate', 'nonprofit'] }),
  T('blush-script', 'Blush Script', ['feminine', 'elegant', 'pastel'], ['#fdf2f2', '#ffffff', '#c76b7e', '#f3c4cf', '#e9d5b5', '#4a2c34', '#8b6b72'], f('Great Vibes', 400), f('Lato', 400), 'circles', 1, { topics: ['wedding', 'birthday', 'fashion', 'wellness'], script: f('Great Vibes', 400) }),
  T('brutalist', 'Brutalist', ['bold', 'experimental', 'modern'], ['#e9e9e2', '#ffffff', '#ff3d00', '#0000ff', '#111111', '#111111', '#3c3c3c'], f('Archivo Black', 400, { uppercase: true, ls: -20 }), f('Space Mono', 400), 'grid', 0, { topics: ['tech', 'music', 'fashion', 'marketing'] }),
  T('autumn-warm', 'Autumn Warm', ['warm', 'cozy', 'vintage'], ['#f8efe2', '#fffaf2', '#9c4221', '#d69e2e', '#2f5d50', '#3b2416', '#7b6352'], f('Bitter', 700), f('Cabin', 400), 'waves', 0.4, { topics: ['coffee', 'food', 'nonprofit', 'education', 'travel'] }),
  T('ice-minimal', 'Ice Minimal', ['minimal', 'clean', 'modern'], ['#ffffff', '#f4f7fb', '#0f172a', '#3b82f6', '#cbd5e1', '#0f172a', '#64748b'], f('Manrope', 800), f('Manrope', 400), 'none', 0.4, { topics: ['tech', 'business', 'realestate', 'education'] }),
  T('kids-bright', 'Kids Bright', ['playful', 'colorful', 'cute'], ['#fefae0', '#ffffff', '#3a86ff', '#ff006e', '#ffbe0b', '#22223b', '#4a4e69'], f('Fredoka', 600), f('Comfortaa', 400), 'confetti', 1, { topics: ['education', 'birthday', 'pets'] }),
  T('wine-elegant', 'Burgundy Elegant', ['elegant', 'luxury', 'warm'], ['#f9f1ec', '#ffffff', '#6d1a36', '#c08497', '#d4a373', '#3a0f1e', '#7d5a63'], f('EB Garamond', 600), f('Lato', 400), 'frame', 0.2, { topics: ['wedding', 'food', 'realestate', 'fashion', 'music'], script: f('Dancing Script', 600) }),
  T('teal-geo', 'Teal Geometric', ['geometric', 'modern', 'bold'], ['#f0f7f7', '#ffffff', '#0f766e', '#f59e0b', '#ef4444', '#0b3b38', '#4b6b69'], f('Kanit', 700), f('Kanit', 300), 'geo', 0.1, { topics: ['business', 'education', 'fitness', 'tech', 'nonprofit'] }),
  T('sunny-handwritten', 'Sunny Handwritten', ['handwritten', 'playful', 'warm'], ['#fffbea', '#ffffff', '#f59f00', '#e8590c', '#40c057', '#3d2c13', '#7a6545'], f('Permanent Marker', 400), f('Nunito', 400), 'confetti', 0.6, { topics: ['food', 'pets', 'birthday', 'education', 'coffee'] }),
  T('midnight-blue', 'Midnight Blue', ['dark', 'elegant', 'modern'], ['#0b132b', '#1c2541', '#5bc0be', '#3a506b', '#f4d35e', '#ffffff', '#a8b2c7'], f('Josefin Sans', 700, { uppercase: true, ls: 80 }), f('Lato', 400), 'stars', 0.3, { dark: true, topics: ['tech', 'music', 'business', 'travel'] }),
  T('rose-gold', 'Rose Gold', ['elegant', 'feminine', 'luxury'], ['#fbf3f0', '#ffffff', '#b76e79', '#e8c4c0', '#c9a96e', '#3d2328', '#8b6a6e'], f('Cormorant Garamond', 700), f('Montserrat', 400), 'frame', 0.5, { topics: ['wedding', 'fashion', 'wellness', 'birthday', 'realestate'], script: f('Great Vibes', 400) }),
  T('lemon-fresh', 'Lemon Fresh', ['fresh', 'playful', 'modern'], ['#fcfde9', '#ffffff', '#5f8d2b', '#f5d90a', '#ff8c42', '#22301a', '#5f6b52'], f('Fraunces', 800), f('Work Sans', 400), 'circles', 0.7, { topics: ['food', 'wellness', 'coffee', 'pets'] }),
  T('steel-industrial', 'Industrial Steel', ['bold', 'industrial', 'dark'], ['#1e2124', '#2a2e33', '#ffb703', '#8d99ae', '#ef233c', '#edf2f4', '#a6aeb8'], f('Oswald', 700, { uppercase: true, ls: 20 }), f('Roboto', 400), 'brackets', 0.1, { dark: true, topics: ['fitness', 'business', 'music', 'realestate'] }),
  T('clay-neutral', 'Neutral Clay', ['neutral', 'minimal', 'organic'], ['#ece4db', '#f6f1eb', '#8a6a52', '#b8a48f', '#d8c2a9', '#3d3027', '#7c6c60'], f('Fraunces', 600), f('Inter', 400), 'arches', 0.8, { topics: ['wellness', 'realestate', 'coffee', 'fashion', 'wedding'] }),
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/* ---------- Styles tab: colour palettes and font sets ---------- */

export interface Palette {
  id: string;
  name: string;
  colors: string[]; // 4-5 colours, roughly dark → light
}

const P = (id: string, name: string, colors: string[]): Palette => ({ id, name, colors });

export const PALETTES: Palette[] = [
  P('p1', 'Fresh and bright', ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51']),
  P('p2', 'Muted tones', ['#3d405b', '#81b29a', '#f2cc8f', '#e07a5f', '#f4f1de']),
  P('p3', 'Ocean blues', ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8']),
  P('p4', 'Sunset', ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b']),
  P('p5', 'Earthy', ['#283618', '#606c38', '#dda15e', '#bc6c25', '#fefae0']),
  P('p6', 'Candy', ['#7209b7', '#f72585', '#4cc9f0', '#ffd6ff', '#fff0f6']),
  P('p7', 'Monochrome', ['#111111', '#444444', '#888888', '#d4d4d4', '#ffffff']),
  P('p8', 'Neon night', ['#0d0221', '#261447', '#ff3864', '#2de2e6', '#f6019d']),
  P('p9', 'Blush', ['#4a2c34', '#c76b7e', '#f3c4cf', '#e9d5b5', '#fdf2f2']),
  P('p10', 'Forest', ['#1b4332', '#2d6a4f', '#52b788', '#b7e4c7', '#f1faee']),
  P('p11', 'Citrus', ['#1a1a1a', '#ff6b35', '#f7c548', '#c5d86d', '#fffbe6']),
  P('p12', 'Lavender', ['#2f2443', '#7b5ea7', '#c3b1e1', '#f2c6de', '#f4f0fb']),
  P('p13', 'Navy and gold', ['#0b1f4d', '#1f4fd8', '#c9a45c', '#e8d3a3', '#f5f8ff']),
  P('p14', 'Terracotta', ['#3b2a22', '#b8573b', '#d99a6c', '#7d8b6a', '#f6ede3']),
  P('p15', 'Retro', ['#2e4a62', '#e4572e', '#f3a712', '#a8c686', '#fbe8c8']),
  P('p16', 'Mint', ['#103b35', '#0b7285', '#12b886', '#ffd43b', '#effaf6']),
  P('p17', 'Coral reef', ['#254441', '#43aa8b', '#ff6f59', '#ffd6c9', '#ffffff']),
  P('p18', 'Royal', ['#24123f', '#9b5de5', '#f15bb5', '#f5c542', '#fdf8ff']),
  P('p19', 'Desert', ['#5b3a29', '#a0522d', '#d4a373', '#e9dcc4', '#faedcd']),
  P('p20', 'Electric', ['#0a1bff', '#00e5ff', '#ffe600', '#ff2e63', '#ffffff']),
  P('p21', 'Sage', ['#33392f', '#6f7f63', '#c9d2bd', '#d8b69a', '#f3f4ef']),
  P('p22', 'Berry', ['#3a0f1e', '#6d1a36', '#c08497', '#f7d1cd', '#fff5f3']),
  P('p23', 'Slate', ['#0f172a', '#334155', '#3b82f6', '#cbd5e1', '#f8fafc']),
  P('p24', 'Tropical', ['#073b3a', '#00a389', '#ff7a00', '#ffcb05', '#fff8e7']),
  P('p25', 'Autumn', ['#3b2416', '#9c4221', '#d69e2e', '#2f5d50', '#f8efe2']),
  P('p26', 'Cotton candy', ['#5e548e', '#9f86c0', '#e0b1cb', '#f7d6e0', '#fff1f5']),
  P('p27', 'Lime punch', ['#1b1d21', '#c6f432', '#5ee6eb', '#8b5cf6', '#f4f6f8']),
  P('p28', 'Vintage', ['#2f4f4f', '#5b3a29', '#c2a878', '#e9dcc4', '#f8f3e6']),
  P('p29', 'Nordic', ['#2e3440', '#5e81ac', '#88c0d0', '#d8dee9', '#eceff4']),
  P('p30', 'Peach', ['#4a2f27', '#f28c6b', '#f6c1a7', '#8fb9a8', '#fff1ea']),
  P('p31', 'Bold primary', ['#1d1d1f', '#e63946', '#457b9d', '#f1c40f', '#f1faee']),
  P('p32', 'Midnight', ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#f4d35e']),
  P('p33', 'Spring', ['#386641', '#6a994e', '#a7c957', '#f2e8cf', '#bc4749']),
  P('p34', 'Cafe', ['#3c2f2f', '#854442', '#be9b7b', '#fff4e6', '#4b3832']),
  P('p35', 'Pop art', ['#111111', '#ff006e', '#3a86ff', '#ffbe0b', '#fb5607']),
  P('p36', 'Ice', ['#14213d', '#4361ee', '#4cc9f0', '#e0fbfc', '#ffffff']),
  P('p37', 'Rose gold', ['#3d2328', '#b76e79', '#c9a96e', '#e8c4c0', '#fbf3f0']),
  P('p38', 'Olive', ['#2b2d1f', '#606c38', '#a3a380', '#d6ce93', '#efebce']),
  P('p39', 'Flamingo', ['#2b1d2f', '#ef476f', '#ffd166', '#06d6a0', '#fdf0f3']),
  P('p40', 'Charcoal and amber', ['#1e2124', '#2a2e33', '#8d99ae', '#ffb703', '#edf2f4']),
  P('p41', 'Sea glass', ['#22577a', '#38a3a5', '#57cc99', '#80ed99', '#e8fff0']),
  P('p42', 'Plum', ['#2d0320', '#5f0f40', '#9a031e', '#fb8b24', '#fff3e6']),
  P('p43', 'Sand dune', ['#463f3a', '#8a817c', '#bcb8b1', '#e0afa0', '#f4f3ee']),
  P('p44', 'Arctic', ['#03256c', '#2541b2', '#1768ac', '#06bee1', '#ffffff']),
  P('p45', 'Matcha', ['#2c3e2d', '#4f7c56', '#9cbf8f', '#e3eccf', '#fbfdf5']),
  P('p46', 'Retro diner', ['#1b998b', '#ed217c', '#2d3047', '#fffd82', '#ff9b71']),
  P('p47', 'Sunflower', ['#3d2c13', '#e8590c', '#f59f00', '#ffe066', '#fffbea']),
  P('p48', 'Steel blue', ['#1d3557', '#457b9d', '#a8dadc', '#f1faee', '#e63946']),
];

export interface FontSet {
  id: string;
  name: string;
  heading: FontRole;
  subheading: FontRole;
  body: FontRole;
}

const FS = (id: string, heading: FontRole, subheading: FontRole, body: FontRole, name?: string): FontSet => ({
  id,
  name: name ?? `${heading.family} & ${body.family}`,
  heading,
  subheading,
  body,
});

export const FONT_SETS: FontSet[] = [
  FS('fs1', f('Playfair Display', 700), f('Montserrat', 600), f('Montserrat', 400)),
  FS('fs2', f('Montserrat', 800), f('Montserrat', 600), f('Open Sans', 400)),
  FS('fs3', f('Bebas Neue', 400), f('Oswald', 500), f('Roboto', 400)),
  FS('fs4', f('Cormorant Garamond', 600), f('Raleway', 500), f('Raleway', 400)),
  FS('fs5', f('Archivo Black', 400), f('DM Sans', 600), f('DM Sans', 400)),
  FS('fs6', f('Lora', 700), f('Nunito', 600), f('Nunito', 400)),
  FS('fs7', f('Poppins', 700), f('Poppins', 500), f('Poppins', 400)),
  FS('fs8', f('Abril Fatface', 400), f('Lato', 700), f('Lato', 400)),
  FS('fs9', f('Space Grotesk', 700), f('Space Grotesk', 500), f('Inter', 400)),
  FS('fs10', f('Fredoka', 700), f('Quicksand', 600), f('Quicksand', 500)),
  FS('fs11', f('Cinzel', 600), f('Lato', 600), f('Lato', 300)),
  FS('fs12', f('Anton', 400), f('Roboto', 700), f('Roboto', 400)),
  FS('fs13', f('Libre Baskerville', 700), f('Source Serif 4', 600), f('Source Serif 4', 400)),
  FS('fs14', f('Syne', 800), f('Space Grotesk', 500), f('Space Grotesk', 400)),
  FS('fs15', f('Alfa Slab One', 400), f('Work Sans', 600), f('Work Sans', 400)),
  FS('fs16', f('Great Vibes', 400), f('Montserrat', 500), f('Montserrat', 400)),
  FS('fs17', f('Josefin Sans', 700), f('Josefin Sans', 600), f('Lato', 400)),
  FS('fs18', f('DM Serif Display', 400), f('Karla', 600), f('Karla', 400)),
  FS('fs19', f('Plus Jakarta Sans', 800), f('Plus Jakarta Sans', 600), f('Plus Jakarta Sans', 400)),
  FS('fs20', f('Righteous', 400), f('Nunito', 700), f('Nunito', 400)),
  FS('fs21', f('Outfit', 800), f('Outfit', 600), f('Outfit', 400)),
  FS('fs22', f('Yeseva One', 400), f('Mulish', 600), f('Mulish', 400)),
  FS('fs23', f('Permanent Marker', 400), f('Caveat', 600), f('Nunito', 400)),
  FS('fs24', f('EB Garamond', 600), f('EB Garamond', 500), f('EB Garamond', 400)),
  FS('fs25', f('Barlow Condensed', 800), f('Barlow', 600), f('Barlow', 400)),
  FS('fs26', f('Prata', 400), f('Nunito Sans', 600), f('Nunito Sans', 400)),
  FS('fs27', f('Sora', 700), f('Manrope', 600), f('Manrope', 400)),
  FS('fs28', f('Amatic SC', 700), f('Caveat', 500), f('Caveat', 400)),
  FS('fs29', f('Fraunces', 800), f('Work Sans', 500), f('Work Sans', 400)),
  FS('fs30', f('Oswald', 700), f('Roboto', 500), f('Roboto', 400)),
  FS('fs31', f('Rubik', 800), f('Rubik', 500), f('Rubik', 400)),
  FS('fs32', f('Kanit', 700), f('Kanit', 400), f('Kanit', 300)),
];
