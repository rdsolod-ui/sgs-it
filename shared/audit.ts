import {z} from 'zod';
export const auditSections = [
  {id:'data',title:'Качество и полнота данных'},
  {id:'sales',title:'Аналитика продаж и CRM'},
  {id:'marketing',title:'Маркетинговая аналитика и атрибуция'},
  {id:'operations',title:'Операционная аналитика'},
  {id:'management',title:'Управленческая отчётность и доступы'},
  {id:'roadmap',title:'Рекомендации и план внедрения'},
] as const;
export const auditFields = {sources:'Источники и период',findings:'Наблюдения и доказательства',limitations:'Ограничения',recommendation:'Рекомендации',owner:'Ответственный / роль',metric:'Критерий результата'};
export const priorities = {high:'Высокий',medium:'Средний',low:'Низкий'};
const text=z.string().trim().max(1000);
const sectionSchema=z.object({id:z.enum(['data','sales','marketing','operations','management','roadmap']),included:z.boolean(),exclusion:text,sources:text,findings:text,limitations:text,recommendation:text,owner:text,metric:text,priority:z.enum(['high','medium','low'])});
export const auditSchema=z.object({status:z.enum(['draft','ready']),scope:z.string().trim().max(2000),summary:z.string().trim().max(2000),sections:z.array(sectionSchema).length(6)}).superRefine((value,ctx)=>{
  if(new Set(value.sections.map(s=>s.id)).size!==6)ctx.addIssue({code:'custom',message:'Разделы должны быть уникальны'});
  if(value.status==='ready'){
    if(!value.scope||!value.summary||!value.sections.some(s=>s.included))ctx.addIssue({code:'custom',message:'Укажите границы, резюме и хотя бы один исследованный раздел'});
    for(const s of value.sections){if(s.included?Object.keys(auditFields).some(k=>!s[k as keyof typeof auditFields]):!s.exclusion)ctx.addIssue({code:'custom',message:'Заполните доказательства и рекомендации или причину исключения раздела'});}
  }
}).transform(value=>({...value,sections:auditSections.map(meta=>value.sections.find(s=>s.id===meta.id)!)}));
export type AuditDocument=z.infer<typeof auditSchema>;
export type AuditRecord={version:number,document:AuditDocument,updatedAt:string|null,updatedBy:string|null};
export function emptyAudit():AuditDocument{return{status:'draft',scope:'',summary:'',sections:auditSections.map(s=>({id:s.id,included:true,exclusion:'',sources:'',findings:'',limitations:'',recommendation:'',owner:'',metric:'',priority:'medium'}))};}
