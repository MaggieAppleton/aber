import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

async function theory(request: APIRequestContext, claim: string, options: object = {}) {
  const response = await request.post('/api/tools/writeTheory', {
    data: { claim, confidence: 3, horizon: 2028, ...options },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function object(request: APIRequestContext, id: string) {
  const response = await request.get(`/api/objects/theory/${id}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function bounds(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function drag(page: Page, locator: Locator, x: number, y: number) {
  const box = await bounds(locator);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  // Holding before release deliberately removes throw velocity from this gesture.
  await page.waitForTimeout(120);
  await page.mouse.up();
}

test('Atlas discloses evidence as it zooms, opens a territory, and pans without opening an object', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=atlas');
  const map = page.getByRole('group', { name: 'Atlas map', exact: true });
  await expect(map).toHaveAttribute('data-style', 'circles');
  await expect(map).toHaveAttribute('data-treatment', 'paper');
  const ticks = map.locator('.a2-halo .a2-tick');
  await expect(ticks.first()).toHaveAttribute('tabindex', '-1');
  await expect(map.locator('.a2-lab[data-show]')).toHaveCount(0);

  const zoom = () => map.evaluate(element => Number((element as HTMLElement).style.getPropertyValue('--z')));
  await map.focus();
  for (let step = 0; step < 8 && await zoom() < 1.6; step++) await map.press('+');
  expect(await zoom()).toBeGreaterThanOrEqual(1.6);
  await expect(ticks.first()).toHaveAttribute('tabindex', '0');
  await expect.poll(() => map.locator('.a2-lab:not([data-kind="sig"])[data-show]').count()).toBeGreaterThan(0);
  await expect(map.locator('.a2-lab[data-kind="sig"][data-show]')).toHaveCount(0);
  for (let step = 0; step < 4 && await zoom() < 2.5; step++) await map.press('+');
  expect(await zoom()).toBeGreaterThanOrEqual(2.5);
  await expect.poll(() => map.locator('.a2-lab[data-kind="sig"][data-show]').count()).toBeGreaterThan(0);

  await map.getByRole('button', { name: 'Fit map (0)', exact: true }).click();
  await expect(ticks.first()).toHaveAttribute('tabindex', '-1');
  const territory = map.getByRole('button', { name: /^Cost of intelligence,/ });
  const territoryBox = await bounds(territory);
  const beforePan = await map.locator('.a2-world').getAttribute('style');
  await drag(page, territory, territoryBox.x + territoryBox.width / 2 + 65, territoryBox.y + territoryBox.height / 2 + 35);
  await expect.poll(() => map.locator('.a2-world').getAttribute('style')).not.toBe(beforePan);
  await expect(page.getByRole('complementary', { name: 'Open object' })).toHaveCount(0);
  await expect(page).not.toHaveURL(/open=/);

  await map.getByRole('button', { name: 'Fit map (0)', exact: true }).click();
  // Keyboard activation targets the territory itself, regardless of overlapping landmarks.
  await territory.focus();
  await territory.press('Enter');
  await expect(page).toHaveURL(/open=theme%3Acost/);
  await expect(page.getByRole('textbox', { name: 'Theme name', exact: true })).toHaveText('Cost of intelligence');
  await expect(territory).toHaveAttribute('data-sel', '');
  await expect(territory).toHaveAttribute('data-zoomed', '');
  await expect.poll(async () => {
    const region = await bounds(territory), viewport = await bounds(map);
    return Math.abs(region.x + region.width / 2 - viewport.x - viewport.width / 2);
  }).toBeLessThan(2);
});

test('Timeline opens one level per badge and Escape returns through the chain, levels and pane', async ({ page, request }) => {
  const a = await theory(request, 'Spatial chain: initial cause', { horizon: 2027, confidence: 2 });
  const b = await theory(request, 'Spatial chain: first consequence', { horizon: 2028, follows: [a.id] });
  const c = await theory(request, 'Spatial chain: second consequence', { horizon: 2029, confidence: 4, follows: [b.id] });
  const d = await theory(request, 'Spatial chain: final consequence', { horizon: 2030, confidence: 5, follows: [c.id] });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=timeline');
  const field = page.locator('.t2a-plot');
  await expect(field.locator('.t2a-links path[data-a]')).toHaveCount(0);
  await field.locator(`[data-tid="${a.id}"]`).click();
  const claim = page.getByRole('textbox', { name: 'Claim', exact: true });
  await expect(claim).toHaveText(a.claim);
  await expect(field.locator(`[data-tid="${b.id}"]`)).not.toHaveAttribute('data-dim');
  await expect(field.locator(`[data-tid="${c.id}"]`)).toHaveAttribute('data-dim', '');
  await expect(field.locator(`[data-tid="${d.id}"]`)).toHaveAttribute('data-dim', '');
  const levels = field.getByRole('group', { name: 'Opened levels', exact: true });
  await field.getByRole('button', { name: 'Show 1 further consequence', exact: true }).click();
  await expect(levels.getByRole('button')).toHaveCount(1);
  await expect(field.locator(`[data-tid="${c.id}"]`)).not.toHaveAttribute('data-dim');
  await expect(field.locator(`[data-tid="${d.id}"]`)).toHaveAttribute('data-dim', '');
  await field.getByRole('button', { name: 'Show 1 further consequence', exact: true }).click();
  await expect(levels.getByRole('button')).toHaveCount(2);
  await expect(field.locator(`[data-tid="${d.id}"]`)).not.toHaveAttribute('data-dim');

  const follow = field.getByRole('button', { name: 'Follow chain', exact: true });
  await follow.click();
  await expect(follow).toHaveAttribute('aria-pressed', 'true');
  const cards = field.locator('.t2x-chain').getByRole('button');
  await expect(cards).toHaveCount(4);
  const cardX = await Promise.all([a, b, c, d].map(async t => (await bounds(cards.filter({ hasText: t.claim }))).x));
  expect(cardX).toEqual([...cardX].sort((x, y) => x - y));
  await page.keyboard.press('Escape');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await expect(field.locator('.t2x-chain')).toHaveCount(0);
  await expect(levels.getByRole('button')).toHaveCount(2);
  await expect(claim).toHaveText(a.claim);
  await page.keyboard.press('Escape');
  await expect(levels.getByRole('button')).toHaveCount(1);
  await expect(field.locator(`[data-tid="${d.id}"]`)).toHaveAttribute('data-dim', '');
  await expect(claim).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(levels.getByRole('button')).toHaveCount(0);
  await expect(field.locator(`[data-tid="${c.id}"]`)).toHaveAttribute('data-dim', '');
  await expect(claim).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(claim).toHaveCount(0);
});

test('Timeline vertical and horizontal drops persist confidence history and horizon after reload', async ({ page, request }) => {
  const created = await theory(request, 'Spatial drag: a held theory', { horizon: 2031, confidence: 1 });
  const initial = await object(request, created.id);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=timeline');
  const field = page.locator('.t2a-plot');
  const dot = field.locator(`[data-tid="${created.id}"] .t2a-dot`);
  const start = await bounds(dot);
  const topRow = await bounds(field.locator('.t2a-hline').nth(0));
  const secondRow = await bounds(field.locator('.t2a-hline').nth(1));
  await drag(page, dot, start.x + start.width / 2, (topRow.y + secondRow.y) / 2);
  await expect.poll(async () => (await object(request, created.id)).confidence).toBe(5);
  const vertical = await object(request, created.id);
  expect(vertical.horizon).toBe(2031);
  expect(vertical.stances).toHaveLength(initial.stances.length + 1);
  await expect(page.getByRole('complementary', { name: 'Open object' })).toHaveCount(0);

  const year = await bounds(field.locator('.t2a-year').filter({ hasText: /^2029$/ }));
  const moved = await bounds(dot);
  await drag(page, dot, year.x + year.width / 2, moved.y + moved.height / 2);
  await expect.poll(async () => (await object(request, created.id)).horizon).toBe(2029);
  const horizontal = await object(request, created.id);
  expect(horizontal.confidence).toBe(5);
  expect(horizontal.stances).toHaveLength(vertical.stances.length);
  await page.reload();
  await field.locator(`[data-tid="${created.id}"]`).click();
  await expect(page.getByRole('slider', { name: 'Confidence', exact: true })).toHaveAttribute('aria-valuenow', '5');
  await expect(page.locator('.as-pane')).toContainText('2029');
  expect((await object(request, created.id)).stances.map((stance: any) => stance.confidence)).toEqual([1, 5]);
});

test('Columns fold to counted rails, restore from a full pane, and unfold related signals in place', async ({ page, request }) => {
  const created = await theory(request, 'Spatial columns: evidence has a visible lineage', { themes: ['cost'] });
  for (const signalId of ['s1', 's3']) {
    expect((await request.post('/api/tools/linkEvidence', { data: { theoryId: created.id, signalId, stance: 'supports' } })).ok()).toBeTruthy();
  }
  expect((await request.post('/api/tools/writePrototype', {
    data: { name: 'Spatial columns: one related prototype', theories: [created.id] },
  })).ok()).toBeTruthy();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=columns');
  const columns = page.locator('.cd-col');
  await expect(columns).toHaveCount(5);
  expect(await columns.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-kind')))).toEqual(['dump', 'signal', 'theme', 'theory', 'prototype']);
  await page.locator(`.cd-item[data-id="${created.id}"] .cd-item-btn`).click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toHaveText(created.claim);
  for (const [name, count] of [['Dumps', 2], ['Signals', 2], ['Themes', 1], ['Prototypes', 1]] as const) {
    const rail = page.getByRole('button', { name: `Show ${name}`, exact: true });
    await expect(rail).toBeVisible();
    await expect(rail.locator('.cd-rail-n')).toHaveText(String(count));
    await expect.poll(async () => Math.round((await bounds(rail.locator('..'))).width)).toBe(44);
  }
  await expect(page.locator('.cd-col[data-kind="theory"]')).toHaveAttribute('data-wide', '');
  const edge = page.getByRole('separator');
  const previousWidth = await edge.getAttribute('aria-valuenow');
  await page.getByRole('button', { name: /^Full width/ }).click();
  await expect(page.locator('.cd-col[data-wide]')).toHaveCount(0);
  await expect(page.locator('.cd-rail')).toHaveCount(5);
  await page.getByRole('button', { name: 'Show Themes', exact: true }).click();
  await expect(edge).toHaveAttribute('aria-valuenow', previousWidth!);
  await expect(page.locator('.cd-col[data-kind="theory"]')).toHaveAttribute('data-wide', '');
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Show Signals', exact: true }).click();
  await page.locator('.cd-item[data-id="s1"] .cd-item-btn').click();
  await expect(page.locator('.cd-item[data-id="s1"] .cd-detail')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Open object' })).toHaveCount(0);
  const theories = page.locator('.cd-col[data-kind="theory"] .cd-item');
  await expect(theories.first()).toHaveAttribute('data-id', 't1');
  await expect(theories.first()).not.toHaveAttribute('data-dim');
  await expect(page.locator(`.cd-item[data-id="${created.id}"]`)).not.toHaveAttribute('data-dim');
  await expect(page.locator('.cd-item[data-id="t3"]')).toHaveAttribute('data-dim', '');
});

test('pointer resizing follows the edge and settles on the nearest pane snap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?view=current&open=theory:t1');
  const edge = page.getByRole('separator');
  await expect(edge).toHaveAttribute('aria-valuetext', 'Wide width');
  const box = await bounds(edge);
  const wide = Number(await edge.getAttribute('aria-valuenow'));
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + wide - 505, y, { steps: 12 });
  await expect(edge).toHaveAttribute('aria-valuenow', '505');
  await expect(edge).toHaveAttribute('aria-valuetext', '505 pixels');
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(edge).toHaveAttribute('aria-valuetext', 'Compact width');
  await expect(edge).toHaveAttribute('aria-valuenow', '480');
  await expect.poll(async () => Math.round((await bounds(page.locator('.as-pane'))).width)).toBe(480);

  const compactEdge = await bounds(edge);
  await drag(page, edge, compactEdge.x + compactEdge.width / 2 - 180, compactEdge.y + compactEdge.height / 2);
  await expect(edge).toHaveAttribute('aria-valuetext', 'Half width');
  await expect(edge).toHaveAttribute('aria-valuenow', '680');
  await expect.poll(async () => Math.round((await bounds(page.locator('.as-pane'))).width)).toBe(680);
});
