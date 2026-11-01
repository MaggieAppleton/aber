import { defineConfig,devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
process.env.PLAYWRIGHT_BROWSERS_PATH||="/private/tmp/aber-playwright";
export default defineConfig({
  testDir:"./review-tests",testMatch:"*.spec.ts",workers:1,fullyParallel:false,timeout:60000,expect:{timeout:15000},reporter:"list",
  use:{baseURL:"http://127.0.0.1:5193",trace:"retain-on-failure",screenshot:"only-on-failure",reducedMotion:"reduce",actionTimeout:15000,navigationTimeout:15000},
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"],viewport:{width:1360,height:820}}}],
  outputDir:"../test-results/web-review",
  webServer:{cwd:fileURLToPath(new URL("../",import.meta.url)),command:'npm run seed && npx tsx web/review-tests/seed.ts && npx concurrently -k "tsx server/src/index.ts" "vite --host 127.0.0.1 --port 5193 --strictPort"',url:"http://127.0.0.1:5193",reuseExistingServer:false,timeout:120000,
    env:{AGENT_MODE:"fake",ABER_DATA_DIR:`/private/tmp/aber-web-review-${process.pid}`,PORT:"3013",ABER_API_TARGET:"http://127.0.0.1:3013"}},
});
