import type {BrowserContext} from '@playwright/test';

/** Observe real transition lifetimes and install caret styling before the first UI paint. */
export async function prepareCaptureContext(context:BrowserContext){
  await context.addInitScript(()=>{
    // Svelte's zero-duration delay animation can finish before its onfinish callback
    // starts the actual flight. Observe the full transition, including that gap.
    const transitions=new Map<Element,string>();
    (window as Window&{__pantheonTransitions?:Map<Element,string>}).__pantheonTransitions=transitions;
    for(const direction of ['intro','outro']){
      document.addEventListener(`${direction}start`,event=>{if(event.target instanceof Element)transitions.set(event.target,direction);},true);
      document.addEventListener(`${direction}end`,event=>{if(event.target instanceof Element&&transitions.get(event.target)===direction)transitions.delete(event.target);},true);
    }
    const install=()=>{
      const style=document.createElement('style');
      style.id='e2e-caret';
      style.textContent='* { caret-color: transparent !important; }';
      document.head.append(style);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
    else install();
  });
}
