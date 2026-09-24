import 'dotenv/config';
import {db} from '../server/db.js';
import {notificationSettings,telegramTransport,verifyNotificationChannel} from '../server/telegram-notifications.js';
import {runNotificationOnce} from '../server/outbox.js';
let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
try{
 const settings=notificationSettings(process.env);
 if(!settings.enabled)console.log('Notifications disabled');
 else{
  const call=telegramTransport(settings.token);await verifyNotificationChannel(settings,call);
  do{await runNotificationOnce(db,settings,call);if(process.argv.includes('--once'))break;await new Promise(r=>setTimeout(r,1000));}while(!stopping);
 }
}catch{
 // Do not log provider errors: they can contain request URLs and the bot token.
 await db.query("INSERT INTO notification_worker(id,error_code) VALUES(true,'worker_failed') ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),error_code='worker_failed'").catch(()=>{});
 console.error('Notification worker failed; check configuration and queue status.');process.exitCode=1;
}finally{await db.end();}
