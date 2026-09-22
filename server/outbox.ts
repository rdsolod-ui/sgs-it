import {randomUUID} from 'node:crypto';
import type pg from 'pg';
import {notificationMessage,classifyTelegram,type NotificationSettings,type TelegramCall,type DeliveryResult} from './telegram-notifications.js';
async function tx<T>(pool:pg.Pool,fn:(c:pg.PoolClient)=>Promise<T>){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function enqueueNotification(c:pg.PoolClient,leadId:string,s:NotificationSettings){
 if(!s.enabled)return;
 await c.query('INSERT INTO notification_outbox(id,lead_id,target_chat,bot_id) VALUES($1,$2,$3,$4) ON CONFLICT(lead_id,event) DO NOTHING',[randomUUID(),leadId,s.chatId,s.botId]);
}
export async function claimNotification(pool:pg.Pool){return tx(pool,async c=>{
 // A crash after sending began has an unknown outcome. Never resend it automatically.
 await c.query("UPDATE notification_attempts a SET outcome='uncertain',error_code='lease_expired',finished_at=now() FROM notification_outbox n WHERE a.lease_token=n.lease_token AND n.status='sending' AND n.lease_until<now() AND a.finished_at IS NULL");
 await c.query("UPDATE notification_outbox SET status='uncertain',error_code='lease_expired',updated_at=now() WHERE status='sending' AND lease_until<now()");
 await c.query("UPDATE notification_outbox SET status='retry',lease_token=null,lease_until=null,next_attempt_at=now(),updated_at=now() WHERE status='leased' AND lease_until<now()");
 await c.query("UPDATE notification_outbox SET status='cancelled',lease_token=null,lease_until=null,updated_at=now() WHERE lead_id IS NULL AND operation='send' AND status IN ('pending','retry','leased')");
 // Keep only routing/message identifiers after lead deletion, then request removal.
 await c.query("UPDATE notification_outbox SET operation='delete',status='pending',attempts=0,next_attempt_at=now(),updated_at=now() WHERE lead_id IS NULL AND status='sent' AND message_id IS NOT NULL");
 const row=(await c.query("SELECT * FROM notification_outbox WHERE status IN ('pending','retry') AND next_attempt_at<=now() ORDER BY next_attempt_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1")).rows[0];
 if(!row)return null;const token=randomUUID();
 return (await c.query("UPDATE notification_outbox SET status='leased',lease_token=$2,lease_until=now()+interval '60 seconds',updated_at=now() WHERE id=$1 RETURNING *",[row.id,token])).rows[0];
});}
export async function runNotificationOnce(pool:pg.Pool,s:NotificationSettings,call:TelegramCall){
 if(!s.enabled)return {status:'disabled'};
 await pool.query('INSERT INTO notification_worker(id,error_code) VALUES(true,null) ON CONFLICT(id) DO UPDATE SET heartbeat_at=now(),error_code=null');
 const job=await claimNotification(pool);if(!job)return {status:'idle'};
 const payload=await tx(pool,async c=>{
  const current=(await c.query("SELECT * FROM notification_outbox WHERE id=$1 AND lease_token=$2 AND status='leased' FOR UPDATE",[job.id,job.lease_token])).rows[0];
  if(!current)return null;
  if(current.target_chat!==s.chatId||current.bot_id!==s.botId){await c.query("UPDATE notification_outbox SET status='failed',error_code='target_changed',lease_token=null,lease_until=null,updated_at=now() WHERE id=$1",[job.id]);return null;}
  let body:Record<string,unknown>;
  if(current.operation==='send'){
   const lead=(await c.query('SELECT id,name,company,contact,channel,services,sales_context,attribution,created_at FROM leads WHERE id=$1',[current.lead_id])).rows[0];
   if(!lead){await c.query("UPDATE notification_outbox SET status='cancelled',lease_token=null,lease_until=null,updated_at=now() WHERE id=$1",[job.id]);return null;}
   const consents=await c.query("SELECT DISTINCT ON (kind) kind,granted,version FROM consent_events WHERE lead_id=$1 AND kind IN ('data','callback') ORDER BY kind,id DESC",[lead.id]);
   if(consents.rowCount!==2||consents.rows.some(x=>!x.granted)){await c.query("UPDATE notification_outbox SET status='failed',error_code='consent_missing',lease_token=null,lease_until=null,updated_at=now() WHERE id=$1",[job.id]);return null;}
   body={chat_id:current.target_chat,...notificationMessage({...lead,consent_version:[...new Set(consents.rows.map(x=>x.version))].join(', ')},s.origin)};
  }else body={chat_id:current.target_chat,message_id:Number(current.message_id)};
  await c.query("UPDATE notification_outbox SET status='sending',attempts=attempts+1,updated_at=now() WHERE id=$1",[job.id]);
  await c.query('INSERT INTO notification_attempts(notification_id,lease_token,operation) VALUES($1,$2,$3)',[job.id,job.lease_token,current.operation]);
  return body;
 });
 if(!payload)return {status:'skipped'};
 let result:DeliveryResult;
 try{result=classifyTelegram(await call(job.operation==='send'?'sendMessage':'deleteMessage',payload),job.operation,job.attempts+1,s.chatId);}
 catch{result={status:'uncertain',code:'transport_unknown'};}
 await tx(pool,async c=>{
  // A late definitive response may resolve an expired lease, but never another attempt.
  await c.query("UPDATE notification_outbox SET status=$3,error_code=$4,message_id=coalesce($5,message_id),sent_at=CASE WHEN $3='sent' THEN now() ELSE sent_at END,next_attempt_at=now()+make_interval(secs=>$6),lease_until=null,updated_at=now() WHERE id=$1 AND lease_token=$2 AND status IN ('sending','uncertain')",[job.id,job.lease_token,result.status,result.code,result.messageId||null,result.delay||0]);
  await c.query('UPDATE notification_attempts SET outcome=$2,error_code=$3,finished_at=now() WHERE lease_token=$1',[job.lease_token,result.status,result.code]);
 });
 return {id:job.id,status:result.status};
}
export async function retryNotification(pool:pg.Pool,id:string,actor:string){return tx(pool,async c=>{
 const job=(await c.query('SELECT * FROM notification_outbox WHERE id=$1 FOR UPDATE',[id])).rows[0];
 if(!job||job.status!=='failed'||job.operation==='send'&&!job.lead_id)return false;
 await c.query("UPDATE notification_outbox SET status='pending',error_code=null,next_attempt_at=now(),lease_token=null,lease_until=null,updated_at=now() WHERE id=$1",[id]);
 await c.query('INSERT INTO admin_audit(actor,action,target) VALUES($1,$2,$3)',[actor,'notification_retry',id]);return true;
});}
export async function notificationOverview(pool:pg.Pool){
 const [counts,items,worker]=await Promise.all([
  pool.query("SELECT status,count(*)::int AS count,coalesce(max(extract(epoch FROM now()-created_at)),0)::int AS oldest_seconds FROM notification_outbox GROUP BY status"),
  pool.query("SELECT id,lead_id,operation,status,attempts,error_code,created_at,updated_at,next_attempt_at FROM notification_outbox ORDER BY CASE WHEN status IN ('failed','uncertain') THEN 0 ELSE 1 END,created_at DESC LIMIT 100"),
  pool.query('SELECT heartbeat_at,error_code FROM notification_worker WHERE id=true')]);
 return {counts:counts.rows,items:items.rows,worker:worker.rows[0]||null};
}
