import type {BrowserContext} from '@playwright/test';

/** Install capture-only caret styling before the first UI paint, not during a capture. */
export async function prepareCaptureContext(context:BrowserContext){
  await context.addInitScript(()=>{
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
