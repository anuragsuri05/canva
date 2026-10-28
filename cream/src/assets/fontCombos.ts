// Font combinations for the Text panel: pre-styled, grouped multi-line text using Fontsource fonts.
import type { TextEl } from '../model/types';
import { makeText, uid } from '../model/defaults';

export interface ComboLine {
  text: string;
  family: string;
  size: number; // px at a 600px-wide block
  weight?: number;
  color?: string;
  italic?: boolean;
  upper?: boolean;
  spacing?: number; // letterSpacing (1/1000 em)
  lh?: number;
}

export interface FontCombo {
  id: string;
  name: string;
  tags: string;
  lines: ComboLine[];
}

const C = (id: string, name: string, tags: string, ...lines: ComboLine[]): FontCombo => ({ id, name, tags, lines });

export const FONT_COMBOS: FontCombo[] = [
  C('sale', 'Big sale', 'sale promo marketing bold', { text: 'BIG SALE', family: 'Anton', size: 120, color: '#e2557a', lh: 1 }, { text: 'Up to 50% off everything', family: 'Montserrat', size: 30, weight: 600, color: '#1d1a26' }),
  C('wedding', 'Wedding invite', 'wedding elegant script invitation', { text: 'Save the Date', family: 'Great Vibes', size: 96, color: '#8a6a4a', lh: 1.1 }, { text: 'EMMA & JAMES · 06.21', family: 'Cormorant Garamond', size: 28, weight: 600, spacing: 200, color: '#3a2e25' }),
  C('hello', 'Hello there', 'greeting friendly playful', { text: 'Hello!', family: 'Pacifico', size: 110, color: '#7c4dff', lh: 1.2 }, { text: 'Nice to meet you', family: 'Quicksand', size: 34, weight: 600, color: '#1d1a26' }),
  C('editorial', 'Editorial', 'magazine serif elegant', { text: 'The Art of Slow Living', family: 'Playfair Display', size: 72, weight: 700, lh: 1.1 }, { text: 'Essays on design, rest and paying attention', family: 'Lora', size: 26, italic: true, color: '#5b566a' }),
  C('tech', 'Tech launch', 'tech startup modern product', { text: 'LAUNCH DAY', family: 'Space Grotesk', size: 30, weight: 700, spacing: 300, color: '#7c4dff' }, { text: 'Meet the future of work', family: 'Sora', size: 70, weight: 700, lh: 1.05 }),
  C('quote', 'Quote', 'quote inspirational', { text: '“Make it simple, but significant.”', family: 'DM Serif Display', size: 64, lh: 1.15 }, { text: '— DON DRAPER', family: 'Inter', size: 22, weight: 600, spacing: 200, color: '#8d889c' }),
  C('grand-opening', 'Grand opening', 'event opening store announcement', { text: 'GRAND', family: 'Bebas Neue', size: 130, color: '#1d1a26', lh: 0.9 }, { text: 'opening', family: 'Dancing Script', size: 90, weight: 700, color: '#e2557a', lh: 0.9 }, { text: 'SATURDAY · 10AM', family: 'Oswald', size: 26, spacing: 250 }),
  C('coffee', 'Coffee shop', 'cafe coffee menu cozy', { text: 'Morning Brew', family: 'Lobster', size: 92, color: '#6f4518' }, { text: 'FRESHLY ROASTED · SINCE 1998', family: 'Josefin Sans', size: 22, weight: 600, spacing: 250, color: '#6f4518' }),
  C('minimal', 'Minimal', 'minimal clean simple', { text: 'less, but better', family: 'Inter', size: 64, weight: 300, lh: 1.1 }, { text: 'DESIGN PRINCIPLES', family: 'Inter', size: 18, weight: 600, spacing: 400, color: '#8d889c' }),
  C('retro', 'Retro', 'retro vintage 70s groovy', { text: 'Groovy Vibes', family: 'Righteous', size: 92, color: '#ff8a4c', lh: 1.05 }, { text: 'Est. 1972 · Good times only', family: 'Bitter', size: 28, italic: true, color: '#5a3825' }),
  C('webinar', 'Webinar', 'webinar business corporate event', { text: 'FREE WEBINAR', family: 'Montserrat', size: 24, weight: 800, spacing: 200, color: '#22b8cf' }, { text: 'Growing Your Brand in 2026', family: 'Poppins', size: 60, weight: 700, lh: 1.1 }, { text: 'Thursday, 3 PM EST', family: 'Poppins', size: 26, color: '#5b566a' }),
  C('birthday', 'Birthday', 'birthday party celebration', { text: 'Happy', family: 'Sacramento', size: 100, color: '#f06595', lh: 1.15 }, { text: 'BIRTHDAY', family: 'Alfa Slab One', size: 90, color: '#1d1a26', lh: 1 }),
  C('gym', 'Fitness', 'gym fitness sport workout bold', { text: 'NO PAIN', family: 'Teko', size: 140, weight: 700, color: '#1d1a26', lh: 0.85 }, { text: 'NO GAIN', family: 'Teko', size: 140, weight: 700, color: '#e5484d', lh: 0.85 }, { text: 'Join today — first week free', family: 'Barlow', size: 26, weight: 500 }),
  C('newsletter', 'Newsletter', 'newsletter email header', { text: 'The Weekly', family: 'Abril Fatface', size: 96, lh: 1 }, { text: 'Issue 42 · Ideas worth sharing', family: 'Libre Baskerville', size: 24, italic: true, color: '#5b566a' }),
  C('handwritten', 'Handwritten note', 'handwritten casual note', { text: 'thank you!', family: 'Caveat', size: 110, weight: 700, color: '#2b2140', lh: 1 }, { text: 'for being part of our story', family: 'Shadows Into Light', size: 36, color: '#5b566a' }),
  C('luxury', 'Luxury', 'luxury fashion premium gold', { text: 'MAISON', family: 'Cinzel', size: 90, weight: 600, spacing: 150, color: '#b08d57' }, { text: 'Haute Couture Collection', family: 'Cormorant Garamond', size: 34, italic: true, color: '#3a3a3a' }),
  C('game', 'Game night', 'game gaming arcade pixel', { text: 'GAME OVER', family: 'Press Start 2P', size: 50, color: '#7c4dff', lh: 1.4 }, { text: 'Insert coin to continue', family: 'Space Mono', size: 24, color: '#1d1a26' }),
  C('real-estate', 'Real estate', 'real estate home house listing', { text: 'JUST LISTED', family: 'Raleway', size: 26, weight: 800, spacing: 300, color: '#2f9e6e' }, { text: 'Modern Family Home', family: 'Merriweather', size: 62, weight: 700, lh: 1.1 }, { text: '4 bed · 3 bath · 2,400 sq ft', family: 'Raleway', size: 24, color: '#5b566a' }),
  C('podcast', 'Podcast', 'podcast episode audio show', { text: 'EPISODE 12', family: 'Archivo Black', size: 28, spacing: 150, color: '#e2557a' }, { text: 'Building in Public', family: 'Syne', size: 76, weight: 800, lh: 1 }),
  C('recipe', 'Recipe', 'food recipe cooking kitchen', { text: 'Grandma’s', family: 'Satisfy', size: 70, color: '#d9480f', lh: 1 }, { text: 'APPLE PIE', family: 'Fredoka', size: 92, weight: 700, color: '#2b2140', lh: 1 }),
  C('conference', 'Conference', 'conference summit event business', { text: 'DESIGN SUMMIT', family: 'Outfit', size: 76, weight: 800, lh: 1 }, { text: 'Oct 21–23 · Lisbon', family: 'Outfit', size: 30, weight: 400, color: '#7c4dff' }),
  C('travel', 'Travel', 'travel adventure explore', { text: 'Explore', family: 'Permanent Marker', size: 110, color: '#22b8cf', lh: 1 }, { text: 'THE WORLD IS WAITING', family: 'Oswald', size: 30, spacing: 200 }),
  C('spa', 'Wellness', 'spa wellness calm yoga', { text: 'breathe', family: 'Comfortaa', size: 96, weight: 300, color: '#2f9e6e' }, { text: 'Yoga · Meditation · Balance', family: 'Nunito', size: 26, color: '#5b566a' }),
  C('halloween', 'Spooky', 'halloween spooky horror', { text: 'Spooky Night', family: 'Creepster', size: 90, color: '#ff6b00', lh: 1.1 }, { text: 'Costume party · Oct 31', family: 'Kanit', size: 28, weight: 500 }),
  C('kids', 'Kids', 'kids school fun playful', { text: 'Fun Camp!', family: 'Bungee', size: 90, color: '#f59f00', lh: 1 }, { text: 'Games, crafts & adventures', family: 'Fredoka', size: 32, weight: 500, color: '#7c4dff' }),
  C('portfolio', 'Portfolio', 'portfolio resume personal', { text: 'Alex Morgan', family: 'DM Sans', size: 76, weight: 700, lh: 1 }, { text: 'Product Designer & Illustrator', family: 'DM Sans', size: 28, color: '#8d889c' }),
  C('announcement', 'Announcement', 'announcement news big', { text: 'BIG NEWS', family: 'Archivo Black', size: 110, lh: 0.95 }, { text: 'We’re moving to a new studio', family: 'Work Sans', size: 30 }),
  C('neon', 'Neon night', 'neon night club party', { text: 'Open Late', family: 'Monoton', size: 76, color: '#f06595', lh: 1.1 }, { text: 'FRIDAYS · LIVE DJ', family: 'Rubik', size: 26, weight: 600, spacing: 250 }),
  C('book', 'Book cover', 'book cover novel serif', { text: 'The Quiet Hours', family: 'EB Garamond', size: 80, weight: 600, lh: 1.05 }, { text: 'A NOVEL', family: 'EB Garamond', size: 24, spacing: 400, color: '#8d889c' }),
  C('motivation', 'Motivation', 'motivation inspirational', { text: 'Dream big.', family: 'Yeseva One', size: 100, color: '#7c4dff', lh: 1 }, { text: 'Work hard. Stay humble.', family: 'Mulish', size: 32, weight: 600 }),
  C('valentine', 'Valentine', 'love valentine romantic', { text: 'Be Mine', family: 'Great Vibes', size: 120, color: '#e5484d', lh: 1 }, { text: 'FEBRUARY 14', family: 'Prata', size: 26, spacing: 300 }),
  C('agency', 'Agency', 'agency studio creative bold', { text: 'We make brands unforgettable.', family: 'Plus Jakarta Sans', size: 60, weight: 800, lh: 1.08 }, { text: 'Strategy · Identity · Digital', family: 'Plus Jakarta Sans', size: 24, weight: 500, color: '#7c4dff' }),
  C('nature', 'Nature', 'nature outdoor eco green', { text: 'Wild & Free', family: 'Amatic SC', size: 120, weight: 700, color: '#2f6b3a', lh: 1 }, { text: 'Protect the places you love', family: 'Cabin', size: 28 }),
  C('hiring', 'We are hiring', 'hiring job career recruitment', { text: 'WE’RE', family: 'Barlow Condensed', size: 60, weight: 600, spacing: 100, color: '#5b566a', lh: 1 }, { text: 'HIRING', family: 'Barlow Condensed', size: 150, weight: 800, color: '#22b8cf', lh: 0.9 }, { text: 'Apply at cream.jobs', family: 'Barlow', size: 26 }),
  C('event-classic', 'Gala', 'gala classic formal event', { text: 'An Evening Gala', family: 'Libre Baskerville', size: 64, italic: true, lh: 1.15 }, { text: 'BLACK TIE · 7 PM', family: 'Montserrat', size: 22, weight: 600, spacing: 350, color: '#b08d57' }),
  C('blog', 'Blog title', 'blog article header', { text: '10 Tips for Better Sleep', family: 'Merriweather', size: 62, weight: 900, lh: 1.12 }, { text: 'A 5-minute read', family: 'Open Sans', size: 24, color: '#8d889c' }),
  C('festival', 'Festival', 'music festival summer', { text: 'SUMMER', family: 'Black Ops One', size: 110, color: '#ff8a4c', lh: 1 }, { text: 'Music Festival 2026', family: 'Kanit', size: 36, weight: 600 }),
  C('thanks', 'Thanks', 'thanks gratitude card', { text: 'With gratitude', family: 'Dancing Script', size: 90, color: '#2b2140' }, { text: 'From all of us at Cream', family: 'Lato', size: 26, color: '#5b566a' }),
  C('sports', 'Game day', 'sports team game match', { text: 'GAME DAY', family: 'Alfa Slab One', size: 100, color: '#1c7ed6', lh: 1 }, { text: 'Eagles vs Hawks · 7:30 PM', family: 'Roboto', size: 28, weight: 500 }),
  C('class', 'Online class', 'class course education learning', { text: 'Intro to Watercolor', family: 'Fraunces', size: 66, weight: 700, lh: 1.08 }, { text: 'A 4-week beginner course', family: 'Karla', size: 28, color: '#5b566a' }),
  C('mono', 'Developer', 'code developer mono tech', { text: '<build/>', family: 'JetBrains Mono', size: 90, weight: 700, color: '#2f9e6e', lh: 1 }, { text: 'Ship small. Ship often.', family: 'IBM Plex Sans', size: 28 }),
  C('fashion', 'Fashion week', 'fashion style vogue', { text: 'VOGUE', family: 'Bodoni Moda', size: 130, weight: 700, spacing: 50, lh: 1 }, { text: 'The Spring Issue', family: 'Bodoni Moda', size: 32, italic: true }),
  C('charity', 'Charity', 'charity donate fundraiser', { text: 'Give Hope', family: 'Zilla Slab', size: 96, weight: 700, color: '#e2557a', lh: 1 }, { text: 'Every donation feeds a family', family: 'Source Serif 4', size: 28 }),
  C('product', 'New product', 'product new release shop', { text: 'NEW', family: 'Urbanist', size: 34, weight: 800, spacing: 400, color: '#e2557a' }, { text: 'Cloud Runner Pro', family: 'Urbanist', size: 76, weight: 800, lh: 1 }, { text: 'Lighter. Faster. Yours.', family: 'Urbanist', size: 28, color: '#5b566a' }),
  C('christmas', 'Holidays', 'christmas holiday season', { text: 'Merry & Bright', family: 'Mountains of Christmas', size: 90, weight: 700, color: '#c92a2a', lh: 1.1 }, { text: 'SEASON’S GREETINGS', family: 'Cinzel', size: 26, spacing: 250, color: '#2b8a3e' }),
  C('workshop', 'Workshop', 'workshop meetup community', { text: 'Community Workshop', family: 'Manrope', size: 64, weight: 800, lh: 1.08 }, { text: 'Free entry · Snacks provided', family: 'Manrope', size: 26, color: '#7c4dff' }),
];

