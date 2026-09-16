export const briefQuestions = [
  {key:'business',title:'Чем занимается бизнес?',hint:'Например: сеть кафе, услуги для компаний, интернет-магазин',options:[]},
  {key:'role',title:'Как вы участвуете в этой задаче?',hint:'Это поможет выбрать уровень детализации',options:['Собственник / руководитель','Руководитель направления','Специалист','Изучаю для команды']},
  {key:'systems',title:'Где сейчас находятся данные?',hint:'Назовите CRM, учётную систему, таблицы или рекламные кабинеты',options:[]},
  {key:'problem',title:'Что сегодня мешает принимать решения?',hint:'Один конкретный пример полезнее списка всех проблем',options:[]},
  {key:'result',title:'Какой результат будет для вас полезен?',hint:'Например: видеть путь от рекламы до оплаты или находить просроченные задачи',options:[]},
  {key:'timing',title:'Когда хотите приступить?',hint:'Ориентир, который можно уточнить на встрече',options:['Изучаю возможности','В ближайший месяц','В течение квартала','Есть конкретный срок']},
] as const;
export type BriefAnswers = Record<(typeof briefQuestions)[number]['key'],string>;
export const emptyBrief = ():BriefAnswers => ({business:'',role:'',systems:'',problem:'',result:'',timing:''});
export function formatBrief(answers:BriefAnswers){return briefQuestions.map(q=>`${q.title}\n${answers[q.key].trim().slice(0,300)||'Требует уточнения'}`).join('\n\n');}
