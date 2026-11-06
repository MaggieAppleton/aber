import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const selected = 'column-position-14';
const relatedIds = new Set(['column-position-2', selected, 'column-position-36']);
const artifacts = resolve(process.cwd(), '../reports/parity-repair/columns-selection');
const phase = process.env.COLUMNS_CAPTURE_PHASE ?? 'after';
const column = (page: Page) => page.locator('.cd-col[data-kind="theory"]');
const list = (page: Page) => column(page).locator('.cd-list');
const order = (page: Page) => column(page).locator('.cd-item').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-id')));
const scroll = (page: Page) => list(page).evaluate(node => node.scrollTop);
const item = (page: Page, id = selected) => column(page).locator(`.cd-item[data-id="${id}"]`);
const settledColumn = (page: Page) => expect.poll(() => column(page).evaluate(node => Math.round(node.getBoundingClientRect().width * 100) / 100)).toBe(300);

test.beforeEach(async ({ page, request }) => {
  const world = await (await request.get('/api/world')).json();
  const template = world.theories.find((row: any) => row.id === 't1');
  const theories = Array.from({ length: 42 }, (_, index) => ({
    ...template, id: `column-position-${index}`, claim: `Column ${index} keeps its own stable position in this list`,
    status: 'held', draft: false, themes: ['cost'], follows: [], confidence: 3,
    rivals: index === 14 ? ['column-position-2', 'column-position-36'] : [],
    seen_at: '2026-11-01T00:00:00Z', seenAt: '2026-11-01T00:00:00Z',
  }));
  await page.route('**/api/world', route => route.fulfill({ json: { ...world, theories, signals: [], suggestions: [], signalPage: { nextCursor: null } } }));
  await page.route('**/api/objects/theory/column-position-*', route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1);
    return route.fulfill({ json: theories.find(row => row.id === id) });
  });
  await page.setViewportSize({ width: 1360, height: 820 });
  await page.goto('/?view=columns');
  await expect(column(page).locator('.cd-item')).toHaveCount(42);
  await page.evaluate(() => document.fonts.ready);
  await list(page).evaluate(node => { node.scrollTop = 700; });
  await expect.poll(() => scroll(page)).toBe(700);
});

test('selecting a lower stock preserves list order and scroll position with a quiet selection', async ({ page }) => {
  await mkdir(artifacts, { recursive: true });
  const before = { order: await order(page), scroll: await scroll(page) };
  await page.screenshot({ path: resolve(artifacts, `${phase}-before-selection.png`) });
  await item(page).locator('button').click();
  await expect(item(page)).toHaveAttribute('data-open', '');
  await page.waitForTimeout(700);
  const after = { order: await order(page), scroll: await scroll(page), style: await item(page).evaluate(node => {
    const style = getComputedStyle(node);
    return { background: style.backgroundColor, surface: style.getPropertyValue('--surface').trim(), shadow: style.boxShadow, outline: style.outline, opacity: style.opacity };
  }) };
  await page.mouse.move(0, 0);
  await page.screenshot({ path: resolve(artifacts, `${phase}-selected.png`) });
  await writeFile(resolve(artifacts, `${phase}-selection.json`), JSON.stringify({ before, after }, null, 2));
  expect(after.order).toEqual(before.order);
  expect(after.scroll).toBe(before.scroll);
  expect(after.style.background).toBe(after.style.surface);
  expect(after.style.shadow).not.toContain('1.5px');
  expect(after.style.shadow).not.toContain('rgb(23, 23, 23)');
  await expect.poll(() => item(page, 'column-position-15').evaluate(node => getComputedStyle(node).opacity)).toBe('0.32');
});

test('folding a stock column restores its scroll offset and order', async ({ page }) => {
  const before = { order: await order(page), scroll: await scroll(page) };
  await page.getByRole('button', { name: 'Fold Theories', exact: true }).click();
  await page.getByRole('button', { name: 'Show Theories', exact: true }).click();
  await expect.poll(() => scroll(page)).toBe(before.scroll);
  await settledColumn(page);
  expect(await order(page)).toEqual(before.order);
  // Selecting another stock folds this column too, then Escape restores it.
  await page.locator('.cd-col[data-kind="theme"] .cd-item[data-id="cost"] button').click();
  await page.keyboard.press('Escape');
  await expect.poll(() => scroll(page)).toBe(before.scroll);
  await settledColumn(page);
  expect(await order(page)).toEqual(before.order);
  await item(page).locator('button').click();
  await expect.poll(() => scroll(page)).toBe(before.scroll);
  await page.getByRole('button', { name: 'Full width (⌘[)', exact: true }).click();
  await expect(column(page).locator('.cd-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show Theories', exact: true }).click();
  await expect.poll(() => scroll(page)).toBe(before.scroll);
  await settledColumn(page);
  expect(await order(page)).toEqual(before.order);
});

test('keyboard selection keeps context and related markers count and reveal actual offscreen rows', async ({ page }) => {
  const before = { order: await order(page), scroll: await scroll(page) };
  await item(page).locator('button').focus();
  await item(page).locator('button').press('Enter');
  await expect(item(page)).toHaveAttribute('data-open', '');
  await expect.poll(() => scroll(page)).toBe(before.scroll);
  expect(await order(page)).toEqual(before.order);
  const below = column(page).getByRole('button', { name: '1 related below', exact: true });
  const above = column(page).getByRole('button', { name: '1 related above', exact: true });
  await expect(below).toBeVisible(); await expect(above).toBeVisible();
  const counts = await list(page).evaluate((node, ids) => {
    const viewport = node.getBoundingClientRect(); const counts = { above: 0, below: 0 };
    for (const row of node.querySelectorAll<HTMLElement>('.cd-item')) {
      if (!ids.includes(row.dataset.id!)) continue;
      const rect = row.getBoundingClientRect();
      if (rect.y + rect.height / 2 < viewport.top) counts.above++;
      else if (rect.y + rect.height / 2 > viewport.bottom) counts.below++;
    }
    return counts;
  }, [...relatedIds]);
  expect(counts).toEqual({ above: 1, below: 1 });
  await below.click();
  await expect.poll(() => scroll(page)).toBeGreaterThan(before.scroll);
  await expect.poll(() => item(page, 'column-position-36').evaluate(node => {
    const row = node.getBoundingClientRect(), viewport = node.closest('.cd-list')!.getBoundingClientRect();
    return row.top >= viewport.top && row.bottom <= viewport.bottom;
  })).toBe(true);
  expect(await order(page)).toEqual(before.order);
  await expect(column(page).getByRole('button', { name: /related below/ })).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: resolve(artifacts, `${phase}-after-marker.png`) });
  const returnAbove = column(page).getByRole('button', { name: '2 related above', exact: true });
  await returnAbove.focus(); await returnAbove.press('Enter');
  await expect.poll(() => item(page).evaluate(node => {
    const row = node.getBoundingClientRect(), viewport = node.closest('.cd-list')!.getBoundingClientRect();
    return row.top >= viewport.top && row.bottom <= viewport.bottom;
  })).toBe(true);
  await expect(column(page).getByRole('button', { name: '1 related above', exact: true })).toBeVisible();
  await expect(column(page).getByRole('button', { name: '1 related below', exact: true })).toBeVisible();
  expect(await order(page)).toEqual(before.order);
});
