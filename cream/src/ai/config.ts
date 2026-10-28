// AI settings: bring-your-own-key, stored in the browser only.
// Persistent settings live in useApp().settings.ai; when "Remember" is off the keys
// are kept in sessionStorage instead (cleared when the tab closes).
import { create } from 'zustand';
import type { AISettings } from '../model/types';
import { useApp } from '../store/app';

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export const PROVIDERS: { id: ProviderId; name: string; label: string; defaultModel: string; keyHint: string; keyUrl: string; color: string }[] = [
  { id: 'anthropic', name: 'Claude', label: 'Anthropic Claude', defaultModel: 'claude-opus-5-5', keyHint: 'sk-ant-…', keyUrl: 'https://platform.claude.com/settings/keys', color: '#d97757' },
  { id: 'openai', name: 'ChatGPT', label: 'OpenAI ChatGPT', defaultModel: 'gpt-5.6-sol', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys', color: '#10a37f' },
  { id: 'gemini', name: 'Gemini', label: 'Google Gemini', defaultModel: 'gemini-3.5-flash', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/app/apikey', color: '#4285f4' },
];

export const DEFAULT_AI: AISettings = { provider: 'none', keys: {}, models: {}, remember: true, memory: '' };

const SESSION_KEYS = 'cream-ai-keys';

function readSessionKeys(): AISettings['keys'] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEYS) || '{}');
  } catch {
    return {};
  }
}

/** Session-only keys (used when remember = false). */
export const useSessionKeys = create<{ keys: AISettings['keys'] }>(() => ({ keys: readSessionKeys() }));

export function getAI(): AISettings {
  const s = { ...DEFAULT_AI, ...(useApp.getState().settings.ai ?? {}) };
  const keys = s.remember ? s.keys ?? {} : useSessionKeys.getState().keys;
  return { ...s, keys, models: s.models ?? {} };
}

export function setAI(patch: Partial<AISettings>) {
  const cur = getAI();
  const next: AISettings = { ...cur, ...patch, keys: { ...cur.keys, ...(patch.keys ?? {}) }, models: { ...cur.models, ...(patch.models ?? {}) } };
  // drop empty keys
  for (const k of Object.keys(next.keys) as ProviderId[]) if (!next.keys[k]) delete next.keys[k];
  if (next.remember) {
    try {
      sessionStorage.removeItem(SESSION_KEYS);
    } catch {
      /* ignore */
    }
    useSessionKeys.setState({ keys: {} });
    useApp.getState().updateSettings({ ai: next });
  } else {
    try {
      sessionStorage.setItem(SESSION_KEYS, JSON.stringify(next.keys));
    } catch {
      /* ignore */
    }
    useSessionKeys.setState({ keys: next.keys });
    useApp.getState().updateSettings({ ai: { ...next, keys: {} } });
  }
}

export interface ActiveConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
}

/** The configured provider (or first provider that has a key). null → keyless mode. */
export function activeConfig(): ActiveConfig | null {
  const s = getAI();
  const order: ProviderId[] = s.provider !== 'none' ? [s.provider, ...PROVIDERS.map((p) => p.id).filter((p) => p !== s.provider)] : PROVIDERS.map((p) => p.id);
  for (const p of order) {
    const apiKey = s.keys[p];
    if (apiKey) return { provider: p, apiKey, model: s.models[p] || PROVIDERS.find((x) => x.id === p)!.defaultModel };
  }
  return null;
}

/** Reactive: is an LLM configured? */
export function useHasKey(): boolean {
  const remember = useApp((s) => s.settings.ai?.remember ?? true);
  const persisted = useApp((s) => {
    const k = s.settings.ai?.keys;
    return !!(k && (k.anthropic || k.openai || k.gemini));
  });
  const session = useSessionKeys((s) => !!(s.keys.anthropic || s.keys.openai || s.keys.gemini));
  return remember ? persisted : session;
}

/** Reactive: label of the active provider/model, e.g. "Claude · claude-opus-5-5". */
export function useActiveLabel(): string {
  useApp((s) => s.settings.ai);
  useSessionKeys((s) => s.keys);
  const c = activeConfig();
  if (!c) return 'Free mode (no key)';
  return `${PROVIDERS.find((p) => p.id === c.provider)!.name} · ${c.model}`;
}

export const providerName = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!.name;

export function memoryNote(): string {
  const m = getAI().memory?.trim();
  return m ? `\n\nAbout the user (their saved memory/preferences): ${m}` : '';
}

export function brandVoice(): string {
  return useApp.getState().brandKits[0]?.voice?.trim() ?? '';
}

/** Open AI settings (account settings section). */
export function openAISettings() {
  useApp.getState().navigate({ name: 'home', section: 'settings', param: 'ai' });
}
