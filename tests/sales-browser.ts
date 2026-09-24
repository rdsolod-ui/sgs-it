import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.addInitScript(()=>localStorage.setItem('sgs-cookies','essential-only'));
const page=await context.newPage(),errors:string[]=[],apiCalls:string[]=[],checks:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.includes('/api/'))apiCalls.push(r.url());});
async function action(name:string){await page.locator('.sales-actions').getByRole('button',{name,exact:true}).click();await page.getByRole('button',{name:'Отправить сообщение',exact:true}).waitFor();}
async function say(message:string){const count=await page.locator('.message.assistant').count();await page.getByRole('textbox',{name:'Сообщение Синку'}).fill(message);await page.getByRole('button',{name:'Отправить сообщение',exact:true}).click();await expect(page.locator('.message.assistant')).toHaveCount(count+1);}
try{
 await page.goto(process.env.SALES_URL||'http://127.0.0.1:5188/sgs-it/');await page.getByRole('button',{name:'Пропустить вступление',exact:true}).click();await page.waitForLoadState('networkidle');
 await say('Привет');await say('Руководитель продаж');await say('Услуги для бизнеса');await say('CRM и таблицы');await say('Нет связи с оплатами');await say('Видеть продажи по каналам');
 await expect(page.locator('.message.assistant').last()).toContainText('Проверьте');await page.locator('.sales-actions').scrollIntoViewIfNeeded();await mkdir('docs/research',{recursive:true});await page.screenshot({path:'docs/research/sales-summary-mobile.png'});checks.push('Profile to needs to summary on mobile');
 await action('Всё верно');await expect(page.locator('.sales-actions')).toContainText('Бесплатный аудит');checks.push('Explicit summary confirmation offers free audit');
 await action('Исправить резюме');await action('Изменить источники');await say('Только таблицы');await expect(page.locator('.message.assistant').last()).toContainText('Источники данных: Только таблицы');checks.push('Correction preserves other fields and requests new confirmation');
 await action('Всё верно');await action('Обсудить платный пресейл');await expect(page.getByRole('heading',{name:'Аудит начинается с данных.'})).toBeVisible();await expect(page.locator('.preview-brief > .preserve')).toContainText('Только таблицы');assert.equal(await page.locator('input[name="contact"]').count(),0);checks.push('Closed collection gate preserves summary and exposes no payment/contact fields');
 await expect(page.getByRole('textbox',{name:'Ваш ответ',exact:true})).toHaveValue('Услуги для бизнеса');await page.getByRole('button',{name:'Далее',exact:true}).click();await expect(page.getByRole('textbox',{name:'Ваш ответ',exact:true})).toHaveValue('Руководитель продаж');checks.push('Existing brief builder is prefilled from dialogue');
 await page.getByRole('button',{name:'Закрыть',exact:true}).click();await action('Завершить');await say('CRM');await expect(page.locator('.message.assistant').last()).toContainText('Диалог завершён');await action('Начать заново');await expect(page.locator('.message.assistant').last()).toContainText('Как вы участвуете');checks.push('Refusal and explicit restart');
 await action('Пропустить вопрос');await expect(page.locator('.message.assistant').last()).toContainText('Чем занимается');await action('Связаться со специалистом');await expect(page.getByRole('heading',{name:'Аудит начинается с данных.'})).toBeVisible();await page.getByRole('button',{name:'Закрыть',exact:true}).click();checks.push('Skip and immediate contact bypass qualification');
 for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 }checks.push('Both themes at 320/390/768/1440 without horizontal overflow');
 await page.setViewportSize({width:390,height:844});const axe=await new AxeBuilder({page}).include('.conversation').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations,[]);checks.push('Conversation axe WCAG A/AA');
 await mkdir('docs/research',{recursive:true});await page.screenshot({path:'docs/research/sales-mobile.png'});
 await page.reload();await page.getByRole('button',{name:'Пропустить вступление',exact:true}).click();await expect(page.locator('.message')).toHaveCount(0);checks.push('Preview profile and transcript clear on reload');
 assert.deepEqual(errors,[]);assert.deepEqual(apiCalls,[]);checks.push('No JS errors or API requests');
 await writeFile('docs/research/sales-browser.json',JSON.stringify({passed:checks.length,checks,errors,apiCalls},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
}finally{await context.close();await browser.close();}
