import { it, expect, vi } from 'vitest';
import { createDatabase, migrate } from '../db/index.js';
import { embedText } from './adapters.js';

it('handles image-only and URL-only captures without sending an empty embedding request', async () => {
  const db = createDatabase(); migrate(db);
  const previous = process.env.AGENT_MODE;
  process.env.AGENT_MODE = 'live';
  const network = vi.fn(() => { throw new Error('An empty query must not call a provider'); });
  vi.stubGlobal('fetch', network);
  try {
    expect(await embedText(db, ' \n ')).toEqual([]);
    expect(network).not.toHaveBeenCalled();
    expect(db.prepare('SELECT COUNT(*) n FROM agent_runs').get()).toEqual({ n: 0 });
  } finally { process.env.AGENT_MODE = previous; vi.unstubAllGlobals(); db.close(); }
});
