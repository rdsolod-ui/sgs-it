import {describe,it,expect} from 'vitest';
import {createHmac} from 'node:crypto';
import {safeCell,redact,telegramVerify,demoAnswer,legalDocs,digest} from '../server/domain';
describe('Boundary protections',()=>{
 it('neutralizes formula injection including whitespace',()=>{for(const v of ['=1+1','+cmd','-1','@SUM',' \t=1'])expect(safeCell(v)).toBe("'"+v);expect(safeCell('Компания')).toBe('Компания');});
 it('redacts obvious contact details from chat',()=>{expect(redact('пишите test@example.com или +7 (999) 123-45-67')).not.toMatch(/example|999/);});
 it('rejects invalid and stale Telegram data',()=>{expect(telegramVerify('auth_date=1&hash='+'0'.repeat(64),'secret',500)).toBe(false);expect(telegramVerify('hash=bad','secret')).toBe(false);});
 it('verifies signed Telegram data and rejects tampering',()=>{const p=new URLSearchParams({auth_date:'1000',user:'{"id":123}'});const check=[...p].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');const secret=createHmac('sha256','WebAppData').update('test-token').digest();p.set('hash',createHmac('sha256',secret).update(check).digest('hex'));expect(telegramVerify(p.toString(),'test-token',1050)).toBe(true);expect(telegramVerify(p.toString()+'&user=other','test-token',1050)).toBe(false);expect(telegramVerify(p.toString(),'other-token',1050)).toBe(false);});
 it('keeps proof documents distinct and deterministic',()=>{const d=legalDocs();expect(d.data).not.toBe(d.marketing);expect(digest(d.data)).toHaveLength(64);});
 it('does not invent price or audit findings',()=>{expect(demoAnswer('цена',1).text).toContain('объём');expect(demoAnswer('аудит',1).demo).toBe('audit');});
});
