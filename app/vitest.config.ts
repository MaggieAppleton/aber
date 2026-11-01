import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['server/**/*.test.ts', 'scripts/**/*.test.ts', 'web/src/**/*.test.ts', 'evals/**/*.test.ts'], environment: 'node', env: { AGENT_MODE: 'fake' }, testTimeout: 20000 },
});
