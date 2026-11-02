import { afterEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from './index.js';
import { createTools } from '../tools/index.js';
import { seed } from '../seed.js';

let db: Database;
afterEach(() => db.close());

// A deployed instance starts from migrations alone, without the example seed.
it('works from an empty database without the example seed', () => {
  db = createDatabase(); migrate(db);
  const tools = createTools(db);
  const person = { kind: 'person' as const, id: 'maggie' };
  expect(db.prepare('SELECT COUNT(*) AS n FROM themes').get()).toEqual({ n: 0 });
  const theory = tools.call('writeTheory', { claim: 'A first real theory', confidence: 3 }, person);
  const updated = tools.call('setConfidence', { id: theory.id, confidence: 4, note: 'More evidence' }, person);
  expect(updated.stances.map((stance: { confidence: number }) => stance.confidence)).toEqual([3, 4]);
});

it('refuses to seed example data on top of real content, but reseeding an example database is a no-op', () => {
  db = createDatabase(); migrate(db);
  createTools(db).call('writeTheory', { claim: 'A real theory' }, { kind: 'person', id: 'maggie' });
  expect(() => seed(db)).toThrow(/Refusing to seed/);
  const example = createDatabase(); seed(example);
  expect(() => seed(example)).not.toThrow();
  example.close();
});

it('keeps the owner row idempotent across repeated migrations', () => {
  db = createDatabase(); migrate(db); migrate(db);
  expect(db.prepare("SELECT COUNT(*) AS n FROM people WHERE id='maggie'").get()).toEqual({ n: 1 });
});
