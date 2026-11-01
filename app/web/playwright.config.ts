import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/private/tmp/aber-playwright';
const directory=resolve('/private/tmp',`aber-web-regressions-${process.pid}`);
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,timeout:60000,expect:{timeout:15000},reporter:[['list']],
 use:{baseURL:'http://127.0.0.1:5192',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:1360,height:820}}}],
 outputDir:'../test-results/web-followup',
 webServer:{cwd:fileURLToPath(new URL('../',import.meta.url)),command:'npm run seed && npx concurrently -k "tsx server/src/index.ts" "vite --host 127.0.0.1 --port 5192 --strictPort"',url:'http://127.0.0.1:5192',timeout:120000,reuseExistingServer:false,
 env:{AGENT_MODE:'fake',ABER_DATA_DIR:directory,PORT:'3012',ABER_API_TARGET:'http://127.0.0.1:3012'}},
});
