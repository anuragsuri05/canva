// Tiny fetch helpers shared by the asset services: in-memory caching + abort support.

const jsonCache = new Map<string, unknown>();
const textCache = new Map<string, string>();
const inflightText = new Map<string, Promise<string>>();

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export const isAbort = (e: unknown) => (e as any)?.name === 'AbortError';

/** GET JSON with an in-memory cache. Aborted / failed requests are never cached. */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (jsonCache.has(url)) return jsonCache.get(url) as T;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (isAbort(e)) throw e;
    throw new HttpError('Network error. Check your connection and try again.');
  }
  if (res.status === 429) throw new HttpError('Too many requests right now. Please wait a moment and retry.', 429);
  if (!res.ok) throw new HttpError(`The service returned an error (${res.status}).`, res.status);
  const data = (await res.json()) as T;
  jsonCache.set(url, data);
  if (jsonCache.size > 400) jsonCache.delete(jsonCache.keys().next().value!);
  return data;
}

/** GET text with a shared cache (deduplicates concurrent calls). */
export function getText(url: string): Promise<string> {
  const hit = textCache.get(url);
  if (hit !== undefined) return Promise.resolve(hit);
  let p = inflightText.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new HttpError(`Request failed (${r.status})`, r.status);
        return r.text();
      })
      .then((t) => {
        textCache.set(url, t);
        inflightText.delete(url);
        return t;
      })
      .catch((e) => {
        inflightText.delete(url);
        throw e;
      });
    inflightText.set(url, p);
  }
  return p;
}

export const peekText = (url: string) => textCache.get(url);

export const qs = (o: Record<string, string | number | boolean | undefined | null>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
