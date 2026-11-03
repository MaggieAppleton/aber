import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('loads a selected env file without overriding exported variables or exposing its contents', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'aber-env-test-'));
  try {
    const path = resolve(directory, 'configuration.env');
    writeFileSync(path, 'TYPESAFE_API_KEY=scripted-test-value\nDAILY_SPEND_CAP_USD=1\n');
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
      "await import('./server/src/config.ts'); console.log(JSON.stringify({keyPresent:!!process.env.TYPESAFE_API_KEY,cap:process.env.DAILY_SPEND_CAP_USD}));"],
    { cwd: resolve(import.meta.dirname, '../..'), encoding: 'utf8', env: { ...process.env, TYPESAFE_API_KEY: '', ABER_ENV_FILE: path, ABER_DATA_DIR: directory, DAILY_SPEND_CAP_USD: '2' } });
    expect(child.status).toBe(0);
    // An exported empty key is intentional and must not be overwritten by the file.
    expect(JSON.parse(child.stdout)).toEqual({ keyPresent: false, cap: '2' });
    const env: NodeJS.ProcessEnv = { ...process.env, ABER_ENV_FILE: path, ABER_DATA_DIR: directory };
    delete env.TYPESAFE_API_KEY;
    const loaded = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
      "await import('./server/src/config.ts'); console.log(!!process.env.TYPESAFE_API_KEY);"],
    { cwd: resolve(import.meta.dirname, '../..'), encoding: 'utf8', env });
    expect(loaded.status).toBe(0); expect(loaded.stdout.trim()).toBe('true');
    expect(loaded.stdout).not.toContain('scripted-test-value');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

it('fails explicitly when the selected env file is missing', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "await import('./server/src/config.ts');"],
    { cwd: resolve(import.meta.dirname, '../..'), encoding: 'utf8', env: { ...process.env, ABER_ENV_FILE: resolve(tmpdir(), 'aber-not-an-env-file-does-not-exist') } });
  expect(child.status).not.toBe(0); expect(child.stderr).toContain('ABER_ENV_FILE does not exist');
});
