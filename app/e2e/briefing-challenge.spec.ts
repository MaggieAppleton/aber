import { expect, test } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from '../server/src/db/index';
import type { createTools } from '../server/src/tools/index';
import type { createApp } from '../server/src/http/app';
import type { ViteDevServer } from 'vite';
import type { ServerType } from '@hono/node-server';

// Self-contained, provider-free fixture server. Run with a config whose webServer is disabled.
// Never reuse the production API or the verification worker's ports.
test.use({ baseURL: 'http://127.0.0.1:5196', viewport: { width: 1440, height: 1000 } });
test.describe.configure({ mode: 'serial' });
let directory: string, db: Database, tools: ReturnType<typeof createTools>, app: ReturnType<typeof createApp>;
let api: ServerType, vite: ViteDevServer;
let ids: { theory: string; first: string; second: string; signal: string };
const person = { kind: 'person', id: 'maggie' } as const;
const artifacts = resolve(tmpdir(), 'aber-briefing-challenge-artifacts');

test.beforeAll(async () => {
  directory = await mkdtemp(resolve(tmpdir(), 'aber-challenge-'));
  await writeFile(resolve(directory, '.env'), '');
  Object.assign(process.env, { ABER_ENV_FILE: resolve(directory, '.env'), ABER_DATA_DIR: directory, AGENT_MODE: 'fake', JEV_MODE: 'off', ABER_API_TARGET: 'http://127.0.0.1:3016', PORT: '3016' });
  const { serve } = await import('@hono/node-server');
  api = serve({ fetch: request => app.fetch(request), hostname: '127.0.0.1', port: 3016 });
  const { createServer } = await import('vite');
  vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { port: 5196, strictPort: true } });
  await vite.listen();
  await mkdir(artifacts, { recursive: true });
});

test.beforeEach(async () => {
  db?.close();
  const { createDatabase, migrate } = await import('../server/src/db/index');
  const { createTools } = await import('../server/src/tools/index');
  const { createApp } = await import('../server/src/http/app');
  const { insert } = await import('../server/src/tools/core');
  db = createDatabase(':memory:'); migrate(db); tools = createTools(db); app = createApp(db, tools);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(now);
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('fixture-run','fixture','fake','fake','fixture','done',?)").run(now);
  const ctx = { db, ownerId: 'maggie', actor: person, now, tool: 'fixture' };
  const theory = tools.call('writeTheory', { claim: 'Routine inference will become nearly free', tripwire: 'Comparable model prices rise for two consecutive quarters.', confidence: 4 }, person);
  const signal = insert(ctx, 'signals', { gist: 'Comparable inference prices rose for the second consecutive quarter', note: '' });
  insert(ctx, 'signal_sources', { signal_id: signal.id, title: 'Inference pricing report', url: 'https://pricing.example.test/report', own_observation: 0, position: 0 });
  const signal2 = insert(ctx, 'signals', { gist: 'A second pricing survey reports the same sustained increase', note: '' });
  insert(ctx, 'signal_sources', { signal_id: signal2.id, title: 'Independent pricing survey', own_observation: 1, position: 0 });
  const actor = { kind: 'agent', job: 'fixture', runId: 'fixture-run' } as const;
  const first = tools.call('proposeChallenge', { theoryId: theory.id, signalId: signal.id, why: 'Two consecutive quarterly increases meet your tripwire.', reasoning: 'Generic reason should not replace the specific tripwire reason.' }, actor);
  const second = tools.call('proposeChallenge', { theoryId: theory.id, signalId: signal2.id, why: 'An independent source confirms the same price increase.' }, actor);
  ids = { theory: theory.id, first: first.id, second: second.id, signal: signal.id };
});

