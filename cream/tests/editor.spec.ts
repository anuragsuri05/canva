import { test, expect } from '@playwright/test';
import { openNewDesign, els, pages, selection, elCenter, boot } from './helpers';

test('insert, drag, edit text, undo/redo', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  await page.keyboard.press('t');
  let list = await els(page);
  expect(list.map((e: any) => e.type)).toEqual(['shape', 'text']);
  const text = list[1];
  const c = await elCenter(page, text.id);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y + 90, { steps: 6 });
  await page.mouse.up();
  list = await els(page);
  expect(list[1].y).toBeGreaterThan(text.y + 20);
  // edit text
  const c2 = await elCenter(page, text.id);
  await page.mouse.dblclick(c2.x, c2.y);
  await page.keyboard.type('Hello Cream');
  await page.mouse.click(700, 150);
  list = await els(page);
  expect(list[1].html).toBe('Hello Cream');
  await expect(page.locator(`.page-frame [data-el-id="${text.id}"]`)).toHaveText('Hello Cream');
  // undo / redo
  await page.getByTestId('undo').click();
  expect((await els(page))[1].html).not.toBe('Hello Cream');
  await page.getByTestId('redo').click();
  expect((await els(page))[1].html).toBe('Hello Cream');
});

test('duplicate, group, lock, delete via shortcuts', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  await page.keyboard.press('Control+d');
  expect((await els(page)).length).toBe(2);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+g');
  const g = await els(page);
  expect(g[0].groupId).toBeTruthy();
  expect(g[0].groupId).toBe(g[1].groupId);
  await page.keyboard.press('Alt+Shift+L');
  expect((await els(page)).every((e: any) => e.locked)).toBe(true);
  await page.keyboard.press('Alt+Shift+L');
  await page.keyboard.press('Delete');
  expect((await els(page)).length).toBe(0);
});

test('resize and rotate with handles', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  const before = (await els(page))[0];
  const h = page.getByTestId('handle-1,1');
  const hb = (await h.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + 80, hb.y + 40, { steps: 5 });
  await page.mouse.up();
  const after = (await els(page))[0];
  expect(after.w).toBeGreaterThan(before.w);
  const r = (await page.getByTestId('rotate-handle').boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + 200, r.y - 120, { steps: 6 });
  await page.mouse.up();
  expect(Math.abs((await els(page))[0].rotation)).toBeGreaterThan(10);
});

test('pages: add, duplicate, hide, delete, views', async ({ page }) => {
  await openNewDesign(page, 'presentation');
  await page.getByTestId('add-page').click();
  expect((await pages(page)).length).toBe(2);
  await page.getByTestId('duplicate-page').first().click();
  expect((await pages(page)).length).toBe(3);
  await page.getByTestId('hide-page').first().click();
  expect((await pages(page))[0].hidden).toBe(true);
  await page.getByTestId('delete-page').first().click();
  expect((await pages(page)).length).toBe(2);
  await page.getByTestId('grid-view').click();
  await expect(page.locator('.canvas-scroll')).toContainText('2');
  await page.getByTestId('thumbs-view').click();
  await expect(page.getByTestId('thumb-strip')).toBeVisible();
  await expect(page.getByTestId('page-counter')).toContainText('/ 2');
});

test('text toolbar: bold and font size', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('t');
  await page.getByTestId('tb-bold').click();
  expect((await els(page))[0].fontWeight).toBeGreaterThanOrEqual(600);
  const size = (await els(page))[0].fontSize;
  await page.getByTestId('tb-font-size-inc').click();
  expect((await els(page))[0].fontSize).toBeGreaterThan(size);
});

test('position panel and alignment', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  await page.getByTestId('tb-position').click();
  await expect(page.getByTestId('position-panel')).toBeVisible();
  await page.evaluate(() => (window as any).cream.editor.getState().alignToPage('left'));
  expect(Math.round((await els(page))[0].x)).toBe(0);
});

test('context menu and shortcuts modal', async ({ page }) => {
  await openNewDesign(page);
  await page.keyboard.press('r');
  const id = (await selection(page))[0];
  const c = await elCenter(page, id);
  await page.mouse.click(c.x, c.y, { button: 'right' });
  await expect(page.locator('.menu')).toContainText('Duplicate');
  await expect(page.locator('.menu')).toContainText('Layer');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+/');
  await expect(page.getByTestId('shortcuts-modal')).toBeVisible();
});

test('work persists across reload', async ({ page }) => {
  const id = await openNewDesign(page);
  await page.keyboard.press('r');
  await page.getByTestId('design-title').fill('Persisted design');
  await page.waitForTimeout(900);
  await page.reload();
  await page.waitForFunction(() => (window as any).cream?.app.getState().ready);
  await expect(page.getByTestId('design-title')).toHaveValue('Persisted design');
  expect((await els(page)).length).toBe(1);
  await boot(page);
  void id;
});
