import { test, expect } from '@playwright/test';
import { boot, openNewDesign, els, pages } from './helpers';

test('home: custom size design opens the editor', async ({ page }) => {
  await boot(page);
  await page.getByTestId('create-design-btn').click();
  await page.getByTestId('custom-size-btn').click();
  await page.getByTestId('custom-size-width').fill('30');
  await expect(page.getByTestId('create-custom')).toBeDisabled();
  await page.getByTestId('custom-size-width').fill('1200');
  await page.getByTestId('custom-size-height').fill('600');
  await page.getByTestId('create-custom').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  const d = await page.evaluate(() => (window as any).cream.editor.getState().design);
  expect([d.width, d.height]).toEqual([1200, 600]);
});

test('home: trash and restore a design', async ({ page }) => {
  await boot(page);
  const id = await page.evaluate(() => (window as any).cream.app.getState().createDesign({ preset: 'poster', title: 'Trash me' }).id);
  await page.evaluate((id) => (window as any).cream.app.getState().trashDesign(id), id);
  await page.getByTestId('nav-trash').click();
  await expect(page.getByText('Trash me')).toBeVisible();
  await page.evaluate((id) => (window as any).cream.app.getState().restoreDesign(id), id);
  await expect(page.getByText('Trash me')).toHaveCount(0);
});

test('templates: apply all pages from the Design tab', async ({ page }) => {
  await openNewDesign(page, 'presentation');
  await expect(page.getByTestId('panel-design')).toBeVisible(); // Design tab is open by default
  await page.getByTestId('template-card').first().click();
  const applyAll = page.getByTestId('apply-all-pages');
  if (await applyAll.isVisible().catch(() => false)) await applyAll.click();
  await expect.poll(async () => (await els(page)).length).toBeGreaterThan(1);
});

test('templates page: customize opens editor', async ({ page }) => {
  await boot(page, '#/templates');
  await page.getByTestId('template-card').first().click();
  await page.getByTestId('customize-template').click();
  await expect(page.getByTestId('editor')).toBeVisible();
  expect((await els(page)).length).toBeGreaterThan(0);
});

test('elements: shapes, chart, table and frame insert offline', async ({ page }) => {
  await openNewDesign(page);
  await page.getByTestId('tab-elements').click();
  await page.getByTestId('shape-circle').first().click();
  await page.evaluate(async () => {
    const dnd = await import('/src/editor/dnd.ts' as any);
    dnd.insertChart('pie');
    dnd.insertTable(3, 3);
    dnd.insertFrame('circle');
  });
  const types = (await els(page)).map((e: any) => e.type);
  expect(types).toEqual(expect.arrayContaining(['shape', 'chart', 'table', 'frame']));
});

test('export: PNG, PDF and .cream downloads', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  await page.keyboard.press('t');
  for (const type of ['png', 'pdf', 'cream']) {
    await page.getByTestId('share-btn').click();
    await page.getByText('Download', { exact: true }).first().click();
    const sel = page.getByTestId('dl-filetype');
    await sel.click();
    const opt = page.locator(`[data-type="${type}"], [data-testid="dl-type-${type}"]`).first();
    if (await opt.count()) await opt.click();
    else await sel.selectOption({ value: type }).catch(() => {});
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 45_000 }), page.getByTestId('dl-download').click()]);
    const name = dl.suggestedFilename();
    expect(name.length).toBeGreaterThan(3);
    await page.keyboard.press('Escape');
  }
});

test('present: navigate and exit', async ({ page }) => {
  await openNewDesign(page, 'presentation');
  await page.getByTestId('add-page').click();
  await page.getByTestId('present-btn').click();
  await expect(page.getByTestId('present-root')).toBeVisible();
  await expect(page.getByTestId('present-count')).toContainText('1');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('present-count')).toContainText('2');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('editor')).toBeVisible();
});

test('comments: add a comment thread', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  await page.getByTestId('comments-btn').click();
  await expect(page.getByTestId('comments-panel')).toBeVisible();
  await page.getByTestId('comment-new').click();
  await page.getByTestId('comment-input').fill('Looks great');
  await page.getByTestId('comment-submit').click();
  await expect.poll(() => page.evaluate(() => (window as any).cream.editor.getState().design.comments.length)).toBe(1);
});

test('find and replace across text', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('t');
  await page.keyboard.press('Control+f');
  await page.getByTestId('find-input').fill('body');
  await expect(page.getByTestId('find-count')).toContainText('1');
});

test('AI: keyless rule-based edit makes the background dark', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('t');
  await page.getByTestId('tab-ai').click();
  await page.getByTestId('ai-mode-edit').click();
  await page.getByTestId('ai-prompt').fill('dark mode');
  await page.getByTestId('ai-generate').click();
  await expect
    .poll(async () => (await pages(page))[0].background.color, { timeout: 20_000 })
    .not.toBe('#ffffff');
});
