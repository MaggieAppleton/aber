import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--ref' || !args[1] || args[1].startsWith('-'))) throw new Error('Usage: npm run smoke:checkout -- [--ref HEAD]');
const ref = args[1] ?? 'HEAD';
const { stdout } = await exec('git', ['rev-parse', '--verify', `${ref}^{commit}`], { cwd: repository });
const commit = stdout.trim();
const directory = await mkdtemp(join(tmpdir(), 'aber-checkout-'));
const app = join(directory, 'app');
const env: NodeJS.ProcessEnv = { ...process.env, AGENT_MODE: 'fake', ABER_DATA_DIR: join(directory, 'data') };
delete env.OPENAI_API_KEY; delete env.ANTHROPIC_API_KEY;

async function run(script: string) {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn('npm', ['run', script], { cwd: app, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveRun() : reject(new Error(`Fresh checkout ${script} failed (${code ?? signal})`)));
  });
}

try {
  const archive = join(directory, 'source.tar');
  await exec('git', ['archive', '--format=tar', `--output=${archive}`, commit, '--', 'app'], { cwd: repository });
  await exec('tar', ['-xf', archive, '-C', directory]);
  // Reuse installed locked dependencies; source comes exclusively from the commit.
  await symlink(join(repository, 'app/node_modules'), join(app, 'node_modules'), 'dir');
  console.log(`Checking committed source ${commit}, with existing local dependencies and no API keys`);
  await run('build'); await run('smoke:production');
  console.log('Fresh committed-source checkout smoke passed. No ignored source files were available.');
} finally { await rm(directory, { recursive: true, force: true }); }
