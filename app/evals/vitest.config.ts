import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['evals/**/*.eval.ts'], environment: 'node', env: { AGENT_MODE: 'fake' }, testTimeout: 20_000 } });
