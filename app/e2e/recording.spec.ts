import { expect, test } from '@playwright/test';

test('a real browser recording can be cancelled, then stopped, transcribed and replayed', async ({ page, request }) => {
  await page.addInitScript(() => {
    // Generate valid audio through the actual MediaRecorder, without a microphone.
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const destination = context.createMediaStreamDestination();
      oscillator.frequency.value = 220; gain.gain.value = 0.12;
      oscillator.connect(gain).connect(destination); oscillator.start();
      await context.resume();
      (window as any).__recordingSources ??= [];
      (window as any).__recordingSources.push({ context, oscillator, destination });
      return destination.stream;
    } });
  });
  const initial = (await (await request.get('/api/world')).json()).dumps.length;
  let captures = 0;
  page.on('request', value => { if (value.method() === 'POST' && new URL(value.url()).pathname === '/api/dumps') captures++; });
  await page.goto('/?view=columns');
  await page.getByRole('button', { name: 'Voice dump', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop and dump', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Voice dump', exact: true })).toBeVisible();
  expect(captures).toBe(0);
  expect((await (await request.get('/api/world')).json()).dumps).toHaveLength(initial);

  await page.getByRole('button', { name: 'Voice dump', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop and dump', exact: true })).toBeVisible();
  // Give the encoder enough actual audio for a decodable recording.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 700)));
  const response = page.waitForResponse(value => value.request().method() === 'POST' && new URL(value.url()).pathname === '/api/dumps');
  await page.getByRole('button', { name: 'Stop and dump', exact: true }).click();
  const saved = await response; expect(saved.status()).toBe(201);
  const { id } = await saved.json();
  await expect.poll(async () => (await (await request.get(`/api/dumps/${id}`)).json()).status, { timeout: 30000 }).toBe('done');
  const dump = await (await request.get(`/api/dumps/${id}`)).json();
  expect(captures).toBe(1); expect(dump.captured_from).toBe('column');
  expect(dump.transcripts[0].text.length).toBeGreaterThan(10);
  expect(dump.signals.length).toBeGreaterThan(0);
  const attachment = dump.attachments.find((item: any) => item.kind === 'audio');
  expect(attachment).toBeTruthy();
  const media = await request.get(`/media/${attachment.media_id ?? attachment.mediaId}`);
  expect(media.ok()).toBe(true); expect((await media.body()).length).toBeGreaterThan(500);
  await page.reload();
  await page.getByRole('button', { name: /^Dump or ask/ }).click();
  await expect(page.locator('.ps-thread .ps-transcript').filter({ hasText: dump.transcripts[0].text })).toBeVisible();
  const player = page.locator('.ab-recorded-note').last();
  await expect(player.getByRole('button', { name: 'Play voice note', exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Play voice note', exact: true }).click();
  await expect.poll(() => player.locator('audio').evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
});
