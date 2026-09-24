import {advanceSales,initialSalesState,salesChoices,salesInputSchema} from '../shared/sales';
let sales=initialSalesState();
let turn=0;
const notice='Демонстрационный стенд SGS IT / parkops. Приём заявок и передача текста внешнему AI отключены. Чат работает по локальным сценариям; сообщения остаются в памяти текущей вкладки и исчезают при перезагрузке. На стороне веб-сервера могут сохраняться стандартные технические журналы обращений. Выбор темы, отметка вступления и настройка cookie сохраняются в браузере.';
export async function previewRequest(path:string,body?:unknown){
 if(path==='/config')return {mode:'preview',legalReady:false,canCollect:false,limits:{input:700,context:6000,output:1200,visible:450},policyVersion:'preview-2026-09-16',documents:{privacy:notice,cookies:notice+' Аналитические и рекламные cookie не используются.',data:'Приём заявок на демонстрационном стенде отключён.',callback:'Обратная связь на демонстрационном стенде отключена.',marketing:'Рекламная подписка на демонстрационном стенде отключена.'},telegramConfigured:false};
 if(path==='/session')return {messages:[],sales,choices:salesChoices(sales)};
 if(path==='/chat'){
  const input=salesInputSchema.parse(body);
  if(input.revision!==undefined&&input.revision!==sales.revision)throw Error('Диалог изменён. Обновите страницу.');
  if(turn>=60)throw Error('Демонстрационный диалог завершён. Обновите страницу, чтобы начать заново.');
  turn++;
  const answer=advanceSales(sales,input);sales=answer.sales;
  return {...answer,mode:'preview'};
 }
 throw Error('Эта функция доступна в рабочем контуре, приём данных на стенде отключён.');
}
