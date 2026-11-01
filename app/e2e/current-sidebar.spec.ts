import { expect, test, type Page } from '@playwright/test';
const railWidth = (page: Page) => page.locator('.cur-rail').evaluate(node => node.getBoundingClientRect().width);
async function usable(page: Page) {
  await expect(page.locator('.cur-main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.cur-main')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.locator('.cur-main').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await expect.poll(() => page.locator('.cur-card .ap-card').first().evaluate(node => {
    const main = node.closest('.cur-main')!.getBoundingClientRect(), card = node.getBoundingClientRect();
    return card.width > 100 && card.left >= main.left && card.right <= main.right;
  })).toBe(true);
}
async function crowded(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1110, height: 853 });
  await page.goto('/?view=current&open=theory:t3'); await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect.poll(() => railWidth(page)).toBe(44); await expect(page.getByRole('textbox', { name: 'Dump or ask', exact: true })).toBeFocused();
}

test('manual sidebar preference and keyboard theme navigation survive view changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/?view=current'); await expect.poll(() => railWidth(page)).toBe(232);
  await page.getByRole('button', { name: 'Collapse theme sidebar', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect.poll(() => railWidth(page)).toBe(44); const expand = page.getByRole('button', { name: 'Expand theme sidebar', exact: true }); await expect(expand).toBeFocused();
  await page.getByRole('button', { name: 'Columns (⌘2)', exact: true }).click(); await page.getByRole('button', { name: 'Theme sections (⌘1)', exact: true }).click();
  await expect.poll(() => railWidth(page)).toBe(44); await expand.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => railWidth(page)).toBe(232); await expect(page.locator('.cur-index a[data-active]')).toBeFocused();
  await page.locator('.cur-index a[href="#cur-memory"]').focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.locator('.cur-main').evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Find (⌘K)', exact: true })).toBeVisible();
});

test('auto collapse leaves real main content usable at1110px, full stops and temporary expansion', async ({ page }) => {
  await crowded(page); await usable(page); const mainWidth = await page.locator('.cur-main').evaluate(node => node.getBoundingClientRect().width);
  await page.getByRole('button', { name: 'Expand theme sidebar', exact: true }).click(); const overlay = page.locator('.cur-sidebar-body[data-overlay]');
  await expect(overlay).toBeVisible(); expect(await overlay.evaluate(node => node.getBoundingClientRect().width)).toBe(232);
  expect(await page.locator('.cur-main').evaluate(node => node.getBoundingClientRect().width)).toBe(mainWidth);
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.cur-index a[data-active]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(overlay).toHaveCount(0); await expect(page.locator('.ps-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Full width (⌘[)', exact: true }).click(); await usable(page);
  await page.screenshot({ path: 'test-results/parity/current-sidebar-full-stop.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Restore width (⌘])', exact: true }).click(); await usable(page);
  await page.getByRole('button', { name: 'Expand theme sidebar', exact: true }).click(); await page.locator('.as-pane .pn-title').click(); await expect(overlay).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Dump or ask', exact: true }).focus(); await page.keyboard.press('Escape');
  await page.locator('.as-pane').getByRole('button', { name: 'Close (Esc)', exact: true }).click(); await expect.poll(() => railWidth(page)).toBe(232);
});

test('Prototypes disclose named inline destinations and creation in expanded and compact rails', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const world = await (await request.get('/api/world')).json();
  await page.goto('/?view=current'); const trigger = page.locator('.cur-protos');
  await expect(trigger).toContainText(String(world.prototypes.length)); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.focus(); await page.keyboard.press('Enter'); await expect(trigger).toHaveAttribute('aria-expanded', 'true'); await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const prototype of world.prototypes) await expect(page.locator('.cur-prototype-row').filter({ hasText: prototype.name })).toBeVisible();
  const row = page.locator('.cur-prototype-row').filter({ hasText: world.prototypes[0].name });
  expect(await row.evaluate(node => ({ left: parseFloat(getComputedStyle(node).paddingLeft), right: parseFloat(getComputedStyle(node).paddingRight) }))).toEqual({ left: 16, right: 8 });
  await page.getByRole('button', { name: 'New prototype', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await row.click(); await expect(page.getByRole('textbox', { name: 'Prototype name', exact: true })).toHaveText(world.prototypes[0].name);
  await crowded(page); await page.getByRole('button', { name: `Prototypes (${world.prototypes.length})`, exact: true }).click();
  await expect(page.locator('.cur-protos')).toHaveAttribute('aria-expanded', 'true'); await expect(page.locator('.cur-prototype-row').filter({ hasText: world.prototypes[0].name })).toBeVisible();
  await page.screenshot({ path: 'test-results/parity/current-sidebar-prototypes.png', animations: 'disabled' });
});

test('automatic resize preserves sidebar keyboard focus without stealing pane, chat or chrome focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1360, height: 853 });
  await page.goto('/?view=current&open=theory:t3'); await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  const composer = page.getByRole('textbox', { name: 'Dump or ask', exact: true }); await expect(composer).toBeFocused();
  await page.locator('.cur-index a[href="#cur-memory"]').focus(); await page.setViewportSize({ width: 1110, height: 853 });
  await expect.poll(() => railWidth(page)).toBe(44); await expect(page.getByRole('button', { name: 'Expand theme sidebar', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1360, height: 853 });
  await page.locator('.as-pane').getByRole('button', { name: 'Close (Esc)', exact: true }).click();
  await expect.poll(() => railWidth(page)).toBe(232);
  await page.setViewportSize({ width: 899, height: 853 }); await expect.poll(() => railWidth(page)).toBe(44);
  await page.getByRole('button', { name: 'Find (⌘K)', exact: true }).focus(); await page.setViewportSize({ width: 932, height: 853 });
  await expect.poll(() => railWidth(page)).toBe(232); await expect(page.getByRole('button', { name: 'Find (⌘K)', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 899, height: 853 }); await page.getByRole('button', { name: 'Expand theme sidebar', exact: true }).focus();
  await page.setViewportSize({ width: 932, height: 853 }); await expect(page.getByRole('button', { name: 'Collapse theme sidebar', exact: true })).toBeFocused();
  await composer.focus(); await page.setViewportSize({ width: 899, height: 853 }); await expect.poll(() => railWidth(page)).toBe(44); await expect(composer).toBeFocused();
  await page.setViewportSize({ width: 932, height: 853 }); await expect.poll(() => railWidth(page)).toBe(232); await expect(composer).toBeFocused();
  const chrome = page.getByRole('button', { name: 'Theme sections (⌘1)', exact: true }); await chrome.focus();
  await page.setViewportSize({ width: 899, height: 853 }); await expect.poll(() => railWidth(page)).toBe(44); await expect(chrome).toBeFocused();
  await page.setViewportSize({ width: 1360, height: 853 }); await page.goto('/?view=current&open=theory:t3');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(composer).toBeFocused(); await expect.poll(() => railWidth(page)).toBe(232);
  const claim = page.getByRole('textbox', { name: 'Claim', exact: true }); await claim.focus();
  await page.setViewportSize({ width: 1110, height: 853 }); await expect.poll(() => railWidth(page)).toBe(44); await expect(claim).toBeFocused();
});
