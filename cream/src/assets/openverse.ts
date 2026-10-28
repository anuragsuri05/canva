// Openverse (https://openverse.org) — ~800M CC-licensed images and ~3M audio tracks. Keyless, CORS-enabled.
// Anonymous access is capped at ~240 results per query (page_size 20 → 12 pages).
import type { Credit } from '../model/types';
import { getJson, qs } from './http';

const API = 'https://api.openverse.org/v1';
export const PAGE_SIZE = 20;
const MAX_PAGES = 12;

export interface PhotoItem {
  id: string;
  title: string;
  thumb: string; // small CORS thumbnail for the grid
  src: string; // full-size CORS-enabled URL used when inserting
  w: number;
  h: number;
  credit: Credit;
}

export interface AudioItem {
  id: string;
  title: string;
  src: string;
  duration: number; // seconds
  creator: string;
  genres: string[];
  thumb?: string;
  category?: string;
  credit: Credit;
}

export interface Paged<T> {
  items: T[];
  hasMore: boolean;
  total?: number;
}

export type Orientation = '' | 'tall' | 'wide' | 'square';
export type ImageCategory = '' | 'photograph' | 'illustration' | 'digitized_artwork';

export interface ImageQuery {
  q: string;
  orientation?: Orientation;
  category?: ImageCategory;
  commercial?: boolean;
  size?: '' | 'small' | 'medium' | 'large';
}

function licenseLabel(code: string, version?: string) {
  if (!code) return 'CC';
  if (code === 'cc0') return 'CC0';
  if (code === 'pdm') return 'Public Domain Mark';
  return `CC ${code.toUpperCase()}${version ? ' ' + version : ''}`;
}

function creditOf(r: any): Credit {
  return {
    title: r.title || undefined,
    creator: r.creator || undefined,
    creatorUrl: r.creator_url || undefined,
    license: licenseLabel(r.license, r.license_version),
    licenseUrl: r.license_url || undefined,
    source: 'openverse' + (r.source ? `/${r.source}` : ''),
    landingUrl: r.foreign_landing_url || undefined,
  };
}

export async function searchImages(query: ImageQuery, page: number, signal?: AbortSignal): Promise<Paged<PhotoItem>> {
  const url =
    `${API}/images/?` +
    qs({
      q: query.q || 'nature',
      page,
      page_size: PAGE_SIZE,
      aspect_ratio: query.orientation || undefined,
      category: query.category || undefined,
      license_type: query.commercial ? 'commercial' : undefined,
      size: query.size || undefined,
      mature: false,
    });
  const data = await getJson<any>(url, signal);
  const items: PhotoItem[] = (data.results ?? [])
    .filter((r: any) => r.id)
    .map((r: any) => ({
      id: r.id,
      title: r.title || 'Untitled',
      thumb: `${API}/images/${r.id}/thumb/`,
      src: `${API}/images/${r.id}/thumb/?full_size=true&compressed=false`,
      w: r.width || 800,
      h: r.height || 600,
      credit: creditOf(r),
    }));
  const pageCount = Math.min(MAX_PAGES, data.page_count ?? 0);
  return { items, hasMore: page < pageCount && items.length > 0, total: data.result_count };
}

export type AudioCategory = '' | 'music' | 'sound_effect';
export type AudioLength = '' | 'short' | 'medium' | 'long';

export async function searchAudio(query: { q: string; category?: AudioCategory; length?: AudioLength }, page: number, signal?: AbortSignal): Promise<Paged<AudioItem>> {
  const url =
    `${API}/audio/?` +
    qs({
      q: query.q || 'music',
      page,
      page_size: PAGE_SIZE,
      category: query.category || undefined,
      length: query.length || undefined,
      mature: false,
    });
  const data = await getJson<any>(url, signal);
  const items: AudioItem[] = (data.results ?? [])
    .filter((r: any) => r.url)
    .map((r: any) => ({
      id: r.id,
      title: r.title || 'Untitled track',
      src: r.url,
      duration: r.duration ? r.duration / 1000 : 0,
      creator: r.creator || 'Unknown artist',
      genres: r.genres ?? [],
      category: r.category,
      thumb: r.thumbnail || undefined,
      credit: creditOf(r),
    }));
  const pageCount = Math.min(MAX_PAGES, data.page_count ?? 0);
  return { items, hasMore: page < pageCount && items.length > 0, total: data.result_count };
}

/** Random photo backgrounds from Picsum (no query needed). */
export function picsumPhotos(page: number, count = 18, w = 1600, h = 1000): PhotoItem[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = `cream-${page}-${i}`;
    return {
      id: 'picsum-' + seed,
      title: 'Picsum photo',
      thumb: `https://picsum.photos/seed/${seed}/300/200`,
      src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
      w,
      h,
      credit: { title: 'Photo via Lorem Picsum', creator: 'Unsplash contributors', license: 'Unsplash License', source: 'picsum', landingUrl: 'https://picsum.photos' },
    };
  });
}

export const fmtDuration = (s: number) => {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};
