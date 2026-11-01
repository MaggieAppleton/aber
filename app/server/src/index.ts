import { config } from './config.js';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { createDatabase, migrate } from './db/index.js';
import { createTools } from './tools/index.js';
import { createApp } from './http/app.js';
import { startWorker } from './jobs/index.js';
import { createChatResponse } from './agents/chat.js';

const db = createDatabase(resolve(config.dataDir, 'aber.db'));
migrate(db);
const tools = createTools(db);
const worker = startWorker(db, tools);
const app = createApp(db, tools, { chat: body => createChatResponse(db, tools, body) });
const server = serve({ fetch: app.fetch, hostname: config.host, port: config.port }, () => {
  console.log(`Aber: http://${config.host}:${config.port} (${config.agentMode})`);
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await worker.stop();
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
