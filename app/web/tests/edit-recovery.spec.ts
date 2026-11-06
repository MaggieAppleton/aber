import { expect, test } from '@playwright/test';

test('retrying a confidence save after a lost response creates one stance', async ({ page, request }) => {
  const created = await request.post('/api/tools/writeTheory', { data: { claim: 'Confidence response recovery', confidence: 3, horizon: 2028 } });
  expect(created.ok()).toBe(true); const { id, stances } = await created.json();
  const commandIds: string[] = [];
  await page.route('**/api/tools/setConfidence', async route => {
    commandIds.push(route.request().postDataJSON().commandId);
    if (commandIds.length === 1) {
      const committed = await route.fetch(); expect(committed.ok()).toBe(true);
      await route.fulfill({ status: 503, json: { error: 'Synthetic lost acknowledgement' } });
    } else await route.continue();
  });
  await page.goto(`/?view=default&open=theory:${id}`);
  const slider = page.getByRole('slider', { name: 'Confidence', exact: true });
  await slider.focus(); await slider.press('4'); await slider.press('Tab');
  const alert = page.getByRole('alert'); await expect(alert).toContainText('Synthetic lost acknowledgement');
  await alert.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${id}`)).json()).confidence).toBe(4);
  await expect.poll(() => commandIds.length).toBe(2);
  expect(commandIds[0]).toBeTruthy(); expect(commandIds[1]).toBe(commandIds[0]);
  await page.reload();
  await expect(slider).toHaveAttribute('aria-valuenow', '4');
  const saved = await (await request.get(`/api/objects/theory/${id}`)).json();
  expect(saved.stances).toHaveLength(stances.length + 1);
});

test('failed personal wording survives refresh and Retry saving persists it', async ({ page, request }) => {
  const created = await request.post('/api/tools/writeTheory', { data: { claim: 'Saved before interruption', confidence: 3, horizon: 2028 } });
  expect(created.ok()).toBe(true); const { id } = await created.json();
  let attempts = 0;
  await page.route('**/api/tools/editTheory', async route => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, json: { error: 'Synthetic save interruption' } });
    else await route.continue();
  });
  await page.goto(`/?view=default&open=theory:${id}`);
  const claim = page.getByRole('textbox', { name: 'Claim', exact: true });
  await claim.fill('Personal wording kept through interruption'); await claim.press('Tab');
  const alert = page.getByRole('alert'); await expect(alert).toContainText('Synthetic save interruption');
  await expect(claim).toHaveText('Personal wording kept through interruption');
  expect((await (await request.get(`/api/objects/theory/${id}`)).json()).claim).toBe('Saved before interruption');
  const refreshed = page.waitForResponse(response => response.url().endsWith('/api/world'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await refreshed;
  await expect(claim).toHaveText('Personal wording kept through interruption');
  await alert.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`/api/objects/theory/${id}`)).json()).claim).toBe('Personal wording kept through interruption');
  await page.reload(); await expect(claim).toHaveText('Personal wording kept through interruption');
  expect(attempts).toBe(2);
});
