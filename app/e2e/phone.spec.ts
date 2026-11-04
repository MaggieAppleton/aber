import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('phone opens Briefing, pushes a full view in from the list and returns without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Since you last looked', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'test-results/parity/app-phone-briefing.png', animations: 'disabled' });
  await page.getByRole('navigation', { name: 'Types' }).getByRole('button', { name: 'Theories', exact: true }).click();
  await page.locator('.tf-list').getByRole('button', { name: /Agents keep context across months, not sessions/ }).click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
  const main = await page.locator('.tf-main').boundingBox();
  expect(main?.width).toBeGreaterThanOrEqual(388);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => ({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.screenshot({ path: 'test-results/parity/app-phone-full.png', animations: 'disabled' });
  await page.locator('.tf-back').click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).not.toBeVisible();
  await expect(page.locator('.tf-list')).toBeVisible();
});
