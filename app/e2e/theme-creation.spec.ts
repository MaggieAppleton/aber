import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const artifacts = fileURLToPath(new URL('../../reports/parity-repair/theme-creation/', import.meta.url));
const phase = process.env.THEME_CREATION_CAPTURE_PHASE ?? 'after';

test('a theme full view creates a theory associated with that theme', async ({ page, request }) => {
  const themeResponse = await request.post('/api/tools/writeTheme', { data: { name: 'Theme creation context' } });
  expect(themeResponse.ok()).toBe(true);
  const theme = await themeResponse.json();
  const initial = await request.post('/api/tools/writeTheory', { data: { claim: 'An existing theory makes this section populated', horizon: 2028, themes: [theme.id] } });
  expect(initial.ok()).toBe(true);
  await page.goto(`/?view=default&type=theme&item=${theme.id}`);
  await expect(page.getByRole('textbox', { name: 'Theme name', exact: true })).toHaveText('Theme creation context');
  await expect(page.locator('.tf-main .pn-tile')).toHaveCount(1);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: resolve(artifacts, `${phase}-populated-theme.png`) });
  const addTheory = page.locator('.tf-main').getByRole('button', { name: 'State a theory', exact: true });
  await expect(addTheory).toBeVisible(); await addTheory.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Claim', exact: true }).fill('A theory written directly under its theme');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Claim', exact: true })).toHaveText('A theory written directly under its theme');
  await expect(page).toHaveURL(/type=theory/);
  const id = new URL(page.url()).searchParams.get('item')!;
  const stored = await (await request.get(`/api/objects/theory/${id}`)).json();
  expect(stored.themes.map((row: any) => typeof row === 'string' ? row : row.id ?? row.themeId ?? row.theme_id)).toEqual([theme.id]);
});

test('the Themes list header creates a theme through the existing dialog', async ({ page, request }) => {
  await page.goto('/?view=default&type=theme');
  const header = page.locator('.tf-lhead');
  await expect(header).toBeVisible();
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: resolve(artifacts, `${phase}-sidebar.png`) });
  const addTheme = header.getByRole('button', { name: 'New theme', exact: true });
  await expect(addTheme).toBeVisible(); await addTheme.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill('Theme created from the sidebar');
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Theme name', exact: true })).toHaveText('Theme created from the sidebar');
  const id = new URL(page.url()).searchParams.get('item')!;
  expect((await (await request.get(`/api/objects/theme/${id}`)).json()).name).toBe('Theme created from the sidebar');
});

test('an empty workspace retains one theme-creation action', async ({ page, request }) => {
  const world = await (await request.get('/api/world')).json();
  await page.route('**/api/world', route => route.fulfill({ json: { ...world, themes: [], theories: [], signals: [], prototypes: [] } }));
  await page.goto('/?view=default&type=theme');
  await expect(page.locator('.tf-list .tf-row')).toHaveCount(0);
  await expect(page.locator('.tf-list').getByText('No themes yet', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New theme', exact: true })).toHaveCount(1);
  await page.locator('.tf-lhead').getByRole('button', { name: 'New theme', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
