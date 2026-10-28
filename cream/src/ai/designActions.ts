// Turning AI results into designs/pages (shared by the editor panel and the home page).
import type { Draft } from 'immer';
import type { Design, Page } from '../model/types';
import { cloneElements, newDesign, uid } from '../model/defaults';
import { presetById } from '../model/presets';
import { useApp } from '../store/app';
import { currentPage, useEditor } from '../store/editor';
import {
  detectFormat,
  ensureFontsFor,
  fillStockImages,
  fitPages,
  generateDesignSpecsKeyless,
  generateDesignSpecsLLM,
  specToPages,
  templateDesigns,
  upgradeImagesWithAI,
  type ImageJob,
} from './designGen';
import { activeConfig } from './config';

export interface Candidate {
  id: string;
  title: string;
  width: number;
  height: number;
  pages: Page[];
  jobs: ImageJob[]; // pageId / elId refer to `pages`
  source: 'ai' | 'template' | 'layout';
}

/** Generate up to 4 design candidates (LLM if configured, else templates/layouts). */
export async function generateCandidates(
  prompt: string,
  o: { width: number; height: number; signal?: AbortSignal; onText?: (t: string) => void; context?: string; count?: number },
): Promise<Candidate[]> {
  const { width: W, height: H } = o;
  const out: Candidate[] = [];
  if (activeConfig()) {
    const multi = W > H * 1.3 && /presentation|slides|deck|pitch/i.test(prompt);
    const specs = await generateDesignSpecsLLM(prompt, { width: W, height: H, count: o.count ?? (multi ? 2 : 3), signal: o.signal, onText: o.onText, context: o.context });
    specs.forEach((s, i) => {
      const { pages, jobs } = specToPages(s, W, H);
      if (pages.length) out.push({ id: uid(), title: s.title || prompt.slice(0, 40), width: W, height: H, pages, jobs, source: 'ai' });
      void i;
    });
  } else {
    const { PRESETS } = await import('../model/presets');
    const preset = PRESETS.find((p) => p.width === W && p.height === H)?.id;
    const tpls = await templateDesigns(prompt, preset).catch(() => [] as Design[]);
    for (const t of tpls) out.push({ id: uid(), title: t.title, width: t.width, height: t.height, pages: fitPages(t.pages, t.width, t.height, W, H), jobs: [], source: 'template' });
    if (out.length < 4) {
      const specs = generateDesignSpecsKeyless(prompt, W, H, 4 - out.length);
      for (const s of specs) {
        const { pages, jobs } = specToPages(s, W, H);
        out.push({ id: uid(), title: s.title || 'Design', width: W, height: H, pages, jobs, source: 'layout' });
      }
    }
  }
  // fast, keyless photos for previews (AI images can replace them after inserting)
  await Promise.all(out.map((c, i) => fillStockImages(c.pages, c.jobs, i, o.signal).catch(() => undefined)));
  out.forEach((c) => ensureFontsFor(c.pages));
  return out;
}

/** Clone candidate pages with fresh ids, remapping image jobs. */
function clonePages(c: Candidate, toW: number, toH: number): { pages: Page[]; jobs: ImageJob[] } {
  const fitted = fitPages(c.pages, c.width, c.height, toW, toH);
  const jobs: ImageJob[] = [];
  const pages = fitted.map((p, pi) => {
    const np: Page = { ...structuredClone(p), id: uid(), elements: cloneElements(p.elements) };
    for (const j of c.jobs) {
      if (j.pageId !== c.pages[pi].id) continue;
      if (!j.elId) jobs.push({ ...j, pageId: np.id });
      else {
        const idx = c.pages[pi].elements.findIndex((e) => e.id === j.elId);
        if (idx >= 0) jobs.push({ ...j, pageId: np.id, elId: np.elements[idx].id, w: np.elements[idx].w, h: np.elements[idx].h });
      }
    }
    return np;
  });
  return { pages, jobs };
}

export function insertCandidate(c: Candidate, how: 'append' | 'replace'): ImageJob[] {
  const s = useEditor.getState();
  const d = s.design;
  if (!d) return [];
  const { pages, jobs } = clonePages(c, d.width, d.height);
  ensureFontsFor(pages);
  const cur = currentPage(s);
  if (how === 'replace' && cur) {
    const [first, ...rest] = pages;
    s.update((dd) => {
      const i = dd.pages.findIndex((p) => p.id === cur.id);
      if (i < 0) return;
      const keepId = dd.pages[i].id;
      dd.pages[i] = { ...(first as Draft<Page>), id: keepId };
      dd.pages.splice(i + 1, 0, ...(rest as Draft<Page>[]));
    });
    jobs.forEach((j) => j.pageId === first.id && (j.pageId = cur.id));
    s.set({ selection: [] });
  } else {
    let target = pages[0].id;
    s.update((dd) => {
      const i = cur ? dd.pages.findIndex((p) => p.id === cur.id) : dd.pages.length - 1;
      // replace a blank current page instead of leaving it empty
      if (cur && i >= 0 && dd.pages[i].elements.length === 0 && !dd.pages[i].backgroundImage) {
        const [first, ...rest] = pages;
        const keepId = dd.pages[i].id;
        dd.pages[i] = { ...(first as Draft<Page>), id: keepId };
        jobs.forEach((j) => j.pageId === first.id && (j.pageId = keepId));
        target = keepId;
        dd.pages.splice(i + 1, 0, ...(rest as Draft<Page>[]));
      } else dd.pages.splice(i + 1, 0, ...(pages as Draft<Page>[]));
    });
    s.set({ pageId: target, selection: [] });
  }
  return jobs;
}

/** Create a brand-new design from a candidate and return it. */
export function candidateToDesign(c: Candidate, preset?: string | null): Design {
  const { pages } = clonePages(c, c.width, c.height);
  const p = preset ? presetById(preset) : undefined;
  const d = newDesign({ title: c.title || 'AI design', preset: p?.id, width: c.width, height: c.height, pages, category: p?.category });
  return useApp.getState().addDesign(d);
}

export function sizeForPrompt(prompt: string, fallback = 'instagram-square') {
  const id = detectFormat(prompt) ?? fallback;
  const p = presetById(id) ?? presetById('instagram-square')!;
  return { preset: p.id, width: p.width, height: p.height, name: p.name };
}

export async function upgradeJobs(jobs: ImageJob[], onProgress?: (d: number, t: number) => void, signal?: AbortSignal) {
  return upgradeImagesWithAI(jobs, 'photo', onProgress, signal);
}
