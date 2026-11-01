import { expect, it } from 'vitest';
import { tripwireFixture } from '../jobs/tripwire-fixture.js';

it('applies the inclusive date window, owner and active filters before each bounded page', () => {
  const state = tripwireFixture();
  try {
    const since = new Date(state.now.getTime() - 90 * 86_400_000);
    const first = state.addSignal(since); const last = state.addSignal(state.now);
    state.addSignal(new Date(since.getTime() - 1)); state.addSignal(new Date(state.now.getTime() + 1));
    const discarded = state.addSignal(new Date(state.now.getTime() - 1000));
    state.db.prepare('UPDATE signals SET discarded_at=? WHERE id=?').run(state.now.toISOString(), discarded);
    const foreign = state.addSignal(new Date(state.now.getTime() - 1000)); state.db.prepare("UPDATE signals SET owner_id='alice' WHERE id=?").run(foreign);
    const input = { since: since.toISOString(), until: state.now.toISOString(), limit: 1 };
    const page = state.tools.call('listRecentSignals', input, state.person);
    expect(page.signals).toEqual([{ id: first }]); expect(page.signalPage).toMatchObject({ total: 2, limit: 1, nextCursor: expect.any(String) });
    const next = state.tools.call('listRecentSignals', { ...input, cursor: page.signalPage.nextCursor }, state.person);
    expect(next.signals).toEqual([{ id: last }]); expect(next.signalPage.nextCursor).toBeNull();
  } finally { state.db.close(); }
});
