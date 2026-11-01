import { test, expect, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

async function complete(request: APIRequestContext, id: string) {
  await expect.poll(async () => (await (await request.get(`/api/dumps/${id}`)).json()).status, { timeout: 30000 }).toBe('done');
  return (await request.get(`/api/dumps/${id}`)).json();
}
async function capture(request: APIRequestContext, data: object) {
  const response = await request.post('/api/dumps', { data });
  expect(response.status()).toBe(201);
  const dump = await response.json();
  return complete(request, dump.id);
}
test('capture becomes filed signals with an auditable origin and survives a reload', async ({ request, page }) => {
  expect((await request.get('/healthz')).ok()).toBeTruthy();
  const dump = await capture(request, { text: 'A developer now runs a small coding model on her laptop for routine work.', from: 'shortcut' });
  expect(dump.signals.length).toBeGreaterThan(0);
  expect(dump.runs.some((run: any) => run.status === 'done')).toBeTruthy();
  const signal = await (await request.get(`/api/objects/signal/${dump.signals[0].id}`)).json();
  expect(signal.origins.some((origin: any) => origin.dumpId === dump.id || origin.dump_id === dump.id)).toBeTruthy();
  expect(signal.themes.length).toBeGreaterThan(0);
  await page.goto('/?view=columns');
  await expect(page.getByRole('navigation', { name: 'Views' })).toBeVisible();
  await page.reload();
  const world = await (await request.get('/api/world')).json();
  expect(world.signals.some((value: any) => value.id === signal.id)).toBeTruthy();
});

test('a repeated normalised link attaches a second origin instead of creating another signal', async ({ request }) => {
  const first = await capture(request, { text: 'The price of routine intelligence keeps falling.', urls: ['https://x.com/aber_e2e/status/91827?s=20'], from: 'web' });
  const second = await capture(request, { text: 'Here is the same observation again.', urls: ['https://www.twitter.com/aber_e2e/status/91827?utm_source=test'], from: 'web' });
  const ids = first.signals.map((signal: any) => signal.id);
  expect(second.signals.some((signal: any) => ids.includes(signal.id))).toBeTruthy();
  const signal = await (await request.get(`/api/objects/signal/${second.signals.find((signal: any) => ids.includes(signal.id)).id}`)).json();
  expect(signal.origins.map((origin: any) => origin.dumpId ?? origin.dump_id)).toEqual(expect.arrayContaining([first.id, second.id]));
});

test('voice upload is transcribed, processed and its original audio remains playable', async ({ request }) => {
  const buffer = readFileSync(fileURLToPath(new URL('./fixtures/voice-note.m4a', import.meta.url)));
  const response = await request.post('/api/dumps', { multipart: { from: 'shortcut', file: { name: 'voice-note.m4a', mimeType: 'audio/mp4', buffer } } });
  expect(response.status()).toBe(201);
  const dump = await complete(request, (await response.json()).id);
  expect(dump.transcripts[0].text.length).toBeGreaterThan(10);
  expect(dump.signals.length).toBeGreaterThan(0);
  const audio = await request.get(`/media/${dump.attachments.find((attachment: any) => attachment.kind === 'audio').mediaId}`);
  expect(audio.ok()).toBeTruthy();
  expect((await audio.body()).length).toBe(buffer.length);
});

test('binning and restoring a processed dump restores its signals and evidence', async ({ request }) => {
  const dump = await capture(request, { text: 'A solo designer built a personal household budgeting app with an agent.', from: 'web' });
  const before = dump.signals.map((signal: any) => signal.id).sort();
  const preview = await request.post('/api/tools/previewDeleteDump', { data: { id: dump.id } });
  expect(preview.ok()).toBeTruthy();
  expect((await request.post('/api/tools/deleteDump', { data: { id: dump.id } })).ok()).toBeTruthy();
  const bin = await (await request.get('/api/dumps?bin=1')).json();
  expect(bin.some((value: any) => value.id === dump.id)).toBeTruthy();
  expect((await request.post('/api/tools/restoreDump', { data: { id: dump.id } })).ok()).toBeTruthy();
  const restored = await (await request.get(`/api/dumps/${dump.id}`)).json();
  expect(restored.signals.map((signal: any) => signal.id).sort()).toEqual(before);
});
