import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
const usage = 'Usage: npm run seed:demo -- --dir /absolute/path/to/a/NEW/demo-directory';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') console.log(usage);
else if (args.length !== 2 || args[0] !== '--dir' || !args[1] || args[1].startsWith('--')) {
  console.error(usage); process.exitCode = 1;
} else {
  const directory = resolve(args[1]);
  const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const envFile = resolve(appDirectory, '..', '.env');
  const configured = process.env.ABER_DATA_DIR || (existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).ABER_DATA_DIR : undefined);
  // Canonical seed imports config, which creates its media directory. Isolate that side effect too.
  const runtime = mkdtempSync(resolve(tmpdir(), 'aber-demo-runtime-'));
  const previous = process.env.ABER_DATA_DIR; process.env.ABER_DATA_DIR = runtime;
  try {
    const { createDemoDirectory } = await import('./demo-seed.js');
    const result = createDemoDirectory(directory, configured ? [resolve(configured)] : []);
    console.log(`${result.status === 'created' ? 'Created' : 'Unchanged'} synthetic demo: ${result.directory}`);
    console.log(`Manifest: ${resolve(result.directory, 'demo-manifest.json')}`);
    console.log('No pending agent work. All added themes, theories and prototypes are drafts.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Demo setup failed'); process.exitCode = 1;
  } finally {
    if (previous === undefined) delete process.env.ABER_DATA_DIR; else process.env.ABER_DATA_DIR = previous;
    rmSync(runtime, { recursive: true, force: true });
  }
}
