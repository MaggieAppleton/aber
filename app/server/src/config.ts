import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
export const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const repoDir = resolve(appDir, '..');
const envFile = resolve(repoDir, '.env');
if (existsSync(envFile)) {
  const values = parseEnv(readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(values)) if (process.env[key] === undefined) process.env[key] = value;
}
export const config = {
  dataDir: resolve(process.env.ABER_DATA_DIR || resolve(appDir, 'data')),
  host: '127.0.0.1', port: Number(process.env.PORT || 3000),
  agentMode: process.env.AGENT_MODE || 'live',
  dailySpendCap: Number(process.env.DAILY_SPEND_CAP_USD || 5),
  maxCaptureBytes: 250 * 1024 * 1024,
};
mkdirSync(resolve(config.dataDir, 'media'), { recursive: true });
