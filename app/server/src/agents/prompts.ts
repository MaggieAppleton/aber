import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appDir } from '../config.js';

export function promptFor(name: 'process-dump' | 'link-evidence' | 'tripwire' | 'chat'): { system: string; promptVersion: string } {
  const source = readFileSync(join(appDir, 'server/src/agents/prompts', `${name}.md`), 'utf8');
  const [version, ...body] = source.split('\n');
  return { system: body.join('\n').trim(), promptVersion: version!.replace(/^Version:\s*/, '').trim() };
}
