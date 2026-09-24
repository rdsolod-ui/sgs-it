import {randomUUID,randomBytes} from 'node:crypto';
import {hash} from 'argon2';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {db} from '../server/db.js';
import {emptyAudit,auditFields} from '../shared/audit.js';
const base='http://127.0.0.1:8787/api';const origin='http://127.0.0.1:5178';const report:string[]=[];
let cookie='',adminCookie='';const adminId=randomUUID(),password=randomBytes(24).toString('base64url');
async function req(path:string,body?:unknown,auth=cookie,method=body?'POST':'GET'){return fetch(base+path,{method,headers:{Origin:origin,'X-SGS-Request':'1',...(body?{'Content-Type':'application/json'}:{}),Cookie:auth},body:body?JSON.stringify(body):undefined});}
async function check(name:string,fn:()=>Promise<void>){await fn();report.push(name);console.log('PASS',name);}
let visitorId:string|undefined,leadId:string|undefined;
try{
 await db.query('INSERT INTO admins(id,login,password_hash) VALUES($1,$2,$3)',[adminId,'qa-'+adminId,await hash(password)]);
 await check('CSRF rejects a cross-origin write',async()=>{const r=await fetch(base+'/session',{method:'POST',headers:{Origin:'https://attacker.example','X-SGS-Request':'1','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);});
 await check('Admin requires authentication',async()=>assert.equal((await req('/admin/overview')).status,401));
 await check('Session cookie is HttpOnly and SameSite',async()=>{const r=await req('/session',{});assert.equal(r.status,200);const c=r.headers.get('set-cookie')!;assert.match(c,/HttpOnly/i);assert.match(c,/SameSite=Lax/i);cookie=c.split(';')[0];});
 await check('Demo conversation and safe visual action',async()=>{const r=await req('/chat',{message:'Покажи продажи и CRM'});assert.equal(r.status,200);const x=await r.json();assert.equal(x.mode,'demo');assert.equal(x.demo,'sales');});
 const version=(await(await req('/config')).json()).policyVersion;const key=randomUUID();const body={requestKey:key,name:'Тестовый заказчик',company:'=FORMULA()',contact:'test@example.com',channel:'email',services:['audit','demo'],brief:'Синтетический тест аналитики продаж',dataConsent:true,callbackConsent:true,marketingConsent:false,policyVersion:version};
 await check('No data consent means no lead',async()=>{const r=await req('/leads',{...body,dataConsent:false});assert.equal(r.status,400);assert.equal((await db.query('SELECT id FROM leads WHERE request_key=$1',[key])).rowCount,0);});
 await check('Old consent document version is rejected',async()=>assert.equal((await req('/leads',{...body,policyVersion:'old'})).status,400));
 await check('Lead and three separate consent events commit',async()=>{const r=await req('/leads',body);assert.equal(r.status,200);leadId=(await r.json()).id;const l=(await db.query('SELECT * FROM leads WHERE id=$1',[leadId])).rows[0];visitorId=l.visitor_id;assert.equal(l.services.length,2);const c=(await db.query('SELECT * FROM consent_events WHERE lead_id=$1',[leadId])).rows;assert.equal(c.length,3);assert.equal(c.find(x=>x.kind==='marketing').granted,false);assert.ok(c.every(x=>x.document_hash.length===64&&x.document_text.length>30));});
 await check('Default API creates neither source tracking nor notification jobs',async()=>{assert.equal((await db.query('SELECT * FROM notification_outbox WHERE lead_id=$1',[leadId])).rowCount,0);assert.equal((await db.query('SELECT attribution FROM leads WHERE id=$1',[leadId])).rows[0].attribution,null);assert.equal((await db.query('SELECT * FROM visitor_sources WHERE visitor_id=$1',[visitorId])).rowCount,0);});
 await check('Retry is idempotent',async()=>{assert.equal((await(await req('/leads',body)).json()).id,leadId);assert.equal((await db.query('SELECT id FROM leads WHERE request_key=$1',[key])).rowCount,1);});
 await check('Token limit rejects input below HTTP body size cap',async()=>assert.equal((await req('/chat',{message:'a '.repeat(800)})).status,413));
 await check('Oversize input rejected before model call',async()=>assert.equal((await req('/chat',{message:'данные '.repeat(450)})).status,400));
 await check('Admin login creates authenticated session',async()=>{const r=await req('/admin/login',{login:'qa-'+adminId,password});assert.equal(r.status,200);adminCookie=r.headers.get('set-cookie')!.split(';')[0];assert.equal((await req('/admin/overview',undefined,adminCookie)).status,200);});
 await check('CRM detail contains lead, conversation and consent proof',async()=>{const d=await(await req('/admin/leads/'+leadId,undefined,adminCookie)).json();assert.equal(d.lead.id,leadId);assert.equal(d.consents.length,3);assert.equal(d.messages.length,2);});
 await check('Stage, next action and history update together',async()=>{assert.equal((await req('/admin/leads/'+leadId,{stage:'qualified',nextAction:'Уточнить источники данных',dueAt:null,note:'Синтетическая проверка'},adminCookie,'PATCH')).status,200);const d=await(await req('/admin/leads/'+leadId,undefined,adminCookie)).json();assert.equal(d.lead.stage,'qualified');assert.equal(d.activities.length,2);});
 await check('CSV neutralizes spreadsheet formulas',async()=>{const r=await req('/admin/export/csv',undefined,adminCookie);assert.equal(r.status,200);assert.match(await r.text(),/'=FORMULA\(\)/);assert.equal(r.headers.get('cache-control'),'no-store');});
 await check('XLSX is a readable workbook',async()=>{const r=await req('/admin/export/xlsx',undefined,adminCookie);const w=new ExcelJS.Workbook();await w.xlsx.load(Buffer.from(await r.arrayBuffer()) as any);assert.ok(w.worksheets[0].rowCount>=2);assert.equal(w.worksheets[0].getCell('C2').value,"'=FORMULA()");});
 await check('Audit template labels unverified conclusions',async()=>{const r=await req('/admin/leads/'+leadId+'/audit',undefined,adminCookie);const t=await r.text();assert.match(t,/Исследование ещё не проведено/);assert.match(t,/Маркетинговая аналитика/);});
 const auditPath='/admin/leads/'+leadId+'/audit-data';
 await check('Audit read/write requires admin authentication',async()=>{assert.equal((await req(auditPath)).status,401);assert.equal((await req(auditPath,{version:0,document:emptyAudit()},cookie,'PATCH')).status,401);});
 await check('Empty audit cannot be marked ready',async()=>{assert.equal((await req(auditPath,{version:0,document:{...emptyAudit(),status:'ready'}},adminCookie,'PATCH')).status,400);});
 const audit=emptyAudit();audit.scope='Тестовый объём';audit.summary='<script>alert(1)</script>';
 await check('Audit saves atomically and records an activity',async()=>{const r=await req(auditPath,{version:0,document:audit},adminCookie,'PATCH');assert.equal(r.status,200);assert.equal((await r.json()).version,1);const d=await(await req(auditPath,undefined,adminCookie)).json();assert.equal(d.document.scope,audit.scope);assert.equal(d.version,1);assert.equal((await db.query("SELECT count(*)::int n FROM activities WHERE lead_id=$1 AND kind='audit_saved'",[leadId])).rows[0].n,1);});
 await check('Stale audit update cannot overwrite a saved version',async()=>{assert.equal((await req(auditPath,{version:0,document:{...audit,scope:'Should not overwrite'}},adminCookie,'PATCH')).status,409);assert.equal((await(await req(auditPath,undefined,adminCookie)).json()).document.scope,audit.scope);});
 await check('Export escapes saved audit and has no-store policy',async()=>{const r=await req('/admin/leads/'+leadId+'/audit',undefined,adminCookie);const html=await r.text();assert.equal(r.headers.get('cache-control'),'no-store');assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Черновик/);});
 audit.status='ready';audit.sections.forEach((s,i)=>{if(i===0){for(const key of Object.keys(auditFields))s[key as keyof typeof auditFields]='Проверено по тестовому источнику';}else{s.included=false;s.exclusion='Вне согласованного объёма';}});
 await check('Completed audit and explicit exclusions export as ready',async()=>{assert.equal((await req(auditPath,{version:1,document:audit},adminCookie,'PATCH')).status,200);const html=await(await req('/admin/leads/'+leadId+'/audit',undefined,adminCookie)).text();assert.match(html,/Документ подготовлен специалистом/);assert.match(html,/Вне согласованного объёма/);});
 await check('Telegram route disabled without bot credentials',async()=>assert.equal((await req('/telegram',{initData:'invalid'})).status,503));
 await check('Conversation journal includes anonymous sessions',async()=>{const r=await req('/admin/conversations',undefined,adminCookie);assert.equal(r.status,200);assert.ok((await r.json()).conversations.some((x:any)=>x.id===visitorId));});
 await check('Message export includes response history',async()=>{const r=await req('/admin/export/csv?scope=messages',undefined,adminCookie);assert.equal(r.status,200);assert.match(await r.text(),/visitor_id/);});
 await check('Parallel request reservation blocks a second response',async()=>{const pending=randomUUID();await db.query("INSERT INTO ai_usage(id,visitor_id,status) VALUES($1,$2,'pending')",[pending,visitorId]);try{assert.equal((await req('/chat',{message:'Продажи'})).status,409);}finally{await db.query('DELETE FROM ai_usage WHERE id=$1',[pending]);}});
 await check('Per-minute request limit is enforced',async()=>{const ids=Array.from({length:19},()=>randomUUID());for(const x of ids)await db.query("INSERT INTO ai_usage(id,visitor_id,status) VALUES($1,$2,'complete')",[x,visitorId]);try{assert.equal((await req('/chat',{message:'Продажи'})).status,429);}finally{await db.query('DELETE FROM ai_usage WHERE id=ANY($1::uuid[])',[ids]);}});
 await check('Logout invalidates the server session',async()=>{await req('/admin/logout',{},adminCookie);assert.equal((await req('/admin/overview',undefined,adminCookie)).status,401);});
 console.log(JSON.stringify({passed:report.length,tests:report}));
}finally{
 if(leadId)await db.query('DELETE FROM leads WHERE id=$1',[leadId]);if(visitorId){await db.query('DELETE FROM ai_usage WHERE visitor_id=$1',[visitorId]);await db.query('DELETE FROM visitors WHERE id=$1',[visitorId]);}
 await db.query('DELETE FROM admins WHERE id=$1',[adminId]);await db.query('DELETE FROM admin_audit WHERE actor=$1',['qa-'+adminId]);await db.end();
}
