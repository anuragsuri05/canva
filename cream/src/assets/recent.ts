// "Recently used" elements, persisted in localStorage and shared across panels.
import { useSyncExternalStore } from 'react';
import type { ShapeKind, ChartType, FrameShape } from '../model/types';
import type { PhotoItem, AudioItem } from './openverse';
import type { VideoItem } from './wikimedia';

export type RecentItem =
  | { kind: 'shape'; key: string; shape: ShapeKind }
  | { kind: 'icon'; key: string; id: string }
  | { kind: 'photo'; key: string; item: PhotoItem }
  | { kind: 'video'; key: string; item: VideoItem }
  | { kind: 'audio'; key: string; item: AudioItem }
  | { kind: 'line'; key: string; preset: string }
  | { kind: 'chart'; key: string; chart: ChartType }
  | { kind: 'frame'; key: string; frame: FrameShape; letter?: string }
  | { kind: 'grid'; key: string; layout: string }
  | { kind: 'table'; key: string; rows: number; cols: number }
  | { kind: 'gradient'; key: string; idx: number; shape: ShapeKind };

const LS = 'cream.recentElements';
const MAX = 24;
const listeners = new Set<() => void>();
let cache: RecentItem[] = read();

function read(): RecentItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function addRecent(item: RecentItem) {
  cache = [item, ...cache.filter((x) => x.key !== item.key)].slice(0, MAX);
  try {
    localStorage.setItem(LS, JSON.stringify(cache));
  } catch {
    /* storage full / blocked */
  }
  listeners.forEach((l) => l());
}

export function clearRecent() {
  cache = [];
  try {
    localStorage.removeItem(LS);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useRecent(): RecentItem[] {
  return useSyncExternalStore(subscribe, () => cache);
}

/* ---------- Generic small "recent list" helper (apps, searches) ---------- */
export function readList(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function pushList(key: string, value: string, max = 12) {
  const next = [value, ...readList(key).filter((x) => x !== value)].slice(0, max);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
