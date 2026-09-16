/** Keep the app and top-layer dialogs inside the visible viewport above the keyboard.
 * Insets themselves come from CSS env(), never from an iPhone model/UA lookup.
 * Do not reflow on pinch zoom: leave browser magnification and panning intact.
 */
export function installViewport() {
 const root=document.documentElement, viewport=window.visualViewport;
 let frame=0;
 const update=()=>{
  frame=0;
  if(viewport&&Math.abs(viewport.scale-1)>.02)return;
  const height=viewport?.height||window.innerHeight;
  const top=viewport?.offsetTop||0;
  const focused=document.activeElement;
  const editing=focused instanceof HTMLElement&&focused.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable=true]');
  const keyboard=!!editing&&window.innerHeight-height>120;
  root.style.setProperty('--app-height',`${height}px`);
  root.style.setProperty('--viewport-top',`${top}px`);
  root.dataset.keyboard=String(keyboard);
  root.dataset.compactViewport=String(height<520);
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 viewport?.addEventListener('resize',schedule);
 viewport?.addEventListener('scroll',schedule);
 window.addEventListener('resize',schedule);
 window.addEventListener('orientationchange',schedule);
 document.addEventListener('focusin',schedule);
 document.addEventListener('focusout',schedule);
 update();
 return()=>{
  cancelAnimationFrame(frame);
  viewport?.removeEventListener('resize',schedule);
  viewport?.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);
  window.removeEventListener('orientationchange',schedule);
  document.removeEventListener('focusin',schedule);
  document.removeEventListener('focusout',schedule);
 };
}
