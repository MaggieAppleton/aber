import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let saved: Record<string, any>;
let calls: string[];
let fail: string | undefined;
let intercept: (() => Promise<Response>) | undefined;
let failWorld = false;
let loseConfidenceResponse = false;
let commands: string[];
let appliedCommands: Set<string>;
let live: typeof import('../data/live');
let edits: typeof import('./edits');
const turn = () => new Promise(resolve => setTimeout(resolve, 0));
beforeEach(async () => {
  vi.resetModules(); calls = []; fail = undefined; intercept = undefined; failWorld = false; loseConfidenceResponse = false; commands = []; appliedCommands = new Set();
  saved = { themes: [], theories: [{ id: 'edit-test', claim: 'Saved claim', body: '', tripwire: '', horizon: 2028, confidence: 3, status: 'held', stances: [], themes: [], follows: [], rivals: [] }], signals: [], dumps: [], prototypes: [], suggestions: [], merges: [] };
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/world') return failWorld ? Response.json({error:'Refresh failed'},{status:503}) : Response.json(structuredClone(saved));
    const name = url.split('/').at(-1)!; calls.push(name);
    const input = JSON.parse(String(options?.body ?? '{}'));
    if (intercept) return intercept();
    if (name === fail) return Response.json({ error: 'Synthetic save failure' }, { status: 503 });
    const theory = saved.theories[0];
    if (name === 'setConfidence') {
      commands.push(input.commandId);
      if (!appliedCommands.has(input.commandId)) { theory.confidence = input.confidence; theory.stances.push({ confidence: input.confidence }); appliedCommands.add(input.commandId); }
      if (loseConfidenceResponse) { loseConfidenceResponse = false; throw new Error('Response lost after save'); }
    }
    else Object.assign(theory, input);
    return Response.json(theory);
  }));
  live = await import('../data/live'); edits = await import('./edits'); await live.refresh();
});
afterEach(() => vi.unstubAllGlobals());

it('retains an acknowledged edit when refreshing the world fails',async()=>{
  failWorld=true;edits.setEdit('theory','edit-test',{claim:'Acknowledged personal words'});
  await edits.flushEdit('theory','edit-test');await turn();
  expect(saved.theories[0].claim).toBe('Acknowledged personal words');
  expect(edits.getEdit('theory','edit-test').claim).toBe('Acknowledged personal words');
});

it('reuses the same confidence command after a lost response and gives a new edit a new command', async () => {
  loseConfidenceResponse = true;
  edits.setEdit('theory', 'edit-test', { confidence: 4 });
  await edits.flushEdit('theory', 'edit-test');
  expect(saved.theories[0].stances).toHaveLength(1);
  await edits.retryFailedEdits();
  expect(saved.theories[0].stances).toHaveLength(1);
  expect(commands[0]).toBeTruthy(); expect(commands[1]).toBe(commands[0]);
  edits.setEdit('theory', 'edit-test', { confidence: 5 });
  await edits.flushEdit('theory', 'edit-test');
  expect(saved.theories[0].stances).toHaveLength(2);
  expect(commands[2]).not.toBe(commands[0]);
});

it('retains failed personal wording across world refresh and retries successfully', async () => {
  fail = 'editTheory'; edits.setEdit('theory', 'edit-test', { claim: 'Unsaved personal wording' });
  await edits.flushEdit('theory', 'edit-test'); await turn(); await live.refresh();
  expect(edits.getEdit('theory', 'edit-test').claim).toBe('Unsaved personal wording');
  expect(saved.theories[0].claim).toBe('Saved claim');
  fail = undefined; await edits.flushEdit('theory', 'edit-test'); await turn();
  expect(saved.theories[0].claim).toBe('Unsaved personal wording');
  expect(calls).toEqual(['editTheory', 'editTheory']);
});

it('keeps newer words entered during failure without automatically repeating failed requests', async () => {
  let finish!: (response: Response) => void;
  intercept = () => new Promise<Response>(resolve => { finish = resolve; });
  edits.setEdit('theory', 'edit-test', { claim: 'First unsaved words' });
  const flushing = edits.flushEdit('theory', 'edit-test');
  await vi.waitFor(() => expect(calls).toHaveLength(1));
  edits.setEdit('theory', 'edit-test', { claim: 'Newer personal words' });
  intercept = undefined; fail = 'editTheory'; finish(Response.json({ error: 'Synthetic failure' }, { status: 503 }));
  await flushing; await turn(); await live.refresh();
  expect(edits.getEdit('theory', 'edit-test').claim).toBe('Newer personal words');
  expect(calls).toHaveLength(1);
  fail = undefined; await edits.flushEdit('theory', 'edit-test'); await turn();
  expect(saved.theories[0].claim).toBe('Newer personal words');
});

it('does not repeat an acknowledged stance when a later horizon save fails', async () => {
  fail = 'setHorizon'; edits.setEdit('theory', 'edit-test', { confidence: 4, horizon: 2031 });
  await edits.flushEdit('theory', 'edit-test'); await turn();
  expect(edits.getEdit('theory', 'edit-test').horizon).toBe(2031);
  expect(saved.theories[0].confidence).toBe(4);
  fail = undefined; await edits.flushEdit('theory', 'edit-test'); await turn();
  expect(saved.theories[0].horizon).toBe(2031); expect(saved.theories[0].stances).toHaveLength(1);
  expect(calls).toEqual(['setConfidence', 'setHorizon', 'setHorizon']);
});
