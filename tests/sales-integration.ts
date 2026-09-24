import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {hash} from 'argon2';
import {db} from '../server/db.js';
import {digest} from '../server/domain.js';
const base='http://127.0.0.1:8787/api';
const headers={Origin:'http://127.0.0.1:5178','X-SGS-Request':'1','Content-Type':'application/json'};
const visitors:string[]=[],leads:string[]=[];let cookie='',other='',adminCookie='';const adminId=randomUUID(),login='sales-'+adminId,password=randomBytes(24).toString('base64url');let passed=0;
async function req(path:string,body?:unknown,auth=cookie){return fetch(base+path,{method:body?'POST':'GET',headers:{...headers,Cookie:auth},body:body?JSON.stringify(body):undefined});}
async function check(name:string,run:()=>Promise<void>){await run();passed++;console.log('PASS',name);}
async function session(){const r=await req('/session',{},'');assert.equal(r.status,200);const c=r.headers.get('set-cookie')!.split(';')[0];visitors.push((await db.query('SELECT id FROM visitors WHERE token_hash=$1',[digest(c.split('=')[1])])).rows[0].id);return c;}
try{
 cookie=await session();other=await session();
 let state:any;
 await check('Stores explicit profile and confirmation across session reload',async()=>{
  for(const body of [{message:'Привет'},...['Руководитель','Услуги','CRM и таблицы','Нет связи с оплатами','Видеть путь до оплаты'].map(message=>({message})),{action:'confirm'}]){
   const r=await req('/chat',{...body,revision:state?.revision||0});assert.equal(r.status,200,await r.clone().text());state=(await r.json()).sales;
  }
  assert.equal(state.confirmed,true);assert.equal(state.stage,'offer');const reload=await(await req('/session',{})).json();assert.deepEqual(reload.sales,state);assert.equal(reload.messages.length,14);
 });
 await check('Stale revision cannot append messages or overwrite the profile',async()=>{
  const before=(await db.query('SELECT count(*)::int n FROM messages WHERE visitor_id=$1',[visitors[0]])).rows[0].n;
  assert.equal((await req('/chat',{action:'restart',revision:0})).status,409);
  assert.equal((await db.query('SELECT count(*)::int n FROM messages WHERE visitor_id=$1',[visitors[0]])).rows[0].n,before);
  assert.equal((await(await req('/session',{})).json()).sales.confirmed,true);
 });
 await check('Parallel updates to the same revision commit only once',async()=>{
  const responses=await Promise.all([req('/chat',{action:'demo',revision:state.revision}),req('/chat',{action:'demo',revision:state.revision})]);
  assert.deepEqual(responses.map(x=>x.status).sort(),[200,409]);state=(await responses.find(x=>x.status===200)!.json()).sales;
 });
 await check('A different visitor cannot read or mutate the existing profile',async()=>{
  const fresh=await(await req('/session',{},other)).json();assert.deepEqual(fresh.sales.profile,{});assert.equal(fresh.sales.revision,0);assert.equal(fresh.messages.length,0);
  assert.equal((await req('/chat',{action:'contact',revision:state.revision},other)).status,409);
 });
 await check('Rejects unrecognised actions at the API boundary',async()=>assert.equal((await req('/chat',{action:'send_telegram'})).status,400));
 const policyVersion=(await(await req('/config')).json()).policyVersion;
 const body={requestKey:randomUUID(),name:'Синтетический посетитель',company:'Тест',contact:'sales@example.com',channel:'email',services:['audit'],brief:'Проверка',dataConsent:true,callbackConsent:true,marketingConsent:false,policyVersion,sales_context:{confirmed:false,profile:{role:{value:'forged'}}}};
 await check('A stale form cannot silently submit a newer profile',async()=>{
  const r=await req('/leads',{...body,salesRevision:state.revision-1});assert.equal(r.status,409);
  assert.equal((await db.query('SELECT id FROM leads WHERE request_key=$1',[body.requestKey])).rowCount,0);
 });
 await check('Lead snapshot is server-owned and idempotent with consent records',async()=>{
  const response=await req('/leads',body);assert.equal(response.status,200);const id=(await response.json()).id;leads.push(id);
  const row=(await db.query('SELECT sales_context FROM leads WHERE id=$1',[id])).rows[0];assert.deepEqual(row.sales_context,state);
  assert.equal((await(await req('/leads',body)).json()).id,id);assert.equal((await db.query('SELECT count(*)::int n FROM consent_events WHERE lead_id=$1',[id])).rows[0].n,3);
  assert.equal((await req('/leads',body,other)).status,409);
 });
 await check('CRM profile requires authentication and matches the submitted snapshot',async()=>{
  assert.equal((await req('/admin/leads/'+leads[0])).status,401);
  await db.query('INSERT INTO admins(id,login,password_hash) VALUES($1,$2,$3)',[adminId,login,await hash(password)]);
  const r=await req('/admin/login',{login,password});assert.equal(r.status,200);adminCookie=r.headers.get('set-cookie')!.split(';')[0];
  const detail=await(await req('/admin/leads/'+leads[0],undefined,adminCookie)).json();assert.deepEqual(detail.lead.sales_context,state);
 });
 await check('Restart clears current profile but does not rewrite a saved lead',async()=>{
  const r=await req('/chat',{action:'restart',revision:state.revision});assert.equal(r.status,200);assert.deepEqual((await r.json()).sales.profile,{});
  assert.deepEqual((await db.query('SELECT sales_context FROM leads WHERE id=$1',[leads[0]])).rows[0].sales_context,state);
 });
 await check('Visitor deletion cascades profile and preserves the lead snapshot',async()=>{
  await db.query('DELETE FROM visitors WHERE id=$1',[visitors[0]]);assert.equal((await db.query('SELECT * FROM sales_dialogues WHERE visitor_id=$1',[visitors[0]])).rowCount,0);
  const row=(await db.query('SELECT visitor_id,sales_context FROM leads WHERE id=$1',[leads[0]])).rows[0];assert.equal(row.visitor_id,null);assert.deepEqual(row.sales_context,state);
 });
 console.log(JSON.stringify({passed}));
}finally{
 for(const id of leads)await db.query('DELETE FROM leads WHERE id=$1',[id]);
 for(const id of visitors){await db.query('DELETE FROM ai_usage WHERE visitor_id=$1',[id]);await db.query('DELETE FROM visitors WHERE id=$1',[id]);}
 await db.query('DELETE FROM admins WHERE id=$1',[adminId]);await db.query('DELETE FROM admin_audit WHERE actor=$1',[login]);await db.end();
}
