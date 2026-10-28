/**
 * Provider adapters over plain fetch: Anthropic Claude, OpenAI ChatGPT and Google Gemini.
 * Calls go straight from the browser to the provider with the user's own key (no backend).
 */
import type { ActiveConfig, ProviderId } from './config';
import { activeConfig, getAI } from './config';

export type Part = { type: 'text'; text: string } | { type: 'image'; mediaType: 'image/png' | 'image/jpeg'; data: string };
export interface Msg {
  role: 'user' | 'assistant';
  content: string | Part[];
}

export class AIError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate' | 'refusal' | 'network' | 'model' | 'nokey' | 'stopped' | 'other' = 'other',
  ) {
    super(message);
  }
}

const NAMES: Record<ProviderId, string> = { anthropic: 'Claude', openai: 'OpenAI', gemini: 'Gemini' };
const CLAUDE_FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-fable-5-1', 'claude-opus-5', 'claude-sonnet-5-5']);
const claudeSupportsEffort = (m: string) => /^claude-(opus-5|fable|mythos|sonnet-5|haiku-5|opus-4-[5678])/.test(m);

async function httpError(provider: ProviderId, res: Response): Promise<AIError> {
  let msg = '';
  try {
    const j = await res.json();
    msg = j?.error?.message ?? j?.message ?? JSON.stringify(j);
  } catch {
    msg = res.statusText;
  }
  const s = res.status;
  if (s === 401 || s === 403 || /API key not valid|API_KEY_INVALID|invalid x-api-key/i.test(msg))
    return new AIError(`${NAMES[provider]} rejected the API key (${s}). Check it in AI settings.`, 'auth');
  if (s === 429) return new AIError(`Rate limited by ${NAMES[provider]} — wait a moment and try again.`, 'rate');
  if (s === 404) return new AIError(`Model not found (${msg}). Pick another model in AI settings.`, 'model');
  if (s === 529 || s === 503) return new AIError(`${NAMES[provider]} is overloaded right now — try again shortly.`, 'rate');
  return new AIError(`${NAMES[provider]} error ${s}: ${msg}`, 'other');
}

function netError(e: unknown): AIError {
  if (e instanceof AIError) return e;
  const err = e as Error;
  if (err?.name === 'AbortError') return new AIError('Stopped', 'stopped');
  if (/Failed to fetch|NetworkError|Load failed/i.test(err?.message ?? '')) return new AIError('Network error — check your connection (or the provider blocked the browser request).', 'network');
  return new AIError(err?.message ?? String(e));
}

/** Read an SSE stream, calling onEvent(data) for each `data:` payload. */
async function readSSE(res: Response, onEvent: (data: string) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, '');
      buf = buf.slice(idx + 1);
      if (line.startsWith('data:')) onEvent(line.slice(5).trim());
    }
  }
  if (buf.startsWith('data:')) onEvent(buf.slice(5).trim());
}

const toParts = (c: string | Part[]): Part[] => (typeof c === 'string' ? [{ type: 'text', text: c }] : c);

/* ------------------------------------------------------------------ Claude */

