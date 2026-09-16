import {readFile} from 'node:fs/promises';
import {db,transaction} from '../server/db.js';
await transaction(async c=>{await c.query("SELECT pg_advisory_xact_lock(773410)");await c.query(await readFile('server/schema.sql','utf8'));});
await db.end();console.log('Database migration complete');
