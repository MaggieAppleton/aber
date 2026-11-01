import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const views = [['current', 'Theme sections'], ['columns', 'Columns'], ['atlas', 'Atlas'], ['timeline', 'Timeline'], ['briefing', 'Briefing']] as const;

for (const [id, label] of views) {
  test(`${label} renders, passes accessibility checks and has a review screenshot`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await mkdir('test-results/parity', { recursive: true });
    await page.goto(`/?view=${id}`);
    const button = page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: label, exact: false });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `test-results/parity/app-${id}.png`, animations: 'disabled' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious.map(v => ({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('each view remains usable with reduced motion and preserves the open object', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=current&open=theory:t1');
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toHaveText('Tokens become nearly free for routine work');
  for (const [, label] of views) {
    await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: label, exact: false }).click();
    await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/parity/app-reduced-motion-pane.png', animations: 'disabled' });
});

test('canonical jig frame is captured alongside the app', async ({ page }) => {
  await page.setViewportSize({ width: 1560, height: 1100 });
  await page.goto('http://127.0.0.1:5181/app');
  await page.locator('.as').first().screenshot({ path: 'test-results/parity/jig-theme-sections.png', animations: 'disabled' });
});
