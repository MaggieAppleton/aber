import { test, expect, type Locator } from '@playwright/test';

const geometry = (control: Locator) => control.evaluate(element => ({
  button: element.getBoundingClientRect().toJSON(),
  icon: element.querySelector('svg')?.getBoundingClientRect().toJSON(),
  parent: element.parentElement?.className,
}));

test('File in a theme has a delayed, portaled tooltip without moving its button; keyboard dismissal preserves the pane', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/tools/**', route => {
    writes.push(route.request().url());
    return route.fulfill({ json: {} });
  });
  await page.goto('/?view=current&open=theory:t1');
  await page.locator('.pn-ev').first().click();
  const file = page.getByRole('button', { name: 'File in a theme', exact: true });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await file.scrollIntoViewIfNeeded();
  await expect(file).toBeInViewport({ ratio: 1 });
  const before = await geometry(file);
  expect(before.button.width).toBe(28);
  expect(before.button.height).toBe(28);
  expect(before.icon.width).toBe(16);
  expect(before.parent).toBe('pn-chips');
  expect(await file.getAttribute('title')).toBeNull();
  // Opening unread evidence may mark it seen; the interaction audit starts after setup.
  await test.info().attach('setup-tool-calls', {
    body: JSON.stringify(writes.splice(0), null, 2), contentType: 'application/json',
  });

  await file.hover();
  await page.waitForTimeout(150);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const tip = page.getByRole('tooltip', { name: 'File in a theme', exact: true });
  await expect(tip).toHaveText('File in a theme');
  await expect(tip).toBeVisible();
  await page.waitForTimeout(150);
  expect(await geometry(file)).toEqual(before);
  expect(await tip.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color, radius: style.borderRadius, insidePane: !!element.closest('.as-pane') };
  })).toEqual({ background: 'rgb(26, 33, 30)', color: 'rgb(255, 255, 255)', radius: '6px', insidePane: false });   // ink is sage 12
  await page.screenshot({ path: 'test-results/parity/tooltip-file-hover.png' });

  await page.mouse.move(20, 20);
  await expect(tip).toHaveCount(0);
  await file.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(file).toBeFocused();
  await expect(tip).toHaveText('File in a theme');
  await page.screenshot({ path: 'test-results/parity/tooltip-file-keyboard.png' });
  await page.keyboard.press('Escape');
  await expect(tip).toHaveCount(0);
  await expect(file).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('view and capture icon controls share the tooltip, preserve shortcuts and dismiss on blur with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=timeline');
  const theme = page.getByRole('button', { name: 'Theme', exact: true });
  const before = await geometry(theme);
  expect(await theme.getAttribute('title')).toBeNull();
  await theme.hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toHaveText('Filter by theme');
  expect(await tip.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await geometry(theme)).toEqual(before);
  await theme.click();
  await expect(tip).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Themes', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /^Dump or ask/ }).click();
  const attachment = page.getByRole('button', { name: 'Attach', exact: true });
  await expect(attachment).toBeVisible();
  expect(await attachment.getAttribute('title')).toBeNull();
  await attachment.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(attachment).toBeFocused();
  await expect(tip).toHaveText('Attach');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tooltip', { name: 'Attach', exact: true })).toHaveCount(0);
  const close = page.getByRole('button', { name: 'Close (Esc)', exact: true });
  expect(await close.getAttribute('title')).toBeNull();
  await page.goto('/?view=current&open=theory:d1');
  const accept = page.getByRole('button', { name: 'Accept (A)', exact: true });
  await expect(accept).toHaveAttribute('aria-keyshortcuts', 'a');
  expect(await accept.getAttribute('title')).toBeNull();
  await accept.hover();
  await expect(page.getByRole('tooltip', { name: 'Accept (A)', exact: true })).toBeVisible();
});
