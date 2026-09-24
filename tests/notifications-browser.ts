import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {hash} from 'argon2';
import {mkdir,writeFile} from 'node:fs/promises';
import {db} from '../server/db.js';
const database=new URL(process.env.DATABASE_URL||'');if(!['127.0.0.1','localhost'].includes(database.hostname)||!/_(test|ci)$/.test(database.pathname))throw Error('Use a dedicated test/CI database');
const adminId=randomUUID(),leadId=randomUUID(),failed=randomUUID(),uncertain=randomUUID(),login='queue-ui-'+adminId,password=randomBytes(24).toString('base64url');
const origin=process.env.BROWSER_URL||'http://127.0.0.1:5178';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--enable-unsafe-swiftshader']});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();const errors:string[]=[],checks:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await db.query('INSERT INTO admins(id,login,password_hash) VALUES($1,$2,$3)',[adminId,login,await hash(password)]);
 const touch={landing:'/',referrerHost:'search.example',utm:{utm_source:'search',utm_campaign:'autumn'},at:new Date().toISOString()};
 await db.query("INSERT INTO leads(id,request_key,name,company,contact,channel,services,attribution) VALUES($1,$2,'Синтетическая заявка','QA','qa@example.com','email',ARRAY['audit'],$3)",[leadId,randomUUID(),JSON.stringify({first:touch,last:touch,channel:'website'})]);
 for(const [id,status] of [[failed,'failed'],[uncertain,'uncertain']])await db.query("INSERT INTO notification_outbox(id,lead_id,event,status,target_chat,bot_id,error_code) VALUES($1,$2,$3,$4,'-1001234567','123',$5)",[id,leadId,'test.'+status,status,status==='failed'?'telegram_403':'transport_unknown']);
 await page.goto(origin+'/admin?lead='+leadId);await expect(page.getByRole('heading',{name:'Вход в CRM'})).toBeVisible();assert.equal(await page.locator('.lead-detail').count(),0);checks.push('Deep link requires login');
 await page.getByLabel('Логин',{exact:true}).fill(login);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:'Войти',exact:true}).click();await expect(page.locator('.lead-detail')).toBeVisible();await expect(page.locator('.lead-detail')).toContainText('utm_source=search');checks.push('Login opens requested lead and its source snapshot');
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(new URL(page.url()).search,'');
 const panel=page.getByRole('region',{name:'Доставка Telegram'});await expect(panel).toContainText('Очередь включена');await panel.locator('summary').click();await expect(panel).toContainText('Исход неизвестен');checks.push('Queue and ambiguous outcome visible outside Telegram');
 const unknownRow=panel.locator('tr').filter({hasText:'transport_unknown'});assert.equal(await unknownRow.getByRole('button',{name:/Повторить/}).count(),0);checks.push('No blind resend control for uncertain delivery');
 const retry=panel.getByRole('button',{name:'Повторить после устранения ошибки'});await retry.click();await expect(panel.locator('tr').filter({hasText:'telegram_403'})).toHaveCount(0);assert.equal((await db.query('SELECT status FROM notification_outbox WHERE id=$1',[failed])).rows[0].status,'pending');checks.push('Explicit retry persists and refreshes CRM');
 for(const width of [360,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}const result=await new AxeBuilder({page}).include('.notification-panel').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations,[]);checks.push('Responsive queue panel and axe accessibility');
 await mkdir('docs/research',{recursive:true});await page.screenshot({path:'docs/research/notification-queue.png',fullPage:true});
 await page.getByRole('button',{name:'Выйти',exact:true}).click();await page.goto(origin+'/admin?lead='+leadId);await expect(page.getByRole('heading',{name:'Вход в CRM'})).toBeVisible();checks.push('Logout protects lead deep link');assert.deepEqual(errors,[]);checks.push('No browser errors');await writeFile('docs/research/notifications-browser.json',JSON.stringify({passed:checks.length,checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await context.close();await browser.close();await db.query('DELETE FROM notification_outbox WHERE id=ANY($1::uuid[])',[[failed,uncertain]]);await db.query('DELETE FROM leads WHERE id=$1',[leadId]);await db.query('DELETE FROM admins WHERE id=$1',[adminId]);await db.query('DELETE FROM admin_audit WHERE actor=$1',[login]);await db.end();}
