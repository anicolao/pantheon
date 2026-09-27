import { test as base } from '@playwright/test';
import { finishStory } from './test-step-helper';
export { expect } from '@playwright/test';
export const test=base.extend<{storyDocumentation:void}>({
  storyDocumentation:[async({},use,info)=>{await use();finishStory(info);},{auto:true}]
});
