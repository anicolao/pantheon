import type {Browser,BrowserContextOptions} from '@playwright/test';
import {OPERATION_BUDGET} from './test-step-helper';
/** Independent identity with the same rendering and hard action deadlines as the primary client. */
export async function newPlayerContext(browser:Browser,options:BrowserContextOptions={}){
  const context=await browser.newContext({locale:'en-CA',timezoneId:'America/Toronto',reducedMotion:'reduce',...options});
  context.setDefaultTimeout(OPERATION_BUDGET);
  context.setDefaultNavigationTimeout(OPERATION_BUDGET);
  return context;
}
