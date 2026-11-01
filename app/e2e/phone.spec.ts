import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('phone opens Briefing, presents a full-screen pane and returns without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Since you last looked', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/parity/app-phone-briefing.png', animations: 'disabled' });
  const theory = page.getByRole('button', { name: 'Agents keep context across months, not sessions', exact: true }).first();
  await theory.click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
  const pane = await page.locator('.as-pane').boundingBox();
  expect(pane?.width).toBeGreaterThanOrEqual(388);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => ({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({ path: 'test-results/parity/app-phone-pane.png', animations: 'disabled' });
  await page.getByRole('button', { name: /Back to the Briefing|Close \(Esc\)/ }).first().click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).not.toBeVisible();
});
