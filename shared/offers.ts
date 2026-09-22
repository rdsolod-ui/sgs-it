/** Commercial facts are versioned; null means not approved, never zero cost. */
export const offerVersion = '2026-09-22.1';
export const offers = [
  {id:'audit',title:'Бесплатный аудит',kind:'free',service:'audit',description:'Обсудим задачу и исходные данные. Объём бесплатного аудита согласуем со специалистом.',price:null,currency:null,delivery:null,paymentEnabled:false},
  {id:'demo',title:'Демонстрация parkops',kind:'free',service:'demo',description:'Посмотрите принцип работы на синтетических данных; совместимость с вашими системами проверяется отдельно.',price:null,currency:null,delivery:null,paymentEnabled:false},
  {id:'meeting',title:'Диагностическая встреча',kind:'free',service:'meeting',description:'Обсудим потребность, доступные данные и подходящий следующий шаг.',price:null,currency:null,delivery:null,paymentEnabled:false},
  {id:'presale',title:'Обсудить платный пресейл',kind:'discussion',service:'meeting',description:'Состав, цена, сроки и условия ещё не утверждены. Можно обсудить формат; оплата пока недоступна.',price:null,currency:null,delivery:null,paymentEnabled:false},
] as const;
export type OfferId = typeof offers[number]['id'];
export const capabilities = [
  {id:'demo',status:'ready',evidence:'src/components/Demo.tsx',scope:'Синтетические демонстрации продаж, маркетинга и операций; не результат анализа бизнеса посетителя.'},
  {id:'brief',status:'ready',evidence:'src/components/BriefBuilder.tsx',scope:'Конструктор брифа и локальная выгрузка TXT.'},
  {id:'audit',status:'ready',evidence:'src/components/AuditEditor.tsx',scope:'Редактор документа аудита для специалиста; выводы не создаются автоматически.'},
  {id:'integration',status:'custom',evidence:'README.md',scope:'Совместимость и объём интеграций требуют технической проверки.'},
  {id:'learning',status:'planned',evidence:'DEVELOPMENT_PLAN.md#p8',scope:'Курируемое улучшение и база знаний запланированы.'},
] as const;
