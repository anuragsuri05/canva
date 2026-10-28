// Translation: the configured LLM when a key exists, else the free keyless MyMemory API.
import { activeConfig } from './config';
import { completeJSON } from './providers';
import { langName } from './languages';

export type Tone = 'original' | 'conversational' | 'informative' | 'professional' | 'friendly' | 'inspirational';

const cache = new Map<string, string>();

async function myMemory(text: string, target: string, signal?: AbortSignal): Promise<string> {
  if (!text.trim()) return text;
  const key = `${target}\u0000${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  // MyMemory caps queries at ~500 bytes: split long text on sentence boundaries.
  if (text.length > 450) {
    const parts = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
    const chunks: string[] = [];
    let cur = '';
    for (const p of parts) {
      if ((cur + p).length > 450 && cur) {
        chunks.push(cur);
        cur = '';
      }
      cur += p;
    }
    if (cur) chunks.push(cur);
    const out: string[] = [];
    for (const c of chunks) out.push(await myMemory(c, target, signal));
    return out.join(' ');
  }
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=autodetect|${encodeURIComponent(target)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Translation service error ${res.status}`);
  const j = await res.json();
  if (j.quotaFinished) throw new Error('The free translation quota for today is used up. Add an AI key in settings to keep translating.');
  if (j.responseStatus && Number(j.responseStatus) !== 200) {
    // already in the target language → keep as is
    if (/DISTINCT LANGUAGES|SAME LANGUAGE/i.test(String(j.responseDetails))) return text;
    throw new Error(j.responseDetails || 'Translation failed');
  }
  let t: string = j.responseData?.translatedText ?? text;
  // MyMemory sometimes returns HTML entities
  const d = document.createElement('textarea');
  d.innerHTML = t;
  t = d.value;
  // keep the original casing style for ALL CAPS strings
  if (text === text.toUpperCase() && /[A-Z]/.test(text)) t = t.toUpperCase();
  const out = lead + t.trim() + trail;
  cache.set(key, out);
  return out;
}

/**
 * Translate a list of strings into `targetLang` (code like 'es', 'zh-CN').
 * Order and count are preserved. Whitespace-only strings pass through.
 */
export async function translateText(texts: string[], targetLang: string, opts: { tone?: Tone; signal?: AbortSignal; forceFree?: boolean } = {}): Promise<string[]> {
  const cfg = opts.forceFree ? null : activeConfig();
  if (cfg && texts.some((t) => t.trim())) {
    const tone = opts.tone && opts.tone !== 'original' ? ` Use a ${opts.tone} tone.` : ' Keep the original tone.';
    try {
      const res = await completeJSON<{ translations: string[] }>(
        {
          system: `You are a professional translator for graphic designs. Translate each string into ${langName(targetLang)} (${targetLang}).${tone} Keep translations concise so they fit the same space. Preserve leading/trailing whitespace, numbers, emoji, URLs, brand names and line breaks. Return exactly one translation per input, in order.`,
          messages: [{ role: 'user', content: JSON.stringify({ strings: texts }) }],
          json: { type: 'object', properties: { translations: { type: 'array', items: { type: 'string' } } }, required: ['translations'], additionalProperties: false },
          signal: opts.signal,
        },
        cfg,
      );
      if (Array.isArray(res.translations) && res.translations.length === texts.length) return res.translations.map((t, i) => (texts[i].trim() ? String(t) : texts[i]));
    } catch (e) {
      if ((e as Error).name === 'AbortError' || (e as any).kind === 'stopped') throw e;
      // fall through to the free service
    }
  }
  const out: string[] = [];
  // small concurrency to be gentle on the free API
  const N = 3;
  for (let i = 0; i < texts.length; i += N) {
    const batch = await Promise.all(texts.slice(i, i + N).map((t) => (t.trim() ? myMemory(t, targetLang, opts.signal) : Promise.resolve(t))));
    out.push(...batch);
  }
  return out;
}

/**
 * Translate rich text HTML by translating its text nodes in place (keeps b/i/span styling).
 * Adjacent inline nodes in the same block are translated separately — fine for typical design text.
 */
export async function translateHtml(htmls: string[], targetLang: string, opts: { tone?: Tone; signal?: AbortSignal } = {}): Promise<string[]> {
  const docs = htmls.map((h) => {
    const d = document.createElement('div');
    d.innerHTML = h;
    return d;
  });
  const nodes: Text[] = [];
  for (const d of docs) {
    const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) if (/\p{L}/u.test(n.nodeValue ?? '')) nodes.push(n as Text);
  }
  if (!nodes.length) return htmls;
  const tr = await translateText(
    nodes.map((n) => n.nodeValue ?? ''),
    targetLang,
    opts,
  );
  nodes.forEach((n, i) => (n.nodeValue = tr[i]));
  return docs.map((d) => d.innerHTML);
}
