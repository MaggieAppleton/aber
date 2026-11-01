import { resolve } from 'node:path';
import { config } from '../config.js';
import { createDatabase, migrate } from './index.js';
const path = resolve(config.dataDir, 'aber.db');
const db = createDatabase(path);
migrate(db);
db.close();
console.log(`Migrated ${path}`);
