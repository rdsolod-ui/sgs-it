import {z} from 'zod';
import {salesStateSchema,salesSummary} from '../shared/sales.js';
import {formatAttribution,type Attribution} from '../shared/attribution.js';
export type NotificationSettings={enabled:boolean,token:string,chatId:string,botId:string,origin:string};
export function notificationSettings(env:NodeJS.ProcessEnv):NotificationSettings{
 const approved=env.TELEGRAM_NOTIFICATIONS_ENABLED==='true'&&env.TELEGRAM_NOTIFICATIONS_APPROVED==='true'&&env.LEGAL_READY==='true'&&Boolean(env.OPERATOR_REQUISITES&&env.PRIVACY_EMAIL);
 const token=env.TELEGRAM_NOTIFICATION_BOT_TOKEN||'',chatId=env.TELEGRAM_NOTIFICATION_CHAT_ID||'',botId=env.TELEGRAM_NOTIFICATION_BOT_ID||'';
 let origin='';try{const u=new URL(env.APP_ORIGIN||'');if((u.protocol==='https:'||env.NODE_ENV==='test'&&u.protocol==='http:'&&u.hostname==='127.0.0.1')&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)origin=u.origin;}catch{}
 if(approved&&(!env.TELEGRAM_NOTIFICATION_NOTICE||env.TELEGRAM_NOTIFICATION_NOTICE.length<20||!env.LEGAL_POLICY_VERSION||env.LEGAL_POLICY_VERSION.includes('draft')||!/^\d+:[A-Za-z0-9_-]+$/.test(token)||!/^-[1-9]\d{5,19}$/.test(chatId)||!/^\d+$/.test(botId)||!origin))throw Error('notification_configuration_invalid');
 return {enabled:approved,token,chatId,botId,origin};
}
export type TelegramCall=(method:'sendMessage'|'deleteMessage'|'getChat'|'getMe'|'getChatMember',body:Record<string,unknown>)=>Promise<unknown>;
export function telegramTransport(token:string):TelegramCall{return async(method,body)=>{
 // Destination is fixed in code, never an URL supplied by a visitor or queue payload.
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),redirect:'error'});
 return response.json();
};}
export async function verifyNotificationChannel(s:NotificationSettings,call:TelegramCall){
 const me=z.object({ok:z.literal(true),result:z.object({id:z.number().int().safe()})}).parse(await call('getMe',{}));
 if(String(me.result.id)!==s.botId)throw Error('notification_bot_mismatch');
 const chat=z.object({ok:z.literal(true),result:z.object({id:z.number().int().safe(),type:z.literal('channel'),username:z.string().optional()})}).parse(await call('getChat',{chat_id:s.chatId}));
 if(String(chat.result.id)!==s.chatId||chat.result.username)throw Error('notification_private_channel_required');
 const member=z.object({ok:z.literal(true),result:z.object({status:z.literal('administrator'),can_post_messages:z.literal(true)})}).safeParse(await call('getChatMember',{chat_id:s.chatId,user_id:me.result.id}));
 if(!member.success)throw Error('notification_posting_permission_required');
}
const escape=(v:unknown,max:number)=>String(v??'').slice(0,max).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function notificationMessage(lead:{id:string,name:string,company:string,contact:string,channel:string,services:string[],sales_context:unknown,attribution:Attribution|null,created_at?:Date|string,consent_version?:string},origin:string){
 const profile=salesStateSchema.safeParse(lead.sales_context);
 // Never include the full transcript or arbitrary brief. Field summary is bounded.
 const serviceNames:Record<string,string>={audit:'Аудит',demo:'Демонстрация',meeting:'Встреча'};
 const text=[`<b>Новая заявка SGS IT</b> · ${escape(lead.id,36)}`,`Создана: ${escape(lead.created_at?new Date(lead.created_at).toISOString():'Не указано',30)}`,`Имя: ${escape(lead.name,100)}`,`Компания: ${escape(lead.company||'Не указана',160)}`,`Контакт (${escape(lead.channel,16)}): ${escape(lead.contact,160)}`,`Интерес: ${escape(lead.services.map(x=>serviceNames[x]||x).join(', '),80)}`,profile.success?`${profile.data.confirmed?'Резюме подтверждено':'Резюме не подтверждено'}:\n${escape(salesSummary(profile.data),1200)}`:'Профиль не заполнен',profile.success&&profile.data.selectedOffer==='presale'?'Выбрано обсуждение платного пресейла. Цена и условия не утверждены.':'',`Источник (метки посетителя): ${escape(formatAttribution(lead.attribution),400)}`,`Согласия сохранены. Версия: ${escape(lead.consent_version||'Не указана',80)}. Следующий шаг: открыть CRM и проверить запрос.`].join('\n');
 return {text,parse_mode:'HTML',link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'Открыть лид',url:`${origin}/admin?lead=${encodeURIComponent(lead.id)}`}]]}};
}
export type DeliveryResult={status:'sent'|'deleted'|'retry'|'failed'|'uncertain',code:string|null,messageId?:number,delay?:number};
export function classifyTelegram(value:unknown,operation:'send'|'delete',attempt:number,chatId:string):DeliveryResult{
 const v=z.object({ok:z.boolean(),result:z.unknown().optional(),error_code:z.number().int().optional(),parameters:z.object({retry_after:z.number().int().positive().max(86400).optional()}).optional()}).safeParse(value);
 if(!v.success)return {status:'uncertain',code:'invalid_response'};
 if(v.data.ok){
  if(operation==='delete'&&v.data.result===true)return {status:'deleted',code:null};
  const message=z.object({message_id:z.number().int().positive().safe(),chat:z.object({id:z.number().int().safe()})}).safeParse(v.data.result);
  if(operation==='send'&&message.success&&String(message.data.chat.id)===chatId)return {status:'sent',code:null,messageId:message.data.message_id};
  return {status:'uncertain',code:'unexpected_result'};
 }
 const code=v.data.error_code;
 if(code===429||code!==undefined&&code>=500){return attempt>=5?{status:'failed',code:'retry_exhausted'}:{status:'retry',code:`telegram_${code}`,delay:Math.max(v.data.parameters?.retry_after||0,Math.min(3600,30*2**Math.min(attempt,7)))};}
 if(code!==undefined&&code>=400&&code<500)return {status:'failed',code:`telegram_${code}`};
 return {status:'uncertain',code:'unknown_response'};
}
