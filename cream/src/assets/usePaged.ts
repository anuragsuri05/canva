// Generic paged-search hook: resets + aborts on key change, appends on loadMore, exposes error/retry.
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbort } from './http';

export interface PageResult<T> {
  items: T[];
  hasMore: boolean;
}

export interface Paged<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/**
 * `key` identifies the query (null = idle). `fetchPage(page, signal)` is 1-based.
 * Pages are deduped by `idOf` so overlapping API pages don't produce duplicate tiles.
 */
export function usePaged<T>(key: string | null, fetchPage: (page: number, signal: AbortSignal) => Promise<PageResult<T>>, idOf?: (t: T) => string): Paged<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const ctrl = useRef<AbortController | null>(null);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const idRef = useRef(idOf);
  idRef.current = idOf;
  const busy = useRef(false);
  const [nonce, setNonce] = useState(0);

  const load = useCallback((p: number, reset: boolean) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    busy.current = true;
    setLoading(true);
    setError(null);
    fetchRef
      .current(p, c.signal)
      .then((r) => {
        if (c.signal.aborted) return;
        page.current = p;
        setItems((prev) => {
          if (reset) return r.items;
          const f = idRef.current;
          if (!f) return [...prev, ...r.items];
          const seen = new Set(prev.map(f));
          return [...prev, ...r.items.filter((x) => !seen.has(f(x)))];
        });
        setHasMore(r.hasMore);
      })
      .catch((e) => {
        if (c.signal.aborted || isAbort(e)) return;
        setError(e?.message || 'Something went wrong.');
        setHasMore(false);
      })
      .finally(() => {
        if (ctrl.current === c) {
          busy.current = false;
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    if (key == null) {
      ctrl.current?.abort();
      setItems([]);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }
    setItems([]);
    page.current = 0;
    load(1, true);
    return () => ctrl.current?.abort();
  }, [key, nonce, load]);

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore) return;
    load(page.current + 1, false);
  }, [hasMore, load]);

  const retry = useCallback(() => {
    if (page.current === 0) setNonce((n) => n + 1);
    else load(page.current + 1, false);
  }, [load]);

  return { items, loading, error, hasMore, loadMore, retry };
}

/** Paginate a list we already have client-side (e.g. an icon set) with the same interface. */
export function useLocalPaged<T>(key: string | null, loadAll: () => Promise<T[]>, pageSize = 60): Paged<T> {
  const all = useRef<T[]>([]);
  return usePaged<T>(key, async (p) => {
    if (p === 1) all.current = await loadAll();
    const items = all.current.slice((p - 1) * pageSize, p * pageSize);
    return { items, hasMore: p * pageSize < all.current.length };
  });
}
