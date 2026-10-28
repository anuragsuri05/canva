// Wikimedia Commons video search (keyless, CORS via origin=*).
import type { Credit } from '../model/types';
import { getJson, qs } from './http';

const API = 'https://commons.wikimedia.org/w/api.php';
const PAGE = 20;

export interface VideoItem {
  id: string;
  title: string;
  poster: string;
  posterLarge: string;
  original: string;
  preview: string; // small transcode for hover previews
  w: number;
  h: number;
  duration: number;
  mime: string;
  size: number;
  credit: Credit;
}

const stripHtml = (s?: string) => (s ? s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : undefined);
const clean = (u: string) => u.split('?')[0];

/** Transcoded VP9 WebM derivative that Commons generates for every video. */
export function transcodeUrl(original: string, height: number) {
  const u = clean(original);
  const m = /\/wikipedia\/commons\/(.)\/(..)\/([^/]+)$/.exec(u);
  if (!m) return u;
  return `https://upload.wikimedia.org/wikipedia/commons/transcoded/${m[1]}/${m[2]}/${m[3]}/${m[3]}.${height}p.vp9.webm`;
}

export async function searchVideos(q: string, page: number, signal?: AbortSignal) {
  const url =
    API +
    '?' +
    qs({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrnamespace: 6,
      gsrsearch: `${q || 'nature'} filetype:video`,
      gsrlimit: PAGE,
      gsroffset: (page - 1) * PAGE,
      prop: 'imageinfo',
      iiprop: 'url|mime|size|dimensions|extmetadata',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|ObjectName',
      iiurlwidth: 400,
    });
  const data = await getJson<any>(url, signal);
  const pages = Object.values<any>(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const items: VideoItem[] = pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii?.url || !ii.thumburl) return null;
      const md = ii.extmetadata ?? {};
      const title = String(p.title ?? '').replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
      const h = ii.height || 360;
      const item: VideoItem = {
        id: String(p.pageid),
        title,
        poster: ii.thumburl,
        posterLarge: ii.responsiveUrls?.['2'] ?? ii.thumburl,
        original: clean(ii.url),
        preview: transcodeUrl(ii.url, h >= 240 ? 240 : 120),
        w: ii.width || 640,
        h,
        duration: Number(ii.duration) || 0,
        mime: ii.mime,
        size: ii.size,
        credit: {
          title,
          creator: stripHtml(md.Artist?.value),
          license: stripHtml(md.LicenseShortName?.value),
          licenseUrl: stripHtml(md.LicenseUrl?.value),
          source: 'wikimedia',
          landingUrl: ii.descriptionurl,
        },
      };
      return item;
    })
    .filter((x): x is VideoItem => !!x && x.duration > 0);
  return { items, hasMore: !!data.continue };
}

async function exists(url: string) {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-1' } });
    return r.ok || r.status === 206;
  } catch {
    return false;
  }
}

/** Pick a playable, reasonably sized source: a 720p/480p VP9 transcode if it exists, else the original. */
export async function playableSrc(v: VideoItem): Promise<string> {
  const heights = [720, 480, 360].filter((x) => x <= v.h);
  for (const hgt of heights) {
    const u = transcodeUrl(v.original, hgt);
    if (await exists(u)) return u;
  }
  return v.original;
}
