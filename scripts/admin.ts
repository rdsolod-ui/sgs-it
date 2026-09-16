import {hash} from 'argon2';
import {randomUUID} from 'node:crypto';
import {db} from '../server/db.js';
// Supply password through stdin; it is never echoed or written to disk.
let password='';for await(const chunk of process.stdin)password+=chunk;
password=password.trim();if(password.length<10)throw new Error('Admin password must have at least 10 characters');
await db.query('INSERT INTO admins(id,login,password_hash) VALUES($1,$2,$3) ON CONFLICT(login) DO UPDATE SET password_hash=excluded.password_hash',[randomUUID(),process.argv[2]||'admin',await hash(password)]);
await db.query('DELETE FROM admin_sessions');await db.end();console.log('Admin credential stored as Argon2 hash; sessions revoked');