/** Lay a combo out as grouped text elements. `width` is the block width in design px; centred at (cx, cy). */
export function comboElements(combo: FontCombo, width: number, cx: number, cy: number): TextEl[] {
  const k = width / 600;
  const gid = uid();
  let y = 0;
  const els = combo.lines.map((l) => {
    const size = Math.round(l.size * k * 10) / 10;
    const el = makeText(l.text, cx - width / 2, 0, width, {
      fontFamily: l.family,
      fontSize: size,
      fontWeight: l.weight ?? 400,
      italic: !!l.italic,
      color: l.color ?? '#1d1a26',
      uppercase: !!l.upper,
      letterSpacing: l.spacing ?? 0,
      lineHeight: l.lh ?? 1.25,
      align: 'center',
    });
    // Estimate wrapping so stacked lines don't overlap before the renderer measures them.
    const perLine = l.text.split('\n').map((t) => Math.max(1, Math.ceil((t.length * size * (l.upper ? 0.62 : 0.52) * (1 + (l.spacing ?? 0) / 1000)) / width)));
    el.h = Math.round(size * (l.lh ?? 1.25) * perLine.reduce((a, b) => a + b, 0));
    el.y = y;
    y += el.h + size * 0.18;
    el.groupId = combo.lines.length > 1 ? gid : undefined;
    return el;
  });
  const total = y;
  els.forEach((e) => (e.y += cy - total / 2));
  return els;
}

export const comboFamilies = (c: FontCombo) => [...new Set(c.lines.map((l) => l.family))];
