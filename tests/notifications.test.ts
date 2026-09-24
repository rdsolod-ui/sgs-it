import {describe,it,expect} from 'vitest';
import {captureTouch,sanitizeTouch,formatAttribution} from '../shared/attribution';
import {classifyTelegram,notificationSettings,notificationMessage,verifyNotificationChannel,type NotificationSettings} from '../server/telegram-notifications';
const settings:NotificationSettings={enabled:true,token:'123:test',chatId:'-1001234567',botId:'123',origin:'https://example.invalid'};
describe('Source minimisation',()=>{
 it('keeps only allowed campaign slugs, route and referrer hostname',()=>{
  expect(captureTouch('https://example.com/?utm_source=search&utm_campaign=autumn&utm_medium=cpc&token=hidden#secret','https://search.example/path?email=test@example.com')).toEqual({landing:'/',referrerHost:'search.example',utm:{utm_source:'search',utm_campaign:'autumn',utm_medium:'cpc'}});
 });
 it.each(['test@example.com','+79991234567','79991234567','name surname','%40test','token-secret','a'.repeat(65),'0123456789abcdef0123456789abcdef'])('drops suspicious or unbounded tag %s',value=>expect(sanitizeTouch({utm:{utm_source:value}}).utm).toEqual({}));
 it('does not trust arbitrary paths, client clocks, userinfo or Mini App flags',()=>{
  const v=captureTouch('https://example.com/private/test@example.com?utm_source=search','https://user:pass@ref.example/');expect(v.landing).toBeNull();expect(v.referrerHost).toBeNull();expect(sanitizeTouch({channel:'telegram_verified',at:'2000-01-01',utm:{unknown:'x'}})).not.toHaveProperty('channel');expect(formatAttribution(null)).toBe('Источник не определён');
 });
});
describe('Telegram notification contract',()=>{
 it('is disabled by default and does not enable from a Mini App bot alone',()=>{expect(notificationSettings({}).enabled).toBe(false);expect(notificationSettings({TELEGRAM_BOT_TOKEN:'123:x'}).enabled).toBe(false);});
 it('requires explicit disclosure, origin, target and bot identity',()=>{
  const valid={TELEGRAM_NOTIFICATIONS_ENABLED:'true',TELEGRAM_NOTIFICATIONS_APPROVED:'true',LEGAL_READY:'true',OPERATOR_REQUISITES:'test',PRIVACY_EMAIL:'test@example.com',TELEGRAM_NOTIFICATION_BOT_TOKEN:'123:test',TELEGRAM_NOTIFICATION_CHAT_ID:settings.chatId,TELEGRAM_NOTIFICATION_BOT_ID:'123',APP_ORIGIN:settings.origin,LEGAL_POLICY_VERSION:'test-1',TELEGRAM_NOTIFICATION_NOTICE:'Synthetic notification disclosure only'};
  expect(notificationSettings(valid).enabled).toBe(true);for(const key of ['TELEGRAM_NOTIFICATION_NOTICE','LEGAL_POLICY_VERSION','TELEGRAM_NOTIFICATION_BOT_TOKEN','TELEGRAM_NOTIFICATION_CHAT_ID','TELEGRAM_NOTIFICATION_BOT_ID','APP_ORIGIN'])expect(()=>notificationSettings({...valid,[key]:''})).toThrow('notification_configuration_invalid');
  expect(()=>notificationSettings({...valid,APP_ORIGIN:'http://example.com'})).toThrow();
 });
 it('checks bot identity, private channel type and posting rights without sending',async()=>{
  const calls:string[]=[];await verifyNotificationChannel(settings,async method=>{calls.push(method);return method==='getMe'?{ok:true,result:{id:123}}:method==='getChat'?{ok:true,result:{id:Number(settings.chatId),type:'channel'}}:{ok:true,result:{status:'administrator',can_post_messages:true}};});expect(calls).toEqual(['getMe','getChat','getChatMember']);
  await expect(verifyNotificationChannel(settings,async method=>method==='getMe'?{ok:true,result:{id:123}}:{ok:true,result:{id:Number(settings.chatId),type:'channel',username:'public'}})).rejects.toThrow();
 });
 it('accepts only a definitive message ID in the configured chat',()=>{
  expect(classifyTelegram({ok:true,result:{message_id:10,chat:{id:Number(settings.chatId)}}},'send',1,settings.chatId)).toMatchObject({status:'sent',messageId:10});
  expect(classifyTelegram({ok:true,result:{message_id:10,chat:{id:55}}},'send',1,settings.chatId).status).toBe('uncertain');expect(classifyTelegram({ok:true},'send',1,settings.chatId).status).toBe('uncertain');
 });
 it('honours retry_after, bounds retries and keeps permanent errors terminal',()=>{
  expect(classifyTelegram({ok:false,error_code:429,parameters:{retry_after:500}},'send',1,settings.chatId)).toMatchObject({status:'retry',delay:500});
  expect(classifyTelegram({ok:false,error_code:500},'send',5,settings.chatId).status).toBe('failed');expect(classifyTelegram({ok:false,error_code:403,description:'secret token'},'send',1,settings.chatId)).toEqual({status:'failed',code:'telegram_403'});
  expect(classifyTelegram('<html>503</html>','send',1,settings.chatId).status).toBe('uncertain');
 });
 it('escapes HTML, excludes transcript/brief and creates an authenticated CRM link',()=>{
  const message=notificationMessage({id:'123',name:'<script>&',company:'X',contact:'test@example.com',channel:'email',services:['audit'],sales_context:null,attribution:null},settings.origin);
  expect(message.text).toContain('&lt;script&gt;&amp;');expect(message.text).not.toContain('<script>');expect(message.text.length).toBeLessThan(4096);expect(message.reply_markup.inline_keyboard[0][0].url).toBe('https://example.invalid/admin?lead=123');
 });
 it('does not claim deletion unless the API confirms it',()=>{expect(classifyTelegram({ok:true,result:true},'delete',1,settings.chatId).status).toBe('deleted');expect(classifyTelegram({ok:false,error_code:400},'delete',1,settings.chatId).status).toBe('failed');});
});
