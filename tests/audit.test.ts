import {describe,it,expect} from 'vitest';
import {auditSchema,emptyAudit,auditFields} from '../shared/audit';
import {emptyBrief,formatBrief} from '../shared/brief';
import {renderAudit} from '../server/audit-report';
describe('Brief and audit workflow',()=>{
 it('keeps unknown answers explicit and the brief inside the lead size limit',()=>{expect(formatBrief(emptyBrief())).toContain('Требует уточнения');const full=Object.fromEntries(Object.keys(emptyBrief()).map(k=>[k,'я'.repeat(300)])) as ReturnType<typeof emptyBrief>;expect(formatBrief(full).length).toBeLessThanOrEqual(2500);});
 it('allows drafts but never marks empty evidence ready',()=>{expect(auditSchema.safeParse(emptyAudit()).success).toBe(true);expect(auditSchema.safeParse({...emptyAudit(),status:'ready'}).success).toBe(false);});
 it('requires unique known sections',()=>{const d=emptyAudit();d.sections[1]=d.sections[0];expect(auditSchema.safeParse(d).success).toBe(false);});
 it('accepts a documented scope with explicit exclusions',()=>{const d=emptyAudit();d.status='ready';d.scope='Продажи за июль';d.summary='Результаты проверены';d.sections.forEach((s,i)=>{if(i===0){for(const k of Object.keys(auditFields))s[k as keyof typeof auditFields]='Проверено по синтетическому источнику';}else{s.included=false;s.exclusion='Не входит в согласованный объём';}});expect(auditSchema.safeParse(d).success).toBe(true);d.sections[2].exclusion='';expect(auditSchema.safeParse(d).success).toBe(false);});
 it('escapes report data and labels drafts without inventing findings',()=>{const d=emptyAudit();d.summary='<script>alert(1)</script>';d.sections[0].findings='<img src=x onerror=alert(1)>';const html=renderAudit({company:'<b>Компания</b>',name:'Тест',brief:'<svg/onload=alert(1)>',next_action:''},d,1,'2026-09-16');expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).toContain('&lt;script&gt;');expect(html).toContain('Черновик.');expect(html).toContain('Требует заполнения специалистом.');});
 it('normalizes section order and rejects oversized content',()=>{const d=emptyAudit();d.sections.reverse();expect(auditSchema.parse(d).sections[0].id).toBe('data');d.scope='a'.repeat(2001);expect(auditSchema.safeParse(d).success).toBe(false);});
});
