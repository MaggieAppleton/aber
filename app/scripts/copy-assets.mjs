import { cp, mkdir } from 'node:fs/promises';
for (const [source, target] of [
  ['server/src/db/migrations', 'dist/server/migrations'],
  ['server/src/agents/prompts', 'dist/server/prompts'],
]) {
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
}
