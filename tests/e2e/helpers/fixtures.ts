import { test as base } from '@playwright/test';
import { prepareCaptureContext } from './capture-context';
import { finishStory } from './test-step-helper';
export { expect } from '@playwright/test';
export const test=base.extend<{storyDocumentation:void}>({
  context:async({context},use)=>{await prepareCaptureContext(context);await use(context);},
  storyDocumentation:[async({},use,info)=>{await use();finishStory(info);},{auto:true}]
});