async function claude(cfg: ActiveConfig, o: CompleteOpts, allowFallback = true): Promise<string> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: o.maxTokens ?? 32000,
    system: o.json && o.strictSchema === false ? `${o.system}\n\nRespond with ONLY a single JSON object (no prose, no code fences) matching this JSON schema:\n${JSON.stringify(o.json)}` : o.system,
    stream: true,
    messages: o.messages.map((m) => ({
      role: m.role,
      content: toParts(m.content).map((p) =>
        p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.data } },
      ),
    })),
  };
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': cfg.apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  const oc: Record<string, unknown> = {};
  if (claudeSupportsEffort(cfg.model)) oc.effort = o.effort ?? 'low';
  if (o.json && o.strictSchema !== false) oc.format = { type: 'json_schema', schema: o.json };
  if (Object.keys(oc).length) body.output_config = oc;
  if (allowFallback && CLAUDE_FALLBACK_MODELS.has(cfg.model)) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    body.fallbacks = 'default';
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body), signal: o.signal });
  if (!res.ok) {
    const err = await httpError('anthropic', res);
    // Retry without optional features if the account/model rejects them.
    if (res.status === 400 && (allowFallback || (o.json && o.strictSchema !== false)) && /fallback|beta|output_config|format|schema/i.test(err.message)) {
      return claude(cfg, { ...o, strictSchema: /format|schema/i.test(err.message) ? false : o.strictSchema }, false);
    }
    throw err;
  }
  let text = '';
  let stop = '';
  await readSSE(res, (data) => {
    if (!data || data === '[DONE]') return;
    let ev: any;
    try {
      ev = JSON.parse(data);
    } catch {
      return;
    }
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
      text += ev.delta.text;
      o.onText?.(ev.delta.text, text);
    } else if (ev.type === 'message_delta' && ev.delta?.stop_reason) stop = ev.delta.stop_reason;
    else if (ev.type === 'error') throw new AIError(ev.error?.message ?? 'Claude stream error');
  });
  if (stop === 'refusal' && !text) throw new AIError('Claude declined this request.', 'refusal');
  return text;
}

/* ------------------------------------------------------------------ OpenAI */

