import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const redact=(s:string)=>s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email скрыт]').replace(/(?:\+?\d[\d\s()\-]{8,}\d)/g,'[номер скрыт]');
export const safeCell=(s:unknown)=>typeof s==='string'&&/^[\s]*[=+@\-\t\r]/.test(s)?`'${s}`:s;
export const services=['audit','demo','meeting'] as const;
export const stages=['new','qualified','scheduled','audit','proposal','won','lost'] as const;
export const stageNames:Record<string,string>={new:'Новая',qualified:'Квалифицирована',scheduled:'Встреча',audit:'Аудит',proposal:'Предложение',won:'Клиент',lost:'Закрыта'};
export function telegramVerify(raw:string,token:string,now=Math.floor(Date.now()/1000)){
 const p=new URLSearchParams(raw),hash=p.get('hash');if(!hash||!/^[a-f0-9]{64}$/.test(hash))return false;
 const date=Number(p.get('auth_date'));if(!date||now-date>300||date>now+30)return false;
 const pairs=[...p.entries()];if(new Set(pairs.map(([k])=>k)).size!==pairs.length)return false;
 const data=pairs.filter(([k])=>k!=='hash').sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
 const secret=createHmac('sha256','WebAppData').update(token).digest();
 return timingSafeEqual(createHmac('sha256',secret).update(data).digest(),Buffer.from(hash,'hex'));
}
export const policyVersion=process.env.LEGAL_POLICY_VERSION||'2026-09-15-draft-1';
export function legalDocs(){const notificationNotice=process.env.TELEGRAM_NOTIFICATIONS_ENABLED==='true'&&process.env.TELEGRAM_NOTIFICATIONS_APPROVED==='true'?'\n'+(process.env.TELEGRAM_NOTIFICATION_NOTICE||''):'';const details=process.env.OPERATOR_REQUISITES||'Реквизиты оператора требуют заполнения до публичного сбора данных';const email=process.env.PRIVACY_EMAIL||'Контакт по вопросам персональных данных требует заполнения';return {
 privacy:`Политика обработки персональных данных\nОператор: ООО «ВоркСинк Системс» (SGS IT). ${details}. ${email}.\nЦели: обработка запрошенной услуги, подготовка аудита и связь по заявке. Данные: имя, компания, контакт, выбранные услуги, содержание брифа, история диалога и подтверждения согласий. Первичное хранение — в отдельной PostgreSQL на инфраструктуре в РФ после проверки фактического размещения.\nПредлагаемые сроки: диалоги без заявки — ${process.env.CHAT_RETENTION_DAYS||30} дней; заявки — ${process.env.LEAD_RETENTION_DAYS||180} дней после обновления. После срока данные удаляются либо для продолжения обработки фиксируется отдельное законное основание. Отзыв и запрос удаления направляются оператору по указанному контакту.\nAI получает только подготовленный текст без контактных полей; автоматическое скрытие телефона и email не гарантирует удаления всех персональных данных. До завершения проверки трансграничной схемы внешний AI отключён. В рабочей схеме отдельно фиксируются получатель, страна, основания передачи и условия хранения.\nЭто проект документа; публикация сбора данных разрешается только после заполнения реквизитов и юридической проверки.${notificationNotice}`,
 data:'Согласие на обработку персональных данных\nЯ даю ООО «ВоркСинк Системс» согласие на сбор, запись, систематизацию, хранение, уточнение и использование указанных мною имени, компании, контакта, брифа и выбранных услуг для обработки моей заявки, подготовки запрошенного аудита и организации демонстрации или встречи. Срок и порядок отзыва описаны в политике. Согласие не включает рекламные рассылки.'+notificationNotice,
 callback:'Запрос обратной связи\nПрошу представителя ООО «ВоркСинк Системс» связаться со мной по выбранному каналу и указанному контакту по моей заявке. При выборе телефона прошу осуществить обратный звонок. Это запрос связи по конкретной услуге.',
 marketing:'Согласие на рекламные сообщения\nОтдельно соглашаюсь получать рекламные сообщения ООО «ВоркСинк Системс» по указанному контакту. Согласие добровольно, не влияет на получение аудита и может быть отозвано через контакт оператора. В MVP рекламные рассылки не отправляются.',
 cookies:'Файлы cookie и локальное хранилище\nДля работы используются необходимые сессионные cookie: sgs_session (до 30 дней), sgs_admin (до 8 часов). Они имеют HttpOnly и SameSite; в HTTPS — Secure. Выбор темы, прохождение вступления и выбор cookie сохраняются локально. Аналитические и рекламные cookie в MVP не используются. Отказ от необязательных cookie не мешает чату и заявке.'
};}
export {demoAnswer} from '../shared/demo.js';
