import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const artifacts = fileURLToPath(new URL('../../reports/parity-repair/chat-markdown/', import.meta.url));
const phase = process.env.CHAT_MARKDOWN_CAPTURE_PHASE ?? 'after';
const answer = '**Bold answer with *nested emphasis*** and ***both***. <img src=x onerror="window.markdownExecuted=true"> [unsafe](javascript:alert(1))';

test('restored assistant replies render emphasis while user and structured parts keep their behavior', async ({ page, request }) => {
  const world = await (await request.get('/api/world')).json();
  const theory = world.theories.find((row: any) => row.id === 't1');
  await page.route('**/api/world', route => route.fulfill({ json: { ...world, dumps: [{
    id: 'markdown-restored', status: 'done', captured_from: 'column', captured_at: '2026-11-01T12:00:00Z',
    text: 'My **user** and *note* stay literal.', attachments: [], replies: [{ id: 'markdown-reply', parts: [
      { type: 'text', text: answer },
      { type: 'tool-showTheory', state: 'output-available', input: { id: theory.id }, output: { theory: { ...theory, kind: 'theory' } } },
      { type: 'text', text: 'And __more bold__ with _italics_.' },
    ] }],
  }] } }));
  await page.goto('/?view=columns&open=theory:t1');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(page.locator('.ps-agent .ps-say')).toHaveCount(2);
  await mkdir(artifacts, { recursive: true });
  await page.mouse.move(0, 0); await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifacts, `${phase}-restored.png`) });
  const assistant = page.locator('.ps-agent');
  await expect(assistant.locator('.ps-say strong').first()).toHaveText('Bold answer with nested emphasis');
  await expect(assistant.locator('strong em')).toHaveText('nested emphasis');
  await expect(assistant.locator('em strong')).toHaveText('both');
  await expect(assistant.locator('.ps-say').last().locator('strong')).toHaveText('more bold');
  expect(await assistant.locator('.ps-say strong').first().evaluate(node => getComputedStyle(node).fontWeight)).toBe('700');
  expect(await assistant.locator('.ps-say em').first().evaluate(node => getComputedStyle(node).fontStyle)).toBe('italic');
  await expect(page.locator('.ps-me')).toContainText('My **user** and *note* stay literal.');
  await expect(page.locator('.ps-me strong, .ps-me em')).toHaveCount(0);
  await expect(assistant.locator('[data-chat-id="t1"]')).toBeVisible();
  await expect(assistant.locator('.ps-say img, .ps-say script, .ps-say a')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).markdownExecuted)).toBeUndefined();
  await page.reload();
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await expect(page.locator('.ps-agent strong em')).toHaveText('nested emphasis');
});

test('streamed assistant emphasis completes across chunks without changing user messages', async ({ page, request }) => {
  const world = await (await request.get('/api/world')).json();
  await page.route('**/api/world', route => route.fulfill({ json: { ...world, dumps: [] } }));
  await page.route('**/api/dumps', route => route.fulfill({ json: { id: 'markdown-stream', status: 'done' } }));
  await page.route('**/api/dumps/markdown-stream', route => route.fulfill({ json: { id: 'markdown-stream', status: 'done', produced: [] } }));
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, options) => {
      const address = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (new URL(address, location.href).pathname !== '/api/chat') return nativeFetch(input, options);
      const encoder = new TextEncoder(); let output!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({ start(controller) { output = controller; } });
      const emit = (event: unknown) => output.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      (window as any).markdownStream = { emit, finish() { output.enqueue(encoder.encode('data: [DONE]\n\n')); output.close(); } };
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' } });
    };
  });
  await page.goto('/?view=columns');
  await page.getByRole('button', { name: 'Dump or ask (⌘J)', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dump or ask', exact: true }).fill('Can you render **user** text?');
  await page.getByRole('button', { name: 'Ask (Return)', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!(window as any).markdownStream)).toBe(true);
  await page.evaluate(() => {
    const { emit } = (window as any).markdownStream;
    emit({ type: 'start', messageId: 'markdown-answer' }); emit({ type: 'start-step' });
    emit({ type: 'text-start', id: 'text' }); emit({ type: 'text-delta', id: 'text', delta: 'Answer: **str' });
  });
  await expect(page.locator('.ps-agent .ps-say')).toHaveText('Answer: **str');
  await page.evaluate(() => (window as any).markdownStream.emit({ type: 'text-delta', id: 'text', delta: 'ong** and *italic* and ***both***.' }));
  await expect(page.locator('.ps-agent strong').first()).toHaveText('strong');
  await expect(page.locator('.ps-agent em strong')).toHaveText('both');
  await page.evaluate(() => {
    const { emit, finish } = (window as any).markdownStream;
    emit({ type: 'text-end', id: 'text' }); emit({ type: 'finish-step' }); emit({ type: 'finish', finishReason: 'stop' }); finish();
  });
  await expect(page.locator('.ps-me')).toContainText('Can you render **user** text?');
  await expect(page.locator('.ps-me strong')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.mouse.move(0, 0); await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(artifacts, `${phase}-streamed.png`) });
});
