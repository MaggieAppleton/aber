import { expect, test, type Page } from '@playwright/test';

async function paints(page: Page) {
  return page.locator('.ps-hl').evaluateAll(nodes => nodes.map(node => {
    let rect = node.getBoundingClientRect();
    let left = rect.left, top = rect.top, right = rect.right, bottom = rect.bottom;
    for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
      if (/(hidden|clip|scroll|auto)/.test(style.overflowX)) { left = Math.max(left, bounds.left + ancestor.clientLeft); right = Math.min(right, bounds.left + ancestor.clientLeft + ancestor.clientWidth); }
      if (/(hidden|clip|scroll|auto)/.test(style.overflowY)) { top = Math.max(top, bounds.top + ancestor.clientTop); bottom = Math.min(bottom, bounds.top + ancestor.clientTop + ancestor.clientHeight); }
    }
    return { left, top, right, bottom };
  }).filter(rect => rect.right > rect.left && rect.bottom > rect.top));
}

async function expectInsideSource(page: Page, region: string) {
  await expect.poll(async () => {
    const visible = await paints(page);
    const source = await page.locator(`[data-region="${region}"]`).first().boundingBox();
    const chat = await page.locator('.ps-surface[data-open]').boundingBox();
    const frame = await page.locator('.as').boundingBox();
    if (!visible.length || !source || !chat || !frame) return false;
    return visible.every(rect => rect.left >= Math.max(source.x, frame.x) - .5 && rect.top >= Math.max(source.y, frame.y) - .5 &&
      rect.right <= Math.min(source.x + source.width, frame.x + frame.width) + .5 && rect.bottom <= Math.min(source.y + source.height, frame.y + frame.height) + .5 &&
      (rect.right <= chat.x + .5 || rect.left >= chat.x + chat.width - .5 || rect.bottom <= chat.y + .5 || rect.top >= chat.y + chat.height - .5));
  }).toBe(true);
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) test(`pane context glow stays inside its source and outside chat (${reducedMotion})`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion });
  await page.goto('/?view=timeline&open=theory:t3');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  const context = page.locator('.ps-ctx').filter({ hasText: 'Agents keep context across months, not sessions' });
  await context.hover(); await expectInsideSource(page, 'pane');
  const paint = await page.locator('.ps-hl').first().evaluate(node => {
    const style = getComputedStyle(node), canvas = document.createElement('canvas'), context = canvas.getContext('2d')!;
    context.fillStyle = style.backgroundColor; context.fillRect(0, 0, 1, 1);
    return { pointerEvents: style.pointerEvents, shadows: style.boxShadow.split(/,(?![^()]*\))/), rgba: [...context.getImageData(0, 0, 1, 1).data] };
  });
  expect(paint.pointerEvents).toBe('none');
  expect(paint.shadows.every(shadow => shadow === 'none' || shadow.includes('inset'))).toBe(true);
  // The glow is the jade accent (#29a383): green leads, then blue, then red.
  expect(paint.rgba[1]).toBeGreaterThan(paint.rgba[2]); expect(paint.rgba[2]).toBeGreaterThan(paint.rgba[0]);
  expect(paint.rgba[3]).toBeGreaterThan(0); expect(paint.rgba[3]).toBeLessThan(40);
  for (const viewport of [{ width: 1130, height: 900 }, { width: 820, height: 760 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport); await context.hover(); await expectInsideSource(page, 'pane');
  }
  await page.screenshot({ path: `test-results/parity/context-glow-${reducedMotion}.png`, animations: 'disabled' });
  await context.getByRole('button', { name: 'Stop sharing Agents keep context across months, not sessions', exact: true }).click();
  await expect(page.locator('.ps-hl')).toHaveCount(0);
});

