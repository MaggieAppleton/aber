import { embedText } from '../adapters.js';
import type { AgentDatabase, RunContext } from '../types.js';
import type { Row } from './context.js';

const caches = new WeakMap<AgentDatabase, Map<string, Promise<number[]>>>();
function cosine(first: number[], second: number[]): number {
  if (first.length !== second.length) return 0;
  let dot = 0, a = 0, b = 0;
  for (let index = 0; index < first.length; index++) { dot += first[index]! * second[index]!; a += first[index]! ** 2; b += second[index]! ** 2; }
  return a && b ? dot / Math.sqrt(a * b) : 0;
}

/** Theory text has no persisted embedding column; cache by exact current wording. */
export async function rankTheories(db: AgentDatabase, candidates: Row[], vector: number[], field: 'claim' | 'tripwire', count: number, ctx: RunContext): Promise<Row[]> {
  let cache = caches.get(db);
  if (!cache) { cache = new Map(); caches.set(db, cache); }
  const ranked: { theory: Row; similarity: number }[] = [];
  for (const theory of candidates) {
    const text = (field === 'tripwire' ? theory.tripwire : `${theory.claim}\n${theory.body ?? ''}`).slice(0, 6500);
    const key = `${process.env.AGENT_MODE}:${field}:${theory.id}:${text}`;
    let embedding = cache.get(key);
    if (!embedding) {
      embedding = embedText(db, text, ctx);
      cache.set(key, embedding);
      if (cache.size > 500) cache.delete(cache.keys().next().value!);
    }
    try { ranked.push({ theory, similarity: cosine(vector, await embedding) }); }
    catch (error) { cache.delete(key); throw error; }
  }
  return ranked.sort((first, second) => second.similarity - first.similarity || first.theory.id.localeCompare(second.theory.id)).slice(0, count).map(item => ({ ...item.theory, similarity: item.similarity }));
}
