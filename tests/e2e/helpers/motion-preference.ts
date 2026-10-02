import {expect,type Page} from '@playwright/test';

type MotionWindow=Window&{__pantheonMotionPreference?:{applied:boolean}};

/** Wait for the real media change event, including the app's subscribed handlers. */
export async function setMotionPreference(page:Page,preference:'reduce'|'no-preference'){
  await page.evaluate(reduced=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const observation={applied:media.matches===reduced};
    (window as MotionWindow).__pantheonMotionPreference=observation;
    if(!observation.applied)media.addEventListener('change',event=>{
      observation.applied=event.matches===reduced;
    },{once:true});
  },preference==='reduce');
  await page.emulateMedia({reducedMotion:preference});
  await expect.poll(()=>page.evaluate(()=>(window as MotionWindow).__pantheonMotionPreference?.applied)).toBe(true);
}
