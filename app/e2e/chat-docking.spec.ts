import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const artifacts = fileURLToPath(new URL('../../reports/parity-repair/chat-floating-backdrop/', import.meta.url));
const phase = process.env.CHAT_DOCKING_CAPTURE_PHASE ?? 'after';
const surface = (page: Page) => page.locator('.ps-surface');
const rect = (locator: Locator) => locator.evaluate(node => {
  const box = node.getBoundingClientRect(), style = getComputedStyle(node);
  return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom, background: style.backgroundColor, radius: style.borderRadius, shadow: style.boxShadow, border: style.border, overflow: style.overflow };
});
async function closedPill(page: Page, width: number, height: number) {
  await expect.poll(async () => { const box = await rect(surface(page)); return { width: box.width, right: width - box.right, bottom: height - box.bottom }; }).toEqual({ width: 250, right: 12, bottom: 12 });
}
async function capture(page: Page, label: string, paneSelector = '.as-pane') {
  await mkdir(artifacts, { recursive: true });
  await page.mouse.move(0, 0); await page.waitForTimeout(650);
  const measurements = { surface: await rect(surface(page)), panel: await rect(page.locator('.ps-panel')), pane: await rect(page.locator(paneSelector)), main: await rect(page.locator('.as-content')), backing: await rect(page.locator('.as')) };
  await page.screenshot({ path: resolve(artifacts, `${phase}-${label}.png`) });
  await writeFile(resolve(artifacts, `${phase}-${label}.json`), JSON.stringify(measurements, null, 2));
  return measurements;
}

test.beforeEach(async ({ page, request }) => {
  const world = await (await request.get('/api/world')).json();
  // Browser-only conversation makes real thread overflow testable without sending a dump.
  const dumps = Array.from({ length: 22 }, (_, index) => ({
    id: `dock-fixture-${index}`, status: 'done', captured_from: 'column', captured_at: '2026-11-01T12:00:00Z',
    text: `Saved capture ${index}: keep this conversation beside the theory while its details remain visible.`, attachments: [],
    replies: [{ id: `dock-reply-${index}`, parts: [{ type: 'text', text: `Reply ${index}: The conversation stays in its own scroll region. Opening it gives the surrounding work less space while preserving the same surface and keeping context controls close to the composer.` }] }],
  }));
  await page.route('**/api/world', route => route.fulfill({ json: { ...world, dumps } }));
});

for (const width of [1360, 852]) test(`desktop chat floats inset over the same backing as its object pane at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 820 });
  await page.goto('/?view=columns&open=theory:t1');
  await expect(page.locator('.as-pane .pn-title')).toBeVisible();
  await closedPill(page, width, 820);
  const paneBefore = await rect(page.locator('.as-pane'));
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(page.locator('.ps-panel')).toBeVisible();
  const actual = await capture(page, `desktop-${width}`);
  expect(actual.surface).toMatchObject({ x: width - 372, y: 12, width: 360, height: 796, right: width - 12, bottom: 808, radius: '14px' });
  const shadowColors = [...actual.surface.shadow.matchAll(/rgba?\(([^)]+)\)/g)].map(match => match[1].split(',').map(Number));
  expect(shadowColors.some(channels => channels.length === 3 || channels[3] > 0)).toBe(true);
  expect(actual.surface.shadow).toContain('0.5px');
  expect(actual.backing.background).toBe(actual.pane.background);
  expect(actual.surface.background).toBe(actual.pane.background);
  expect(actual.surface.border).toContain('none');
  expect(actual.panel.width).toBe(360); expect(actual.panel.height).toBe(796);
  expect(actual.pane.right).toBe(actual.surface.x);
  expect(actual.main.right).toBeLessThanOrEqual(actual.pane.x);
  expect(actual.pane.right).toBeLessThan(paneBefore.right);
  const thread = page.locator('.ps-thread');
  expect(await thread.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await thread.evaluate(node => { node.scrollTop = 0; });
  await expect.poll(() => thread.evaluate(node => node.scrollTop)).toBe(0);
  const composer = page.getByRole('textbox', { name: 'Dump or ask', exact: true });
  await composer.fill('Unsent docking check');
  await expect(page.locator('.ps-ctxrow .ps-ctx')).toHaveCount(2);
  await page.locator('.ps-ctxrow .ps-chip-x').first().click();
  await expect(page.locator('.ps-ctxrow .ps-ctx')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add something on screen', exact: true }).click();
  await page.locator('.cd-item[data-kind="theory"]:not([data-pick="t1"])').first().click();
  await expect(page.locator('.ps-ctxrow .ps-ctx')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await closedPill(page, width, 820);
  await page.keyboard.press('ControlOrMeta+j');
  await expect(composer).toHaveValue('Unsent docking check');
  await expect(page.locator('.ps-ctxrow .ps-ctx')).toHaveCount(2);
});

test('opening chat gives the main view space and closes with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1360, height: 820 });
  await page.goto('/?view=columns');
  await expect(page.locator('.cd')).toBeVisible();
  await closedPill(page, 1360, 820);
  await page.keyboard.press('ControlOrMeta+j');
  await expect.poll(() => page.locator('.as-content').evaluate(node => node.getBoundingClientRect().width)).toBe(988);
  await expect.poll(() => surface(page).evaluate(node => node.getBoundingClientRect().width)).toBe(360);
  expect((await rect(page.locator('.as'))).background).toBe((await rect(page.locator('.as-view > .ap'))).background);
  await expect(page.getByRole('textbox', { name: 'Dump or ask', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await closedPill(page, 1360, 820);
  await expect.poll(() => page.locator('.as-content').evaluate(node => node.getBoundingClientRect().width)).toBe(1360);
});

test('phone retains its fitted sheet, scrolling and composer controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // The phone shows the default view: the theory's full view fills the screen (no docked pane).
  await page.goto('/?open=theory:t1');
  await expect(page.locator('.tf-main .pn-title')).toBeVisible();
  await closedPill(page, 390, 844);
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(page.locator('.ps-panel')).toBeVisible();
  const actual = await capture(page, 'phone', '.tf-main');
  expect(actual.surface).toMatchObject({ x: 18, width: 360, right: 378, bottom: 832, radius: '14px' });
  expect(actual.surface.height).toBe(820);
  expect(actual.surface.shadow).toContain('0.5px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.ps-thread').evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await expect(page.getByRole('textbox', { name: 'Dump or ask', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await closedPill(page, 390, 844);
});
