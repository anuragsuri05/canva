import { expect, type Page } from '@playwright/test';

/** Open the app and wait until the stores are ready. */
export async function boot(page: Page, hash = '#/') {
  await page.goto('/' + hash);
  await page.waitForFunction(() => (window as any).cream?.app.getState().ready);
}

/** Create a design through the store and open it in the editor. */
export async function openNewDesign(page: Page, preset = 'instagram-square') {
  await boot(page);
  const id = await page.evaluate((p) => (window as any).cream.app.getState().createDesign({ preset: p }).id, preset);
  await page.evaluate((id) => (location.hash = '#/design/' + id), id);
  await expect(page.getByTestId('editor')).toBeVisible();
  return id as string;
}

export const els = (page: Page) =>
  page.evaluate(() => (window as any).cream.editor.getState().design.pages.flatMap((p: any) => p.elements));

export const pages = (page: Page) => page.evaluate(() => (window as any).cream.editor.getState().design.pages);

export const selection = (page: Page) => page.evaluate(() => (window as any).cream.editor.getState().selection as string[]);

/** Centre of the element's on-canvas box. */
export async function elCenter(page: Page, id: string) {
  const b = await page.locator(`.page-frame [data-el-id="${id}"]`).first().boundingBox();
  if (!b) throw new Error('element not visible ' + id);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
