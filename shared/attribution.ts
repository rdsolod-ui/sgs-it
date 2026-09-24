export const utmKeys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'] as const;
export type Touch={landing:string|null,referrerHost:string|null,utm:Partial<Record<typeof utmKeys[number],string>>};
export type Attribution={first:Touch&{at:string},last:Touch&{at:string},channel:'website'|'telegram_verified'};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
function label(v:unknown){if(typeof v!=='string'||v.length>64||!/^[-_a-zа-яё0-9.]{1,64}$/i.test(v))return null;if(/\d{7}|[a-f0-9]{24}|token|secret|password|email|phone|пароль|телефон/i.test(v))return null;return v;}
/** Only route categories, referrer hostname and short campaign slugs; never raw URLs. */
export function sanitizeTouch(value:unknown):Touch{
 const v=object(value),utm:Touch['utm']={};for(const key of utmKeys){const x=label(object(v.utm)[key]);if(x)utm[key]=x;}
 let referrerHost:string|null=null;
 if(typeof v.referrerHost==='string'&&v.referrerHost.length<=160&&/^[a-z0-9.-]+$/i.test(v.referrerHost)&&!/(token|secret|password)|\d{7}|[a-f0-9]{24}/i.test(v.referrerHost)){
  try{const u=new URL('https://'+v.referrerHost);if(u.hostname===v.referrerHost.toLowerCase()&&!/^[\d.]+$/.test(u.hostname))referrerHost=u.hostname;}catch{}
 }
 return {landing:typeof v.landing==='string'&&['/','/sgs-it/'].includes(v.landing)?v.landing:null,referrerHost,utm};
}
export function captureTouch(href:string,referrer:string):Touch{
 try{const u=new URL(href);let host:string|null=null;try{const r=new URL(referrer);if(['http:','https:'].includes(r.protocol)&&!r.username&&!r.password)host=r.hostname;}catch{}
  return sanitizeTouch({landing:u.pathname,referrerHost:host,utm:Object.fromEntries(utmKeys.map(k=>[k,u.searchParams.get(k)]))});
 }catch{return sanitizeTouch(null);}
}
export function formatAttribution(a:Attribution|null|undefined){if(!a)return 'Источник не определён';const show=(t:Attribution['first'])=>[t.landing,t.referrerHost,...utmKeys.flatMap(k=>t.utm[k]?[`${k}=${t.utm[k]}`]:[])].filter(Boolean).join(' · ')||'Источник не определён';return `${a.channel==='telegram_verified'?'Telegram Mini App (подпись проверена)':'Сайт'}\nПервое посещение: ${show(a.first)}\nПоследнее посещение: ${show(a.last)}`;}