test('a picked context follows scroll clipping and disappears when its source leaves the viewport', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const body = Array.from({ length: 24 }, (_, index) => `Section ${index + 1}: a detailed observation about the future of agent memory, retained here to exercise a genuinely scrolling object pane.`).join('\n\n');
  await page.route('**/api/objects/theory/t3', async route => {
    const response = await route.fetch(), theory = await response.json();
    await route.fulfill({ response, json: { ...theory, body } });
  });
  await page.route('**/api/world', async route => {
    const response = await route.fetch(), world = await response.json();
    world.theories.find((theory: { id: string }) => theory.id === 't3').body = body;
    await route.fulfill({ response, json: world });
  });
  await page.goto('/?view=timeline&open=theory:t3');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Body', exact: true })).toContainText('Section 24:');
  const signal = page.locator('.as-pane .pn-ev[data-pick]').first();
  await signal.scrollIntoViewIfNeeded();
  const id = (await signal.getAttribute('data-pick'))!, label = (await signal.getAttribute('data-label'))!;
  await page.getByRole('button', { name: 'Add something on screen', exact: true }).click(); await signal.click();
  const context = page.locator('.ps-ctx').filter({ hasText: label }); await context.hover(); await expectInsideSource(page, id);
  const before = await paints(page);
  await page.locator('.as-pane-scroll').evaluate(node => { node.scrollTop -= 80; });
  await expect.poll(async () => (await paints(page))[0]?.top).not.toBe(before[0].top);
  await expectInsideSource(page, id);
  await page.locator('.as-pane-scroll').evaluate(node => { node.scrollTop = 0; });
  await expect(page.locator('.ps-hl')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/parity/context-glow-scroll-clipped.png', animations: 'disabled' });
});

test('a picked theory highlights its visible duplicate when the first card is scrolled away', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=current');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  const cards = page.locator('.cur-card[data-pick="t7"]'); await expect(cards).toHaveCount(2);
  const visible = cards.last(); await visible.scrollIntoViewIfNeeded();
  await visible.evaluate(node => {
    const scroller = node.closest('.cur-main')!;
    scroller.scrollTop += node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 40;
  });
  await expect(cards.first()).not.toBeInViewport(); await expect(visible).toBeInViewport();
  const label = (await visible.getAttribute('data-label'))!;
  await page.getByRole('button', { name: 'Add something on screen', exact: true }).click(); await visible.click();
  await page.locator('.ps-ctx').filter({ hasText: label }).hover();
  await expect.poll(async () => {
    const rect = await visible.boundingBox(), highlight = await paints(page);
    return !!rect && highlight.length > 0 && highlight.every(part => part.left >= rect.x - .5 && part.right <= rect.x + rect.width + .5 && part.top >= rect.y - .5 && part.bottom <= rect.y + rect.height + .5);
  }).toBe(true);
  await page.screenshot({ path: 'test-results/parity/context-glow-visible-duplicate.png', animations: 'disabled' });
});

test('context paint never overlaps chat during intermediate pane docking frames', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?view=timeline&open=theory:t3');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  // Let the composer's delayed autofocus finish before assigning pane keyboard ownership.
  await expect(page.getByPlaceholder('Dump anything, or ask')).toBeFocused();
  await expect(page.locator('.ps-surface[data-open]')).toHaveCSS('height', `${page.viewportSize()!.height - 24}px`);
  await page.locator('.ps-ctx').filter({ hasText: 'Agents keep context across months, not sessions' }).hover();
  await expectInsideSource(page, 'pane');
  const separator = page.locator('.as-pane-edge');
  await separator.focus(); await expect(separator).toBeFocused();
  const sampling = page.evaluate(() => new Promise<{ widths: number[]; paintedFrames: number; maxOverlap: number }>(resolve => {
    const widths: number[] = []; let paintedFrames = 0, maxOverlap = 0;
    const sample = () => {
      const chat = document.querySelector('.ps-surface[data-open]')!.getBoundingClientRect();
      widths.push(document.querySelector('.as-pane')!.getBoundingClientRect().width);
      const clips = [...document.querySelectorAll('.ps-hl-clip')]; if (clips.length) paintedFrames++;
      for (const node of clips) {
        const rect = node.getBoundingClientRect();
        maxOverlap = Math.max(maxOverlap, Math.max(0, Math.min(rect.right, chat.right) - Math.max(rect.left, chat.left)) * Math.max(0, Math.min(rect.bottom, chat.bottom) - Math.max(rect.top, chat.top)));
      }
      if (widths.length < 90) requestAnimationFrame(sample); else resolve({ widths, paintedFrames, maxOverlap });
    };
    requestAnimationFrame(sample);
  }));
  await expect(separator).toBeFocused(); await page.keyboard.press('Meta+[');
  await page.waitForTimeout(300);
  await expect(separator).toBeFocused(); await page.keyboard.press('Meta+]');
  const result = await sampling;
  expect(new Set(result.widths.map(width => Math.round(width))).size).toBeGreaterThan(3);
  expect(result.paintedFrames).toBeGreaterThan(20); expect(result.maxOverlap).toBeLessThanOrEqual(.5);
  await testInfo.attach('dock-frame-geometry', { body: JSON.stringify(result), contentType: 'application/json' });
});