async function openai(cfg: ActiveConfig, o: CompleteOpts): Promise<string> {
  const system = o.json ? `${o.system}\n\nRespond with a single JSON object matching this JSON schema:\n${JSON.stringify(o.json)}` : o.system;
  const body: Record<string, unknown> = {
    model: cfg.model,
    stream: true,
    messages: [
      { role: 'system', content: system },
      ...o.messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((p) => (p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.data}` } })),
      })),
    ],
  };
  if (o.json) body.response_format = { type: 'json_object' };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(body),
    signal: o.signal,
  });
  if (!res.ok) throw await httpError('openai', res);
  let text = '';
  await readSSE(res, (data) => {
    if (!data || data === '[DONE]') return;
    try {
      const ev = JSON.parse(data);
      const d = ev.choices?.[0]?.delta;
      if (d?.refusal) throw new AIError(d.refusal, 'refusal');
      if (d?.content) {
        text += d.content;
        o.onText?.(d.content, text);
      }
    } catch (e) {
      if (e instanceof AIError) throw e;
    }
  });
  return text;
}

/* ------------------------------------------------------------------ Gemini */

async function gemini(cfg: ActiveConfig, o: CompleteOpts): Promise<string> {
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: o.json ? `${o.system}\n\nRespond with a single JSON object matching this JSON schema:\n${JSON.stringify(o.json)}` : o.system }] },
    contents: o.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toParts(m.content).map((p) => (p.type === 'text' ? { text: p.text } : { inlineData: { mimeType: p.mediaType, data: p.data } })),
    })),
  };
  if (o.json) body.generationConfig = { responseMimeType: 'application/json' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    body: JSON.stringify(body),
    signal: o.signal,
  });
  if (!res.ok) throw await httpError('gemini', res);
  let text = '';
  let block = '';
  await readSSE(res, (data) => {
    try {
      const ev = JSON.parse(data);
      if (ev.promptFeedback?.blockReason) block = ev.promptFeedback.blockReason;
      const parts = ev.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        if (p.text && !p.thought) {
          text += p.text;
          o.onText?.(p.text, text);
        }
      }
    } catch {
      /* ignore partial */
    }
  });
  if (!text && block) throw new AIError(`Gemini blocked this request (${block}).`, 'refusal');
  return text;
}

/* ------------------------------------------------------------------ public */

export interface CompleteOpts {
  system: string;
  messages: Msg[];
  json?: Record<string, unknown>; // JSON schema → reply is a JSON object
  strictSchema?: boolean; // false: describe the schema in the prompt instead of constrained decoding (big/loose schemas)
  signal?: AbortSignal;
  onText?: (delta: string, full: string) => void;
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
}

/** One request to the active provider. Throws AIError('nokey') when nothing is configured. */
export async function complete(o: CompleteOpts, cfg: ActiveConfig | null = activeConfig()): Promise<string> {
  if (!cfg) throw new AIError('Add an API key in AI settings to use this feature.', 'nokey');
  try {
    if (cfg.provider === 'anthropic') return await claude(cfg, o);
    if (cfg.provider === 'openai') return await openai(cfg, o);
    return await gemini(cfg, o);
  } catch (e) {
    throw netError(e);
  }
}

export async function completeJSON<T>(o: CompleteOpts & { json: Record<string, unknown> }, cfg?: ActiveConfig | null): Promise<T> {
  const text = await complete(o, cfg === undefined ? activeConfig() : cfg);
  return parseJSONLoose<T>(text);
}

export function parseJSONLoose<T>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(t) as T;
  } catch {
    /* try to extract */
  }
  const start = t.search(/[[{]/);
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1)) as T;
    } catch {
      /* fallthrough */
    }
  }
  throw new AIError('The model did not return valid JSON. Try again.', 'other');
}

/** Lists chat-capable models for a key; doubles as a key test. */
export async function listModels(provider: ProviderId, apiKey: string): Promise<string[]> {
  try {
    if (provider === 'anthropic') {
      const out: string[] = [];
      let after = '';
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`https://api.anthropic.com/v1/models?limit=100${after ? `&after_id=${after}` : ''}`, {
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        });
        if (!res.ok) throw await httpError('anthropic', res);
        const j = await res.json();
        out.push(...(j.data ?? []).map((m: any) => m.id));
        if (!j.has_more) break;
        after = j.last_id;
      }
      return out;
    }
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', { headers: { authorization: `Bearer ${apiKey}` } });
      if (!res.ok) throw await httpError('openai', res);
      const j = await res.json();
      return (j.data ?? [])
        .map((m: any) => m.id as string)
        .filter((id: string) => /^(gpt|o\d|chatgpt)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|embedding|moderation|instruct)/.test(id))
        .sort()
        .reverse();
    }
    const out: string[] = [];
    let token = '';
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${token ? `&pageToken=${token}` : ''}`, { headers: { 'x-goog-api-key': apiKey } });
      if (!res.ok) throw await httpError('gemini', res);
      const j = await res.json();
      for (const m of j.models ?? []) {
        if (m.supportedGenerationMethods && !m.supportedGenerationMethods.includes('generateContent')) continue;
        const id = String(m.name).replace(/^models\//, '');
        if (/^gemini/.test(id) && !/(tts|image|embedding|audio|live)/.test(id)) out.push(id);
      }
      token = j.nextPageToken;
      if (!token) break;
    }
    return out.sort().reverse();
  } catch (e) {
    throw netError(e);
  }
}

/** Pick the configured model if available, else the best match from the list. */
export function chooseModel(provider: ProviderId, wanted: string, available: string[]): string {
  if (!available.length || available.includes(wanted)) return wanted;
  const prefs: Record<ProviderId, RegExp[]> = {
    anthropic: [/^claude-opus-5-5$/, /^claude-opus-5/, /^claude-sonnet-5-5$/, /^claude-sonnet/, /^claude/],
    openai: [/^gpt-6/, /^gpt-5\.6-sol/, /^gpt-5\.\d/, /^gpt-5/, /^gpt/],
    gemini: [/^gemini-3\.5-(pro|flash)$/, /^gemini-3/, /^gemini-2\.5-pro/, /^gemini/],
  };
  for (const re of prefs[provider]) {
    const hit = available.find((m) => re.test(m));
    if (hit) return hit;
  }
  return available[0];
}

/** Optional: OpenAI image generation when a key exists (used if the free engine is unavailable). */
export async function openaiImage(prompt: string, size: { width: number; height: number }, signal?: AbortSignal): Promise<Blob> {
  const s = activeConfigFor('openai');
  if (!s) throw new AIError('No OpenAI key', 'nokey');
  const r = size.width / size.height;
  const sz = r > 1.2 ? '1536x1024' : r < 0.83 ? '1024x1536' : '1024x1024';
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: sz, n: 1 }),
    signal,
  });
  if (!res.ok) throw await httpError('openai', res);
  const j = await res.json();
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new AIError('OpenAI returned no image');
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: 'image/png' });
}

function activeConfigFor(p: ProviderId): string | undefined {
  return getAI().keys[p];
}
