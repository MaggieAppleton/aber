import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ request: vi.fn(), callTool: vi.fn() }));
vi.mock('./api', () => api);
const snapshot = (signals: string[], nextCursor: string | null = null) => ({ themes: [], theories: [], signals: signals.map(id => ({ id })), dumps: [], prototypes: [], suggestions: [], merges: [], signalPage: { nextCursor, total: 3, limit: 1 } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { vi.resetModules(); api.request.mockReset(); api.callTool.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('world refresh', () => {
  it('keeps an acknowledged object when an older snapshot arrives and revalidation fails', async () => {
    const old = deferred<any>();
    api.request.mockResolvedValueOnce({ ...snapshot([]), theories: [{ id: 't', claim: 'Original' }] });
    const live = await import('./live'); await live.refresh();
    api.request.mockReturnValueOnce(old.promise).mockRejectedValueOnce(new Error('Revalidation unavailable'));
    const refreshing = live.refresh();
    api.callTool.mockResolvedValue({ id: 't', claim: 'Saved new wording' });
    const saving = live.mutateObject('theory', 't', 'editTheory', { id: 't', claim: 'Saved new wording' });
    await vi.waitFor(() => expect(live.rowFor('theory', 't')?.claim).toBe('Saved new wording'));
    old.resolve({ ...snapshot([]), theories: [{ id: 't', claim: 'Stale wording' }] });
    await Promise.all([refreshing, saving]);
    expect(live.rowFor('theory', 't')?.claim).toBe('Saved new wording');
  });

  it('ignores an older object response after its mutation has been acknowledged', async () => {
    const old = deferred<any>();
    api.request.mockResolvedValueOnce({ ...snapshot([]), theories: [{ id: 't', claim: 'Original' }] });
    const live = await import('./live'); await live.refresh();
    api.request.mockReturnValueOnce(old.promise).mockRejectedValueOnce(new Error('Revalidation unavailable'));
    const loading = live.loadObject('theory', 't');
    api.callTool.mockResolvedValue({ id: 't', claim: 'Saved new wording' });
    await live.mutateObject('theory', 't', 'editTheory', { id: 't' });
    old.resolve({ id: 't', claim: 'Stale object wording' }); await loading;
    expect(live.rowFor('theory', 't')?.claim).toBe('Saved new wording');
  });

  it('publishes only after collecting every signal page', async () => {
    const last = deferred<any>();
    api.request.mockResolvedValueOnce(snapshot(['a'], 'first cursor')).mockResolvedValueOnce(snapshot(['b'], 'second')).mockReturnValueOnce(last.promise);
    const live = await import('./live');
    const updates = vi.fn(); live.onWorld(updates);
    const pending = live.refresh();
    await vi.waitFor(() => expect(api.request).toHaveBeenCalledTimes(3));
    expect(updates).not.toHaveBeenCalled(); expect(live.world.signals).toEqual([]);
    last.resolve(snapshot(['c'])); await pending;
    expect(api.request.mock.calls.map(call => call[0])).toEqual(['/api/world', '/api/signals?cursor=first%20cursor&limit=1', '/api/signals?cursor=second&limit=1']);
    expect(live.world.signals.map(row => row.id)).toEqual(['a', 'b', 'c']); expect(updates).toHaveBeenCalledTimes(1);
  });

  it('coalesces mutations during a pending refresh into a completed follow-up snapshot', async () => {
    const first = deferred<any>(), followup = deferred<any>();
    api.request.mockReturnValueOnce(first.promise).mockReturnValueOnce(followup.promise);
    api.callTool.mockResolvedValue({ ok: true });
    const live = await import('./live');
    const initial = live.refresh();
    let mutationDone = false;
    const mutation = live.mutate('editSignal', { id: 'a' }).then(() => { mutationDone = true; });
    await vi.waitFor(() => expect(api.callTool).toHaveBeenCalledOnce());
    const concurrent = live.mutate('editSignal', { id: 'b' });
    await vi.waitFor(() => expect(api.callTool).toHaveBeenCalledTimes(2));
    first.resolve(snapshot(['old']));
    await vi.waitFor(() => expect(api.request).toHaveBeenCalledTimes(2));
    expect(mutationDone).toBe(false);
    followup.resolve(snapshot(['new'])); await Promise.all([initial, mutation, concurrent]);
    expect(live.world.signals.map(row => row.id)).toEqual(['new']);
    expect(api.request).toHaveBeenCalledTimes(2);
  });

  it('revalidates a refresh queued in the microtask that completes the preceding snapshot', async () => {
    const first = deferred<any>();
    api.request.mockReturnValueOnce(first.promise).mockResolvedValueOnce(snapshot(['new']));
    const live = await import('./live'); const initial = live.refresh();
    first.resolve(snapshot(['old']));
    const concurrent = Promise.resolve().then(() => live.refresh());
    await Promise.all([initial, concurrent]);
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(live.world.signals.map(row => row.id)).toEqual(['new']);
  });

  it('keeps the preceding complete world when a later signal page fails', async () => {
    api.request.mockResolvedValueOnce(snapshot(['complete']));
    const live = await import('./live'); await live.refresh();
    const updates = vi.fn(); live.onWorld(updates);
    api.request.mockResolvedValueOnce(snapshot(['partial'], 'cursor')).mockRejectedValueOnce(new Error('Connection lost'));
    await live.refresh();
    expect(live.world.signals.map(row => row.id)).toEqual(['complete']);
    expect(updates).not.toHaveBeenCalled();
  });

  it('ignores SSE heartbeats and revalidates a change received during paging', async () => {
    vi.useFakeTimers();
    class Stream {
      static current: Stream;
      onmessage?: (event: { data: string }) => void;
      addEventListener = vi.fn(); close = vi.fn();
      constructor() { Stream.current = this; }
    }
    vi.stubGlobal('EventSource', Stream);
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
    api.request.mockResolvedValueOnce(snapshot(['initial']));
    const live = await import('./live'); const disconnect = await live.connect();
    Stream.current.onmessage?.({ data: JSON.stringify({ type: 'heartbeat' }) });
    await vi.advanceTimersByTimeAsync(100);
    expect(api.request).toHaveBeenCalledTimes(1);
    const page = deferred<any>();
    api.request.mockResolvedValueOnce(snapshot(['a'], 'cursor')).mockReturnValueOnce(page.promise).mockResolvedValueOnce(snapshot(['latest']));
    Stream.current.onmessage?.({ data: JSON.stringify({ type: 'changed' }) });
    await vi.advanceTimersByTimeAsync(100);
    expect(api.request).toHaveBeenCalledTimes(3);
    Stream.current.onmessage?.({ data: JSON.stringify({ type: 'changed' }) });
    Stream.current.onmessage?.({ data: JSON.stringify({ type: 'changed' }) });
    await vi.advanceTimersByTimeAsync(100);
    page.resolve(snapshot(['b'])); await vi.advanceTimersByTimeAsync(0);
    expect(api.request).toHaveBeenCalledTimes(4);
    expect(live.world.signals.map(row => row.id)).toEqual(['latest']);
    disconnect();
  });
});