test.afterAll(async () => {
  await vite?.close();
  if (api) {
    (api as import("node:http").Server).closeAllConnections();
    await new Promise<void>(resolve => api.close(() => resolve()));
  }
  db?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

const card = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-suggestion-id="${id}"]`).locator('..');
const stored = (id: string) => db.prepare('SELECT status FROM suggestions WHERE id=?').get(id) as { status: string };
const confidence = () => tools.call('getTheory', { id: ids.theory }, person).confidence;

test('renders the approved anatomy with real content, source, consequence and visible verbs', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  const first = card(page, ids.first);
  await expect(first).toContainText('Routine inference will become nearly free');
  await expect(first).toContainText('Comparable model prices rise for two consecutive quarters.');
  await expect(first).toContainText('Two consecutive quarterly increases meet your tripwire.');
  await expect(first).toContainText('pricing.example.test');
  await expect(first).toContainText('I suggest lowering confidence from 4 to 3');
  await expect(first.getByRole('button', { name: 'Keep confidence', exact: true })).toBeVisible();
  await expect(first.getByRole('button', { name: 'Lower to 3', exact: true })).toBeVisible();
  expect(await first.locator('[data-gone]').count()).toBe(1);
  expect(await first.locator('..').evaluate(element => getComputedStyle(element).boxShadow)).toBe('none');
  await page.screenshot({ path: resolve(artifacts, 'briefing-challenge.png'), animations: 'disabled' });
});

test('accepts only the selected suggestion, persists on refresh and restores through toast Undo', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  await card(page, ids.first).getByRole('button', { name: 'Lower to 3', exact: true }).click();
  await expect(card(page, ids.first)).toHaveCount(0);
  expect(stored(ids.first).status).toBe('accepted');
  expect(stored(ids.second).status).toBe('pending'); expect(confidence()).toBe(3);
  await expect(card(page, ids.second)).toContainText('I suggest lowering confidence from 3 to 2');
  await page.reload();
  await expect(card(page, ids.first)).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card(page, ids.first)).toBeVisible();
  expect(confidence()).toBe(4); expect(stored(ids.first).status).toBe('pending');
  await page.reload();
  await expect(card(page, ids.first)).toContainText('I suggest lowering confidence from 4 to 3');
});

test('keeps confidence, persists rejection and supports keyboard Undo and accept', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  await card(page, ids.first).getByRole('button', { name: 'Keep confidence', exact: true }).click();
  await expect(card(page, ids.first)).toHaveCount(0);
  expect(stored(ids.first).status).toBe('discarded'); expect(confidence()).toBe(4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.keyboard.press('Meta+z');
  await expect(card(page, ids.first)).toBeVisible(); expect(confidence()).toBe(4);
  await card(page, ids.first).getByRole('button', { name: 'Keep confidence', exact: true }).focus();
  await page.keyboard.press('a');
  await expect(card(page, ids.first)).toHaveCount(0); expect(confidence()).toBe(3);
});

test('keeps pending content and shows decision and Undo failures with retry', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  await page.route('**/api/tools/decideSuggestion', route => route.fulfill({ status: 503, json: { error: 'Synthetic save failure' } }));
  await card(page, ids.first).getByRole('button', { name: 'Lower to 3', exact: true }).click();
  await expect(card(page, ids.first).getByRole('alert')).toContainText('Synthetic save failure');
  expect(stored(ids.first).status).toBe('pending'); expect(confidence()).toBe(4);
  await page.unroute('**/api/tools/decideSuggestion');
  await card(page, ids.first).getByRole('button', { name: 'Lower to 3', exact: true }).click();
  await expect(card(page, ids.first)).toHaveCount(0);
  await page.route('**/api/tools/decideSuggestion', route => route.fulfill({ status: 503, json: { error: 'Synthetic Undo failure' } }));
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.ps-toast').filter({ hasText: 'Could not undo' })).toBeVisible();
  expect(confidence()).toBe(3);
  await page.unroute('**/api/tools/decideSuggestion');
  await page.locator('.ps-toast').filter({ hasText: 'Could not undo' }).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card(page, ids.first)).toBeVisible(); expect(confidence()).toBe(4);
});

test('guards stale, missing, unrated and minimum-confidence challenges', async ({ page }) => {
  await page.route('**/api/world', async route => {
    const response = await route.fetch(); const data = await response.json();
    const first = data.suggestions.find((s: any) => s.id === ids.first);
    first.payload.tripwire_version = 99;
    data.theories.find((t: any) => t.id === ids.theory).confidence = null;
    await route.fulfill({ json: data });
  });
  await page.goto('/?view=default&type=briefing');
  await expect(card(page, ids.first)).toHaveCount(0);
  await expect(card(page, ids.second).getByRole('button', { name: /Lower to/ })).toBeDisabled();
  await card(page, ids.second).getByRole('button', { name: /Lower to/ }).focus();
  await expect(card(page, ids.second).getByRole('button', { name: /Lower to/ })).toBeFocused();
  await expect(card(page, ids.second)).toContainText('Set confidence');
  await page.unroute('**/api/world');
  tools.call('setConfidence', { id: ids.theory, confidence: 1 }, person);
  await page.reload();
  await expect(card(page, ids.first)).toContainText('Confidence is already at 1');
  await expect(card(page, ids.first).getByRole('button', { name: 'Lower to 1', exact: true })).toBeDisabled();
  await expect(card(page, ids.first).getByRole('button', { name: 'Keep confidence', exact: true })).toBeEnabled();
  tools.call('discardSignal', { id: ids.signal }, person);
  await page.reload();
  await expect(card(page, ids.first)).toContainText('no longer available');
  await expect(card(page, ids.first).getByRole('button', { name: /Lower to/ })).toBeDisabled();
});

test('holding accept through completion never decides the next challenge', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  await card(page, ids.first).getByRole('button', { name: 'Keep confidence', exact: true }).focus();
  await page.keyboard.down('a');
  await expect(card(page, ids.first)).toHaveCount(0);
  await page.keyboard.down('a');
  await page.keyboard.up('a');
  await expect(card(page, ids.second)).toBeVisible();
  expect(stored(ids.second).status).toBe('pending'); expect(confidence()).toBe(3);
});

test('Undo survives a failed initial world load and later explanations stay visible', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  await card(page, ids.first).getByRole('button', { name: 'Lower to 3', exact: true }).click();
  await expect(card(page, ids.first)).toHaveCount(0);
  await page.route('**/api/world', route => route.fulfill({ status: 503, json: { error: 'Synthetic initial load failure' } }));
  await page.reload();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('aber.briefingChallengeUndo'))).not.toBeNull();
  await page.unroute('**/api/world'); await page.reload();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card(page, ids.first)).toBeVisible();
  tools.call('setConfidence', { id: ids.theory, confidence: 1 }, person);
  await page.evaluate(async () => { const modulePath = '/src/data/live.ts'; await import(modulePath).then(module => module.refresh()); });
  await expect(card(page, ids.first)).toContainText('Confidence is already at 1');
});

test('repeated accept keys save one decision while the request is pending', async ({ page }) => {
  await page.goto('/?view=default&type=briefing');
  let calls = 0;
  await page.route('**/api/tools/decideSuggestion', async route => {
    calls++;
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.continue();
  });
  await card(page, ids.first).getByRole('button', { name: 'Lower to 3', exact: true }).focus();
  await page.keyboard.press('a'); await page.keyboard.press('a');
  await expect(card(page, ids.first)).toHaveCount(0);
  expect(calls).toBe(1); expect(confidence()).toBe(3);
  expect(stored(ids.second).status).toBe('pending');
});
