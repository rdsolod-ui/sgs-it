import {z} from 'zod';
import {emptyBrief,type BriefAnswers} from './brief.js';
import {offers,offerVersion,type OfferId} from './offers.js';
export const scenarioVersion = 'sales-demo-2026-09-22.1';
export const fields = ['role','business','systems','problem','result'] as const;
export type ProfileKey = typeof fields[number];
export const fieldLabels:Record<ProfileKey,string> = {role:'Роль',business:'Бизнес',systems:'Источники данных',problem:'Задача',result:'Желаемый результат'};
const questions:Record<ProfileKey,string> = {role:'Как вы участвуете в этой задаче: руководите бизнесом, направлением или изучаете решение для команды?',business:'Чем занимается ваш бизнес?',systems:'Где сейчас находятся данные: CRM, учётная система, таблицы?',problem:'Что сейчас мешает принимать решения? Достаточно одного примера.',result:'Какой результат будет для вас полезен?'};
const factSchema = z.object({value:z.string().max(300),source:z.literal('user'),revision:z.number().int().nonnegative()});
export const salesStateSchema = z.object({
 version:z.literal(scenarioVersion), offerVersion:z.literal(offerVersion), revision:z.number().int().nonnegative(),
 stage:z.enum(['greeting','profile','needs','summary','offer','handoff','closed']),
 profile:z.object({role:factSchema.optional(),business:factSchema.optional(),systems:factSchema.optional(),problem:factSchema.optional(),result:factSchema.optional()}),
 skipped:z.array(z.enum(fields)).max(5), awaiting:z.enum(fields).nullable(),
 confirmed:z.boolean(), selectedOffer:z.enum(['audit','demo','meeting','presale']).nullable(),
 reason:z.string().max(100), objections:z.array(z.string().max(60)).max(8),
});
export type SalesState = z.infer<typeof salesStateSchema>;
export const actions = ['continue','skip','confirm','edit','contact','demo','finish','restart','offer:audit','offer:demo','offer:meeting','offer:presale','edit:role','edit:business','edit:systems','edit:problem','edit:result'] as const;
export const salesInputSchema = z.object({message:z.string().trim().min(1).max(3000).optional(),action:z.enum(actions).optional(),revision:z.number().int().nonnegative().optional()}).refine(x=>Boolean(x.message)!==Boolean(x.action),'Provide either message or action');
export type SalesInput = z.infer<typeof salesInputSchema>;
export type SalesAction = typeof actions[number];
export type SalesChoice = {id:SalesAction,label:string};
export const actionLabels:Record<SalesAction,string> = {
 continue:'Продолжить',skip:'Пропустить вопрос',confirm:'Всё верно',edit:'Исправить резюме',contact:'Связаться со специалистом',demo:'Показать демо',finish:'Завершить',restart:'Начать заново',
 'offer:audit':'Бесплатный аудит','offer:demo':'Демонстрация parkops','offer:meeting':'Диагностическая встреча','offer:presale':'Обсудить платный пресейл',
 'edit:role':'Изменить роль','edit:business':'Изменить бизнес','edit:systems':'Изменить источники','edit:problem':'Изменить задачу','edit:result':'Изменить результат',
};
export function initialSalesState():SalesState{return {version:scenarioVersion,offerVersion,revision:0,stage:'greeting',profile:{},skipped:[],awaiting:null,confirmed:false,selectedOffer:null,reason:'start',objections:[]};}
// Minimisation only, not a claim of anonymisation. No text leaves this module for AI.
export function cleanSalesText(text:string){return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email скрыт]').replace(/(?:\+?\d[\d\s()\-]{8,}\d)/g,'[номер скрыт]').replace(/@[a-zA-Z0-9_]{5,32}/g,'[контакт скрыт]').replace(/https?:\/\/\S+/gi,'[ссылка скрыта]');}
export function salesSummary(state:SalesState){return fields.map(k=>`${fieldLabels[k]}: ${state.profile[k]?.value||'Требует уточнения'}`).join('\n');}
export function salesBrief(state:SalesState):BriefAnswers{return {...emptyBrief(),...Object.fromEntries(fields.map(k=>[k,state.profile[k]?.value||'']))};}
export function salesChoices(s:SalesState):SalesChoice[]{
 const ids:SalesAction[]=s.stage==='closed'?['restart','contact','demo']:s.reason==='choose_field'?[...fields.map(k=>`edit:${k}` as SalesAction),'contact','finish']:s.stage==='summary'?['confirm','edit','contact','demo','finish']:s.stage==='offer'?['offer:audit','offer:demo','offer:meeting','offer:presale','edit','finish']:s.stage==='handoff'?['contact','continue','finish']:s.awaiting?['skip','contact','demo','finish']:['continue','contact','demo','finish'];
 return ids.map(id=>({id,label:actionLabels[id]}));
}
export const objections = [
 {id:'price',pattern:/дорого|нет бюджета/i,text:'Стоимость имеет смысл обсуждать после определения объёма. Можно начать с бесплатного аудита и согласовать его границы.'},
 {id:'crm',pattern:/(уже есть|у нас есть|есть своя)\s*crm|crm уже есть/i,text:'Действующую CRM можно сохранить. Сначала проверим, какие вопросы она уже закрывает и каких связей с другими данными не хватает.'},
 {id:'time',pattern:/нет времени/i,text:'Можно пропустить вопросы и сразу перейти к специалисту. Сроки и объём работ согласуются отдельно.'},
 {id:'ai',pattern:/не доверя.{0,12}(ai|ии)|боюсь.{0,12}(ai|ии)/i,text:'Сейчас я работаю по сценариям. Выводы аудита проверяет специалист; контакты вводятся только в отдельной форме.'},
 {id:'implementation',pattern:/сложн.{0,15}внедрен/i,text:'Объём внедрения зависит от систем, данных и доступа к ним. Универсальную совместимость до технической проверки не обещаем.'},
 {id:'data',pattern:/нет данных/i,text:'Можно начать с обсуждения доступных источников. Если данных недостаточно, специалист обозначит ограничения; выдуманных выводов не будет.'},
 {id:'case',pattern:/нужен кейс|покажи.{0,10}кейс/i,text:'Могу показать принцип на синтетических данных. Подтверждённый клиентский кейс для публикации нужно отдельно согласовать.'},
 {id:'authority',pattern:/не принимаю решени/i,text:'Можно подготовить бриф для команды. Полномочия и бюджет не обязательны для знакомства с продуктом.'},
] as const;
export function advanceSales(previous:SalesState,input:SalesInput){
 let s:SalesState=structuredClone(previous);s.revision++;let text='',demo:string|null=null,ui:'lead'|null=null;
 let action=input.action;const raw=cleanSalesText(input.message||'').trim();const lower=raw.toLowerCase();
 if(!action){
  if(/^(стоп|завершить|до свидания|не интересно|неинтересно|не хочу продолжать)[.! ]*$/.test(lower))action='finish';
  else if(/^(начать заново|заново)[.! ]*$/.test(lower))action='restart';
  else if(/^(пропустить|не знаю|не хочу отвечать|позже)[.! ]*$/.test(lower))action='skip';
  else if(/^(всё верно|все верно|подтверждаю|да)[.! ]*$/.test(lower)&&s.stage==='summary')action='confirm';
  else if(/^(исправить|изменить резюме)[.! ]*$/.test(lower))action='edit';
  else if(/^(продолжить|давайте|начать)[.! ]*$/.test(lower))action='continue';
  else if(/^(хочу |можно |как )?(связаться|контакт|позвать|поговорить с|оставить заявку)/.test(lower))action='contact';
  else if(/^(покаж|показы|демо|хочу демо|возможности)/.test(lower))action='demo';
 }
 function next(){
  const key=fields.find(k=>!s.profile[k]&&!s.skipped.includes(k));s.awaiting=key||null;
  if(key){s.stage=['problem','result'].includes(key)?'needs':'profile';text=questions[key];}
  else{s.stage='summary';text='Проверьте, правильно ли я понял задачу.\n\n'+salesSummary(s)+'\n\nВсё верно или нужно исправить?';}
 }
 function chooseOffer(id:OfferId){s.selectedOffer=id;s.stage='handoff';s.awaiting=null;s.reason='offer_selected';text=offers.find(o=>o.id===id)!.description+'\nЗаявка ещё не отправлена. Проверьте бриф и доступность формы.';ui='lead';}
 if(action==='restart'){s={...initialSalesState(),revision:s.revision,reason:'restart'};next();text='Начнём заново. Я Синк, AI-консультант SGS IT в сценарном режиме. '+text;}
 else if(action==='contact'){s.stage='handoff';s.reason='direct_contact';s.awaiting=null;text='Перейдём к брифу и отдельной форме контактов. Заполнять все вопросы необязательно. Заявка ещё не отправлена.';ui='lead';}
 else if(action==='demo'){s.reason='requested_demo';demo=/crm|продаж/.test(lower)?'sales':/маркет/.test(lower)?'marketing':/операц/.test(lower)?'operations':'overview';text='Покажу принцип работы parkops на синтетических данных. Совместимость с вашими системами проверяется отдельно.';}
 else if(action==='finish'){s.stage='closed';s.awaiting=null;s.reason='visitor_declined';text='Остановимся здесь. Заявка из этого диалога не отправлена. Вернуться можно в любой момент.';}
 else if(s.stage==='closed'){text='Диалог завершён. Чтобы вернуться к вопросам, нажмите «Начать заново».';}
 else if(action?.startsWith('offer:')){if(s.stage!=='offer'){text='Сначала проверьте резюме или сразу свяжитесь со специалистом.';}else chooseOffer(action.slice(6) as OfferId);}
 else if(action==='edit'){s.confirmed=false;s.reason='choose_field';s.awaiting=null;text='Что нужно исправить? Выберите поле; остальные ответы сохранятся.';}
 else if(action?.startsWith('edit:')){const k=action.slice(5) as ProfileKey;s.confirmed=false;s.awaiting=k;s.stage=['problem','result'].includes(k)?'needs':'profile';s.reason='editing_field';text=questions[k];}
 else if(action==='confirm'){
  if(s.stage!=='summary'||s.reason==='choose_field'){text='Сначала соберём и проверим резюме.';next();}
  else{s.confirmed=true;s.stage='offer';s.reason='summary_confirmed';text='Резюме подтверждено. '+(s.profile.problem?'Для начала предлагаю бесплатный аудит: его объём согласуем со специалистом.':'Можно начать с демонстрации, чтобы выбрать полезное направление.')+' Также доступны встреча и обсуждение платного пресейла. Какой шаг подходит?';}
 }
 else if(action==='skip'){if(s.awaiting){const k=s.awaiting;delete s.profile[k];s.skipped=Array.from(new Set([...s.skipped,k]));s.confirmed=false;}s.reason='question_skipped';next();}
 else if(action==='continue'){s.reason='continue';next();}
 else if(/^(а )?(какая цена|цена|стоимость|сколько стоит|тариф|хочу купить|купить|как оплатить|оплатить)[?!. ]*$/.test(lower)){s.reason='price_requested';text='Предлагаем подписку, внедрение и сопровождение; сначала определим объём. У платного пресейла пока не утверждены состав, цена и сроки, поэтому оплата недоступна. Бесплатный аудит сохраняется. Можно обсудить условия со специалистом.';}
 else {
  const objection=objections.find(o=>o.pattern.test(raw));
  if(objection){
   s.objections=Array.from(new Set([...s.objections,objection.id]));s.reason='objection_'+objection.id;
   const k=s.awaiting;
   const isAnswer=(objection.id==='data'&&(k==='systems'||k==='problem'))||(objection.id==='crm'&&k==='systems')||(objection.id==='authority'&&k==='role');
   if(k&&isAnswer&&raw.length<=300&&!/\[(email|номер|контакт|ссылка) скрыт/.test(raw)){
    s.profile[k]={value:raw,source:'user',revision:s.revision};s.skipped=s.skipped.filter(x=>x!==k);s.confirmed=false;next();text=objection.text+'\n'+text;
   }else text=objection.text+(s.awaiting?'\nМожно ответить на вопрос, пропустить его или связаться со специалистом.':'');
  }
  else if(s.awaiting){
   if(raw.length>300){text='Сформулируйте ответ до 300 символов, чтобы сохранить его целиком. '+questions[s.awaiting];s.reason='field_too_long';}
   else if(/\[(email|номер|контакт|ссылка) скрыт/.test(raw)){text='Контакты и ссылки оставьте для отдельной формы. Здесь опишите задачу без них.';s.reason='contact_in_chat';}
   else{const k=s.awaiting;s.profile[k]={value:raw,source:'user',revision:s.revision};s.skipped=s.skipped.filter(x=>x!==k);s.confirmed=false;s.reason='field_updated';next();}
  }
  else if(s.stage==='summary'){text='Проверьте резюме и нажмите «Всё верно» или выберите «Исправить резюме».';}
  else if(s.stage==='offer'){text='Выберите следующий шаг или исправьте резюме. Условия платного пресейла требуют согласования; оплату пока не принимаем.';}
  else{s.reason='introduction';next();text='Я Синк, AI-консультант SGS IT в сценарном режиме. parkops помогает связать данные продаж, маркетинга и операций. '+text;}
 }
 return {text,demo,ui,sales:s,choices:salesChoices(s),offerVersion};
}
