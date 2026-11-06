import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { THEMES } from '../server/src/db/seed-world.js';
import { PROCESSING_VERSION, type ProcessingFixture } from './fixtures/processing-v2.js';

export const allowedThemes = THEMES.map(({ id, name }) => `${id} (${name})`);
const nonempty = z.string().trim().min(1);
const url = z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an HTTP(S) URL');
const pattern = nonempty.refine(value => { try { new RegExp(value, 'i'); return true; } catch { return false; } }, 'Invalid regex clause');
const theme = nonempty.refine(value => THEMES.some(item => item.id === value || item.name === value), `Unknown seed theme; allowed: ${allowedThemes.join(', ')}`);
const observation = z.object({
  key: nonempty, finding: nonempty, clauses: z.array(pattern).optional(), themes: z.array(theme),
  urls: z.array(url).optional(), ownObservation: z.boolean().optional(),
}).strict();
const schema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/),
  text: z.string(), urls: z.array(url), transcript: nonempty.optional(),
  article: z.object({ url, title: nonempty, text: nonempty }).strict().optional(),
  expected: z.object({ count: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]), observations: z.array(observation) }).strict(),
}).strict().superRefine((value, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
  if (!value.text.trim() && !value.transcript) issue(['text'], 'Supply capture text or a transcript');
  if (value.expected.count[0] > value.expected.count[1]) issue(['expected', 'count'], 'Count must be [minimum, maximum]');
  if (value.expected.observations.length > value.expected.count[1]) issue(['expected', 'observations'], 'Observations exceed maximum count');
  if (new Set(value.expected.observations.map(item => item.key)).size !== value.expected.observations.length) issue(['expected', 'observations'], 'Duplicate observation keys');
  if (value.article && !value.urls.includes(value.article.url)) issue(['article', 'url'], 'Article URL must also occur in urls');
});
export type LocalInput = z.infer<typeof schema>;

export function parseLocalInput(value: unknown): LocalInput {
  const result = schema.safeParse(value);
  if (!result.success) {
    // Never echo capture prose or rejected values to the terminal.
    throw new Error(result.error.issues.map(issue => `${issue.path.join('.') || 'input'}: ${issue.code === 'custom' ? issue.message : 'invalid or missing field'}`).join('; '));
  }
  return result.data;
}

/** Immediate .json children only. Validate the entire batch before any inference. */
export async function loadLocalInputs(path: string): Promise<{ file: string; input: LocalInput }[]> {
  const target = resolve(path);
  const info = await stat(target);
  const files = info.isDirectory()
    ? (await readdir(target, { withFileTypes: true })).filter(item => item.isFile() && item.name.endsWith('.json')).map(item => resolve(target, item.name)).sort()
    : [target];
  if (!files.length) throw new Error('Input directory contains no JSON files');
  const ids = new Set<string>();
  const loaded = [];
  for (const file of files) {
    let value: unknown;
    try { value = JSON.parse(await readFile(file, 'utf8')); } catch { throw new Error(`Invalid JSON: ${file}`); }
    let input: LocalInput;
    try { input = parseLocalInput(value); } catch (error) { throw new Error(`${file}: ${(error as Error).message}`); }
    if (ids.has(input.id)) throw new Error(`Duplicate input ID: ${input.id}`);
    ids.add(input.id); loaded.push({ file, input });
  }
  return loaded;
}

export function processingFixture(input: LocalInput): ProcessingFixture {
  return { ...input, version: PROCESSING_VERSION, expected: { ...input.expected,
    observations: input.expected.observations.filter(item => item.clauses?.length).map(item => ({ ...item, clauses: item.clauses! })),
  } };
}
