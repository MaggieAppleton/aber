import { test, expect } from '@playwright/test';

test('theory edits persist across reload, confidence appends and the pane resizes from keyboard', async ({ page, request }) => {
  const created = await request.post('/api/tools/writeTheory', { data: { claim: 'A theory created for the persistence test', body: 'Original body', confidence: 3, horizon: 2028 } });
  expect(created.ok()).toBeTruthy();
  const theory = await created.json();
  await page.goto(`/?view=current&open=theory:${theory.id}`);
  const claim = page.getByRole('textbox', { name: 'Claim', exact: true });
  await claim.fill('A theory whose edited claim survives reload');
  await claim.press('Tab');
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${theory.id}`)).json()).claim).toBe('A theory whose edited claim survives reload');
  await page.reload();
  await expect(claim).toHaveText('A theory whose edited claim survives reload');
  const confidence = page.getByRole('slider', { name: 'Confidence', exact: true });
  await confidence.focus();
  await confidence.press('4');
  await expect(confidence).toHaveAttribute('aria-valuenow', '4');
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${theory.id}`)).json()).confidence).toBe(4);
  const saved = await (await request.get(`/api/objects/theory/${theory.id}`)).json();
  expect(saved.stances.length).toBeGreaterThanOrEqual(2);
  expect(saved.versions.length).toBeGreaterThanOrEqual(2);
  const edge = page.getByRole('separator');
  const before = Number(await edge.getAttribute('aria-valuenow'));
  await edge.focus(); await edge.press('ArrowLeft');
  await expect.poll(async () => Number(await edge.getAttribute('aria-valuenow'))).toBeGreaterThan(before);
  await page.screenshot({ path: 'test-results/parity/app-edited-pane.png', animations: 'disabled' });
});

test('view URL and back restore state; Escape closes the most recent dock first', async ({ page }) => {
  await page.goto('/?view=current&open=theory:t1');
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Dump or ask/ }).click();
  await expect(page.getByPlaceholder('Dump anything, or ask')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByPlaceholder('Dump anything, or ask')).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Views' }).getByRole('button', { name: /^Atlas/ }).click();
  await expect(page).toHaveURL(/view=atlas/);
  await page.goBack();
  await expect(page).toHaveURL(/view=current/);
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();
});
