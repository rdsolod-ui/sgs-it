import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {BrandMark} from './BrandMark';
import './intro.css';
const Core=lazy(()=>import('./Core').then(m=>({default:m.Core})));
const chapters=[
 {at:0,label:'Контакт',title:'Любая система начинается с вопроса.',copy:'А что, если ваш бизнес можно увидеть целиком?'},
 {at:6200,label:'Код',title:'Данные есть. Связей не хватает.',copy:'Продажи, CRM, маркетинг, операции. Соберём их вместе.'},
 {at:11800,label:'8 бит',title:'Из сигналов — в структуру.',copy:'Четыре модуля. У каждого — своя часть истории.'},
 {at:15500,label:'16 бит',title:'Связи добавляют смысл.',copy:'Общее ядро соединяет процессы в одну картину.'},
 {at:19100,label:'Объём',title:'Теперь можно увидеть целое.',copy:'Я Синк. Начнём с задачи вашего бизнеса.'},
];
const duration=24200;
const code=[
 {at:6600,text:'from business import clarity'},
 {at:7800,text:'modules = [sales, crm, marketing, operations]'},
 {at:9700,text:'parkops = clarity.connect(modules)'},
];
const type=(text:string,time:number,start:number,pace=45)=>text.slice(0,Math.max(0,Math.floor((time-start)/pace)));
export function Intro({dark,reduced,onFinish}:{dark:boolean,reduced:boolean,onFinish:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),elapsed=useRef(0);
 const [time,setTime]=useState(0),[paused,setPaused]=useState(false);
 const phase=reduced?4:chapters.reduce((index,c,i)=>time>=c.at?i:index,0);
 const current=chapters[phase];
 const finish=useCallback(()=>{dialog.current?.close();onFinish();},[onFinish]);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const node=dialog.current;
  node?.showModal();
  return()=>{node?.close();requestAnimationFrame(()=>{
   // A user may already have focused a field; never steal that focus. Also
   // ignore the rehearsal cleanup when StrictMode has reopened the dialog.
   const active=document.activeElement;
   if(node?.open||(active&&active!==document.body&&active!==document.documentElement&&active!==node&&!node?.contains(active)))return;
   if(previous&&previous!==document.body&&previous.isConnected)previous.focus({preventScroll:true});
   else document.querySelector<HTMLElement>('.experience')?.focus({preventScroll:true});
  });};
 },[]);
 useEffect(()=>{
  if(reduced||paused)return;
  let frame=0,last=performance.now(),paint=last;
  const tick=(now:number)=>{
   if(!document.hidden)elapsed.current+=Math.min(now-last,100);
   last=now;
   if(elapsed.current>=duration){finish();return;}
   if(now-paint>=40){setTime(elapsed.current);paint=now;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[paused,reduced,finish]);
 return <dialog ref={dialog} className="intro-sequence" aria-label="История parkops: от кода к системе" data-phase={phase} data-paused={paused} data-reduced={reduced} data-time={Math.round(time)} onCancel={e=>{e.preventDefault();finish();}}>
  <div className="intro-shell">
   <header className="intro-header"><span className="intro-brand"><BrandMark/>SGS IT<span>/ parkops</span></span><div className="intro-controls">{!reduced&&<button onClick={()=>setPaused(v=>!v)} aria-label={paused?'Продолжить вступление':'Приостановить вступление'}>{paused?<Play size={16}/>:<Pause size={16}/>}<span>{paused?'Продолжить':'Пауза'}</span></button>}<button onClick={finish} aria-label="Пропустить вступление">Пропустить<X size={16}/></button></div></header>
   <div className="intro-body">
    <div className="intro-heading" key={phase} aria-live="polite" aria-atomic="true"><p className="intro-kicker">{String(phase+1).padStart(2,'0')} / 05 · {current.label}</p><h2>{current.title}</h2><p>{current.copy}</p></div>
    <div className="intro-visual" aria-hidden="true">
     {phase<=2&&<div className="intro-terminal"><div className="terminal-chrome"><span/><span/><span/><b>parkops / origin.py</b><em>Визуальная история</em></div><div className="terminal-lines">{phase===0?<><p className="terminal-hello">{type('>hello, Neo!',time,350,85)}<span className="typing-caret"/></p><p className="terminal-welcome">{type('>welcome to new SAAS project ParkOps',time,1900,65)}</p><p className="terminal-comment" style={{opacity:time>4700?1:0}}># Большая картина начинается с одной связи.</p></>:<>{code.map(line=><p key={line.at}>{type(line.text,time,line.at,32)}{time>=line.at&&time<line.at+line.text.length*32&&<span className="typing-caret"/>}</p>)}<p className="terminal-comment" style={{opacity:time>11000?1:0}}># Из отдельных источников — в общую систему.</p></>}</div></div>}
     {phase>=2&&!reduced&&<div className="intro-modules"><div className="intro-pixel-grid"/>{['ПРОДАЖИ','CRM','МАРКЕТИНГ','ОПЕРАЦИИ'].map((label,i)=><div className={'intro-module module-'+i} key={label}><span>{label}</span></div>)}<div className="intro-blue-core"/><span className="intro-resolution">{phase===2?'4 МОДУЛЯ · 8 BIT':'ОДНО ЯДРО · 16 BIT'}</span></div>}
     {phase===4&&<div className="intro-sculpture"><Suspense fallback={<BrandMark className="intro-static-mark"/>}>{reduced?<BrandMark className="intro-static-mark"/>:<Core state="presenting" dark={dark} reduced={paused}/>}</Suspense></div>}
    </div>
    {phase===4&&<button className="intro-enter" onClick={finish}>Начать разговор<ArrowUpRight size={18}/></button>}
   </div>
   <footer className="intro-footer"><span>ОТ КОДА К ЯСНОЙ КАРТИНЕ</span><ol aria-label="Этапы истории">{chapters.map((c,i)=><li key={c.at} aria-current={i===phase?'step':undefined} className={i<=phase?'is-reached':''}><span>{c.label}</span></li>)}</ol><span>{reduced?'БЕЗ АНИМАЦИИ':paused?'ИСТОРИЯ НА ПАУЗЕ':'ЗНАКОМСТВО · 24 СЕК'}</span></footer>
  </div>
 </dialog>;
}
